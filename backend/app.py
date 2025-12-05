# backend/app.py
import os
import json
import uuid
import ssl
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# third-party provider SDK (Google Generative AI)
import google.generativeai as genai
from google.api_core.exceptions import NotFound, PermissionDenied

# local database wrapper - ensure this module provides the used methods
from database import Database

import smtplib

# ---- Logging ----
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cookbot")

# ---- Load env ----
load_dotenv()

# ---- App & CORS ----
app = Flask(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",  # local dev
    "https://aichefbyte.netlify.app",
    "https://chefbyte.onrender.com",
]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})

# ---- Config ----
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SENDER_EMAIL = os.getenv("GMAIL_APP_EMAIL")
SENDER_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
RECEIVER_EMAIL = os.getenv("GMAIL_RECEIVER_EMAIL") or SENDER_EMAIL
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash")

# Generation config (tweak as needed)
GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
    "response_mime_type": "application/json",
}

# Basic request safeguards
MAX_REQUEST_BODY_SIZE = 64 * 1024  # 64 KB - protect from huge payloads


# ---- Initialize DB ----
try:
    db = Database()
    logger.info("Database initialized.")
except Exception as e:
    logger.exception("Failed to initialize Database: %s", e)
    # Keep running — endpoints will report DB errors if used.
    db = None


# ---- Configure generative API (deferred safe configure) ----
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not set. Model calls will fail until key is provided in env.")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Configured generative API.")
    except Exception:
        logger.exception("Failed to configure generative API. Calls will fail.")


# ---- Helpers ----
def try_list_models_safe() -> Optional[List[str]]:
    try:
        models = genai.list_models()
        names = []
        for m in models:
            try:
                name = getattr(m, "name", None) or (m.get("name") if isinstance(m, dict) else str(m))
            except Exception:
                name = str(m)
            names.append(name)
        return names
    except Exception as e:
        logger.error("Failed to list models: %s", e, exc_info=True)
        return None


def safe_extract_text_from_response(resp: Any) -> str:
    """
    The SDK can return different shapes. Try common fields in decreasing confidence:
    - resp.text
    - resp.candidates[0].output[0].content[0].text
    - resp.candidates[0].message.content[0].text
    - resp to string / json dump fallback
    """
    try:
        # Most direct
        if hasattr(resp, "text") and resp.text is not None:
            return resp.text
    except Exception:
        pass

    try:
        # try nested candidate shapes that some SDK versions use
        cands = getattr(resp, "candidates", None) or (resp.get("candidates") if isinstance(resp, dict) else None)
        if cands and len(cands) > 0:
            first = cands[0]
            # pattern: output -> [ { content: [ { text: "..." } ] } ]
            out = None
            if isinstance(first, dict):
                out = first.get("output") or first.get("message") or None
            else:
                out = getattr(first, "output", None) or getattr(first, "message", None)

            if out:
                # if out is list-like
                if isinstance(out, (list, tuple)) and len(out) > 0:
                    piece = out[0]
                    if isinstance(piece, dict):
                        cont = piece.get("content")
                        if cont and isinstance(cont, (list, tuple)) and len(cont) > 0:
                            text = cont[0].get("text")
                            if text:
                                return text
                    else:
                        # try attribute access
                        cont = getattr(piece, "content", None)
                        if cont and isinstance(cont, (list, tuple)) and len(cont) > 0:
                            txt = getattr(cont[0], "text", None) or (cont[0].get("text") if isinstance(cont[0], dict) else None)
                            if txt:
                                return txt
                else:
                    # message-like single object
                    txt = getattr(out, "text", None) or (out.get("text") if isinstance(out, dict) else None)
                    if txt:
                        return txt
    except Exception:
        logger.debug("Nested candidate parsing failed", exc_info=True)

    # try turning response into JSON string if possible
    try:
        if isinstance(resp, (dict, list)):
            return json.dumps(resp)
        else:
            return str(resp)
    except Exception:
        return ""


