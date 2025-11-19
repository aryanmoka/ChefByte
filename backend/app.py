from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv
import uuid
from datetime import datetime
# Assuming 'database' module exists and contains a 'Database' class
from database import Database 
import smtplib
import ssl
import logging
from google.api_core.exceptions import NotFound

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()

app = Flask(__name__)

# Configure CORS to allow specific origins
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173", # For local development
    "https://cookingchatbot.netlify.app" 
]}})

# --- Configuration ---
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
SENDER_EMAIL = os.getenv('GMAIL_APP_EMAIL')
SENDER_PASSWORD = os.getenv('GMAIL_APP_PASSWORD')
RECEIVER_EMAIL = os.getenv('GMAIL_APP_EMAIL')  # Make receiver email configurable too
MODEL_NAME = os.getenv('MODEL_NAME', 'gemini-2.5-flash')  # Default to a known supported model id

# Validate essential environment variables
if not GEMINI_API_KEY:
    logging.error("GEMINI_API_KEY is not set in environment variables.")
if not SENDER_EMAIL or not SENDER_PASSWORD:
    logging.warning("GMAIL_APP_EMAIL or GMAIL_APP_PASSWORD not set. Email functionality might be disabled.")

# Configure the Gemini API with your key
try:
    genai.configure(api_key=GEMINI_API_KEY)
    logging.info("Configured generative API.")
except Exception as e:
    logging.critical(f"Error configuring Gemini API: {e}. Exiting.", exc_info=True)
    exit(1)

db = Database()  # Initialize your database connection

# System prompt
SYSTEM_PROMPT = """You are CookBot, a friendly and knowledgeable cooking assistant. Your role is to help users with all things cooking-related.

Guidelines:
1. Always respond in a warm, encouraging, and helpful tone.
2. When a user asks for a recipe, you MUST format your entire response as a single, valid JSON object with this exact structure:
    {
      "type": "recipe",
      "title": "Recipe Name",
      "description": "Brief description",
      "ingredients": ["ingredient 1", "ingredient 2", ...],
      "instructions": ["step 1", "step 2", ...],
      "prep_time": "X minutes",
      "cook_time": "X minutes",
      "servings": "X servings"
    }
3. For general cooking questions that are NOT recipe requests, respond with a plain text message wrapped in a JSON object with this exact structure:
    {
      "type": "text",
      "content": "Your plain text response here."
    }
4. If a user's request is unclear, ask clarifying questions using the "text" JSON format.
5. Suggest alternatives for ingredients when appropriate using the "text" JSON format.
6. Include helpful cooking tips and techniques using the "text" JSON format.
7. Always encourage users to cook and try new things.

Remember: You're here to make cooking accessible and fun for everyone!"""

generation_config = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
    "response_mime_type": "application/json"
}