def validate_and_trim_str(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return value.strip()


# ---- Endpoints ----

@app.before_request
def check_size_limit():
    # Pure defensive check - Flask may reject very large requests itself but this helps
    cl = request.content_length
    if cl and cl > MAX_REQUEST_BODY_SIZE:
        logger.warning("Request blocked due to size: %s bytes", cl)
        return jsonify({"error": "Request body too large"}), 413


@app.route("/api/chat", methods=["POST"])
def chat():
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    logger.info("[%s] /api/chat request received", request_id)
    try:
        data = request.get_json(silent=True) or {}
        user_message = validate_and_trim_str(data.get("message", ""))
        session_id = validate_and_trim_str(data.get("session_id")) or str(uuid.uuid4())

        if not user_message:
            logger.info("[%s] Empty message rejected", request_id)
            return jsonify({"error": "Message cannot be empty"}), 400

        # Build conversation history from DB if available
        history_for_gemini: List[Dict[str, Any]] = []
        try:
            if db:
                conv = db.get_conversation(session_id) or {}
                stored_history = conv.get("history", []) if isinstance(conv, dict) else []
                # convert to model-friendly shape (defensive)
                for m in stored_history:
                    role = m.get("role", "user") if isinstance(m, dict) else getattr(m, "role", "user")
                    content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
                    if role == "system":
                        continue
                    history_for_gemini.append({"role": "model" if role == "assistant" else role, "parts": [{"text": validate_and_trim_str(content)}]})
        except Exception:
            logger.exception("[%s] Failed to load conversation history from DB", request_id)

        # Compose final history including SYSTEM_PROMPT at beginning
        SYSTEM_PROMPT = (
            "You are CookBot, a friendly and knowledgeable cooking assistant. "
            "When asked for a recipe, return a single valid JSON object with type:'recipe' and the fields: "
            "title, description, ingredients, instructions, prep_time, cook_time, servings. "
            "For non-recipe questions, return {'type':'text','content': '...'}."
        )
        full_history = [{"role": "user", "parts": [{"text": SYSTEM_PROMPT}]}] + history_for_gemini

        # Ensure the API is configured
        if not GEMINI_API_KEY:
            logger.error("[%s] GEMINI_API_KEY missing", request_id)
            return jsonify({"error": "Server misconfigured: missing GEMINI_API_KEY"}), 500

        # Create model instance (defensively)
        try:
            logger.info("[%s] Attempting to create model %s", request_id, MODEL_NAME)
            model = genai.GenerativeModel(model_name=MODEL_NAME, generation_config=GENERATION_CONFIG)
        except NotFound as nf:
            logger.error("[%s] Model not found: %s", request_id, nf, exc_info=True)
            available = try_list_models_safe()
            return jsonify({"error": f"Model {MODEL_NAME} not available", "available_models": available}), 500
        except PermissionDenied as pd:
            logger.error("[%s] Permission denied when creating model: %s", request_id, pd, exc_info=True)
            return jsonify({"error": "Permission denied for model creation. Check API key and account permissions."}), 500
        except Exception as e:
            logger.exception("[%s] Failed to initialize model: %s", request_id, e)
            available = try_list_models_safe()
            return jsonify({"error": "Failed to initialize model. See logs.", "available_models": available}), 500

        # Start chat session and send message
        try:
            chat_session = model.start_chat(history=full_history)
        except Exception as e:
            logger.exception("[%s] Failed to start chat session: %s", request_id, e)
            return jsonify({"error": "Failed to start chat session. Check model compatibility and SDK version."}), 500

        try:
            raw_response = chat_session.send_message(user_message)
        except NotFound as nf:
            logger.error("[%s] Model generate not supported: %s", request_id, nf, exc_info=True)
            available = try_list_models_safe()
            return jsonify({"error": "Model cannot process chat with this SDK/account", "available_models": available}), 500
        except PermissionDenied as pd:
            logger.error("[%s] Permission denied for generate call: %s", request_id, pd, exc_info=True)
            return jsonify({"error": "API key permission denied. Please rotate key."}), 403
        except Exception as e:
            logger.exception("[%s] Error from model send_message: %s", request_id, e)
            return jsonify({"error": "Error generating response from model"}), 500

        ai_text = safe_extract_text_from_response(raw_response)
        logger.debug("[%s] Raw AI text: %s", request_id, ai_text[:1000] if ai_text else "<empty>")

        # Persist raw conversation into DB (defensive)
        try:
            to_store = []
            # Combine existing history + new messages
            if db:
                conv = db.get_conversation(session_id) or {}
                existing = conv.get("history", []) if isinstance(conv, dict) else []
                to_store.extend(existing)
            to_store.extend([{"role": "user", "content": user_message}, {"role": "assistant", "content": ai_text}])
            if db:
                db.save_conversation(session_id, to_store)
        except Exception:
            logger.exception("[%s] Failed to persist conversation to DB", request_id)

        # Try to parse AI response as JSON per your system prompt
        parsed = None
        try:
            parsed = json.loads(ai_text) if ai_text else None
        except Exception:
            parsed = None

        if isinstance(parsed, dict) and parsed.get("type") == "recipe":
            return jsonify({"response": ai_text, "session_id": session_id, "is_recipe": True, "recipe_data": parsed}), 200
        if isinstance(parsed, dict) and parsed.get("type") == "text":
            return jsonify({"response": parsed.get("content", ai_text), "session_id": session_id, "is_recipe": False}), 200

        # If we got valid JSON but unknown shape, return friendly fallback
        if parsed is not None:
            logger.warning("[%s] Unexpected JSON structure from AI: %s", request_id, parsed)
            return jsonify({"response": "I received an unexpected response format. Could you rephrase?", "session_id": session_id, "is_recipe": False}), 200

        # Not JSON — return plain text fallback
        if ai_text:
            return jsonify({"response": ai_text, "session_id": session_id, "is_recipe": False}), 200

        # nothing meaningful
        logger.error("[%s] Empty or unparsable response from model", request_id)
        return jsonify({"response": "I'm having trouble right now. Please try again in a moment."}), 500

    except Exception as e:
        logger.exception("[%s] Unhandled error in /api/chat: %s", request_id, e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/contact", methods=["POST"])
def handle_contact_form():
    try:
        data = request.get_json(silent=True) or {}
        name = validate_and_trim_str(data.get("name"))
        email = validate_and_trim_str(data.get("email"))
        message = validate_and_trim_str(data.get("message"))

        if not name or not email or not message:
            return jsonify({"error": "All fields are required."}), 400

        if not SENDER_EMAIL or not SENDER_PASSWORD or not RECEIVER_EMAIL:
            logger.warning("Email configuration missing; cannot send contact email.")
            return jsonify({"error": "Email service not configured."}), 500

        # Simple email body (RFC-5322 minimal)
        body = (
            f"From: {SENDER_EMAIL}\r\n"
            f"To: {RECEIVER_EMAIL}\r\n"
            f"Subject: Chef Byte Contact Form: {name}\r\n"
            f"MIME-Version: 1.0\r\n"
            f"Content-Type: text/plain; charset=UTF-8\r\n"
            f"\r\n"
            f"Name: {name}\r\nEmail: {email}\r\nMessage:\r\n{message}\r\n"
        )

        context = ssl.create_default_context()
        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                server.login(SENDER_EMAIL, SENDER_PASSWORD)
                server.sendmail(SENDER_EMAIL, RECEIVER_EMAIL, body)
            logger.info("Contact email sent: from=%s name=%s", email, name)
            return jsonify({"success": True, "message": "Message sent successfully! We will get back to you soon."}), 200
        except smtplib.SMTPAuthenticationError:
            logger.exception("SMTP authentication failed when sending contact email.")
            return jsonify({"error": "Email authentication failed on server."}), 500
        except Exception:
            logger.exception("Failed to send email.")
            return jsonify({"error": "Failed to send email; try again later."}), 500

    except Exception as e:
        logger.exception("Unhandled error in /api/contact: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/save_recipe", methods=["POST"])
def save_recipe():
    try:
        data = request.get_json(silent=True) or {}
        session_id = validate_and_trim_str(data.get("session_id"))
        recipe_data = data.get("recipe_data")

        if not session_id or not recipe_data:
            return jsonify({"error": "Missing required session_id or recipe_data"}), 400

        if not db:
            logger.error("Database not initialized; cannot save recipe.")
            return jsonify({"error": "Server database unavailable"}), 500

        try:
            recipe_id = db.save_recipe(session_id, recipe_data)
            logger.info("Recipe saved for session %s id=%s", session_id, recipe_id)
            return jsonify({"success": True, "recipe_id": str(recipe_id), "message": "Recipe saved successfully!"}), 200
        except Exception:
            logger.exception("DB error saving recipe for session %s", session_id)
            return jsonify({"error": "Failed to save recipe"}), 500

    except Exception as e:
        logger.exception("Unhandled error in /api/save_recipe: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/my_recipes", methods=["GET"])
def get_my_recipes():
    try:
        session_id = validate_and_trim_str(request.args.get("session_id"))
        if not session_id:
            return jsonify({"error": "Session ID required"}), 400

        if not db:
            logger.error("Database not available when retrieving recipes.")
            return jsonify({"error": "Server database unavailable"}), 500

        try:
            recipes = db.get_user_recipes(session_id) or []
            logger.info("Retrieved %d recipes for session %s", len(recipes), session_id)
            return jsonify({"recipes": recipes}), 200
        except Exception:
            logger.exception("DB error retrieving recipes for session %s", session_id)
            return jsonify({"error": "Failed to retrieve recipes"}), 500

    except Exception as e:
        logger.exception("Unhandled error in /api/my_recipes: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()}), 200
    except Exception as e:
        logger.exception("Health check failed: %s", e)
        return jsonify({"status": "unhealthy", "error": str(e), "timestamp": datetime.utcnow().isoformat()}), 500


# ---- Run ----
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # debug=False for production; set True for local development only
    app.run(host="0.0.0.0", port=port, debug=False)