def try_list_models_safe():
    """Attempt to list models and return a short summary for logs (safe wrapper)."""
    try:
        models = genai.list_models()
        # models format depends on SDK; try to extract names
        model_names = []
        for m in models:
            try:
                # m might be a dict-like or object
                name = getattr(m, "name", None) or m.get("name") if isinstance(m, dict) else str(m)
            except Exception:
                name = str(m)
            model_names.append(name)
        return model_names
    except Exception as e:
        logging.error("Failed to list models: %s", e, exc_info=True)
        return None

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = (data.get('message', '') or '').strip()
        session_id = data.get('session_id', str(uuid.uuid4()))
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        conversation_data = db.get_conversation(session_id)
        history = []
        if conversation_data and 'history' in conversation_data:
            for message in conversation_data['history']:
                if message['role'] == 'system':
                    continue
                history.append({
                    "role": "model" if message['role'] == 'assistant' else message['role'],
                    "parts": [{"text": message['content']}]
                })

        full_history_for_gemini = [{"role": "user", "parts": [{"text": SYSTEM_PROMPT}]}] + history

        # Lazily create/instantiate the model and start the chat session.
        try:
            logging.info("Attempting to create GenerativeModel with id=%s", MODEL_NAME)
            model = genai.GenerativeModel(
                model_name=MODEL_NAME,
                generation_config=generation_config
            )
        except NotFound as nf:
            # Model not found for this API version / account
            logging.error("Model %s not found: %s", MODEL_NAME, nf, exc_info=True)
            available = try_list_models_safe()
            if available:
                logging.info("Available models: %s", available)
            return jsonify({
                'error': f"Configured model '{MODEL_NAME}' not available for this API/account.",
                'available_models': available or "unavailable - check logs"
            }), 500
        except Exception as e:
            logging.error("Error creating GenerativeModel: %s", e, exc_info=True)
            available = try_list_models_safe()
            return jsonify({
                'error': "Failed to initialize model. See server logs for details.",
                'available_models': available or "unavailable - check logs"
            }), 500

        try:
            chat_session = model.start_chat(history=full_history_for_gemini)
        except Exception as e:
            logging.error("Failed to start chat session: %s", e, exc_info=True)
            return jsonify({'error': 'Failed to start chat session. Check model compatibility and SDK version.'}), 500

        try:
            response = chat_session.send_message(user_message)
        except NotFound as nf:
            logging.error("Model generate call NotFound: %s", nf, exc_info=True)
            available = try_list_models_safe()
            return jsonify({
                'error': f"Model '{MODEL_NAME}' cannot process generateContent/chat with current API.",
                'available_models': available or "unavailable - check logs"
            }), 500
        except Exception as e:
            logging.error("Error from chat_session.send_message: %s", e, exc_info=True)
            return jsonify({'error': 'Error generating response from model.'}), 500

        # The SDK's response object shape may vary; using .text as before
        ai_response_text = getattr(response, "text", None)
        if ai_response_text is None:
            # Try alternative properties (defensive)
            try:
                ai_response_text = json.dumps(response) if not isinstance(response, str) else str(response)
            except Exception:
                ai_response_text = str(response)

        # Try to parse the response as JSON (your system expects JSON)
        try:
            parsed_response = json.loads(ai_response_text)
            messages_to_save = []
            messages_to_save.extend([
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": ai_response_text}
            ])
            if conversation_data and 'history' in conversation_data:
                messages_to_save = conversation_data['history'] + messages_to_save

            db.save_conversation(session_id, messages_to_save)

            if isinstance(parsed_response, dict) and parsed_response.get('type') == 'recipe':
                return jsonify({
                    'response': ai_response_text,
                    'session_id': session_id,
                    'is_recipe': True,
                    'recipe_data': parsed_response
                })
            elif isinstance(parsed_response, dict) and parsed_response.get('type') == 'text':
                return jsonify({
                    'response': parsed_response.get('content', 'An unexpected text response occurred.'),
                    'session_id': session_id,
                    'is_recipe': False
                })
            else:
                logging.warning("Unexpected JSON format from AI: %s", ai_response_text)
                return jsonify({
                    'response': "I received an unexpected response format, but I'm here to help! Could you please rephrase your request?",
                    'session_id': session_id,
                    'is_recipe': False
                })
        except json.JSONDecodeError:
            logging.error("AI response was not valid JSON despite mime type setting: %s", ai_response_text)
            return jsonify({
                'response': "I'm having a little trouble understanding. Could you please try asking again?",
                'session_id': session_id,
                'is_recipe': False
            })

    except Exception as e:
        logging.error(f"Chat endpoint error: {e}", exc_info=True)
        return jsonify({'error': 'An internal server error occurred processing your request. Please try again later.'}), 500

@app.route('/api/contact', methods=['POST'])
def handle_contact_form():
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        message = data.get('message', '').strip()

        if not name or not email or not message:
            return jsonify({'error': 'All fields are required.'}), 400
        
        if not SENDER_EMAIL or not SENDER_PASSWORD:
            logging.warning("Email sender credentials not configured. Contact form emails cannot be sent.")
            return jsonify({'error': 'Email service not configured on the server.'}), 500

        email_content = f"""\ 
From: {SENDER_EMAIL}
To: {RECEIVER_EMAIL}
Subject: Chef Byte Contact Form: {name}

Name: {name}
Email: {email}
Message:
{message}
"""
        context = ssl.create_default_context()

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, RECEIVER_EMAIL, email_content)
        
        logging.info(f"Contact form email sent from {email} by {name}")
        return jsonify({'success': True, 'message': 'Message sent successfully! We will get back to you soon.'}), 200

    except Exception as e:
        logging.error(f"Error sending contact email: {e}", exc_info=True)
        return jsonify({'error': 'Failed to send message. Please try again later.'}), 500

@app.route('/api/save_recipe', methods=['POST'])
def save_recipe():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        recipe_data = data.get('recipe_data')
        
        if not session_id or not recipe_data:
            return jsonify({'error': 'Missing required session_id or recipe_data'}), 400
        
        recipe_id = db.save_recipe(session_id, recipe_data)
        
        logging.info(f"Recipe saved for session {session_id} with ID: {recipe_id}")
        return jsonify({
            'success': True,
            'recipe_id': str(recipe_id),
            'message': 'Recipe saved successfully!'
        }), 200
        
    except Exception as e:
        logging.error(f"Save recipe error for session {session_id}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to save recipe'}), 500

@app.route('/api/my_recipes', methods=['GET'])
def get_my_recipes():
    try:
        session_id = request.args.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'Session ID required to retrieve recipes'}), 400
        
        recipes = db.get_user_recipes(session_id)
        
        logging.info(f"Retrieved {len(recipes)} recipes for session {session_id}")
        return jsonify({
            'recipes': recipes
        }), 200
        
    except Exception as e:
        logging.error(f"Get recipes error for session {session_id}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve recipes'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}), 200
    except Exception as e:
        logging.error(f"Health check failed: {e}", exc_info=True)
        return jsonify({'status': 'unhealthy', 'error': str(e), 'timestamp': datetime.now().isoformat()}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
