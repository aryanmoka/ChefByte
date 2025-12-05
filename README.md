## Ai-Cooking-Chatbot (aka CookBot)

*Ai-Cooking-Chatbot, also called **CookBot*, is an AI-powered cooking assistant that combines a React/TypeScript frontend, a Flask/Python backend, MongoDB storage, and OpenAI’s GPT-3.5 to help users chat, get recipes, save them, and manage cooking sessions in style.

---

🔗 Live Demo

👉 [Try CookBot Here]((https://aichefbyte.netlify.app/))

### Features

#### *Frontend (React + TypeScript)*

* Sleek, responsive chat interface with light/dark mode toggle.
* Real-time messaging with typing indicators.
* Recipes rendered into structured cards: titles, ingredient lists, instructions.
* Click-to-copy ingredients feature.
* Save and later retrieve recipes with bookmark icons.
* Mobile-first design.

#### *Backend (Flask + Python)*

* Integrated with OpenAI GPT-3.5 to process cooking queries using a custom prompt.
* MongoDB stores chat sessions and saved recipes.
* REST API endpoints for chat interactions and recipe handling.
* Supports session tracking, CORS, and environment-based configuration.

---

### Project Structure


backend/
  ├── app.py               # Flask app and routes
  ├── database.py          # MongoDB connection
  ├── requirements.txt     # Python dependencies
  └── .env.example         # Template for env variables

src/                      # React frontend components
  ├── components/         # UI components
  ├── contexts/           # Theme (Dark/Light) context
  └── services/           # API calls (e.g., with Axios)

package.json              # Node dependencies
README.md                 # Project documentation
…and build config files: .gitignore, tsconfig, tailwind.config.js, vite.config.ts, etc.


---

### Setup Instructions

#### Prerequisites

* Node.js (v18+) and npm
* Python (v3.8+)
* MongoDB (local or Mongo Atlas)
* OpenAI API key

#### Backend Setup

1. cd backend
2. Create virtual environment:

   bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   
3. Install Python dependencies:

   bash
   pip install -r requirements.txt
   
4. Configure environment variables:

   bash
   cp .env.example .env
   

   Fill in:

   
   OPENAI_API_KEY=your_key
   MONGODB_URI=your_mongodb_uri
   
5. Ensure MongoDB is running (locally or via cloud).
6. Run backend:

   bash
   python app.py
   

   → Backend now available at http://localhost:5000.

#### Frontend Setup

1. From project root, run:

   bash
   npm install
   npm run dev
   

   → Frontend hosted at http://localhost:5173.

---

### API Endpoints

* *POST /api/chat*
  Send your cooking message.
  *Request body*:

  json
  {
    "message": "How do I make pasta?",
    "session_id": "session_123"
  }
  

  *Response*:

  json
  {
    "response": "Here's how to make pasta...",
    "session_id": "session_123",
    "is_recipe": true,
    "recipe_data": {
      "title": "Basic Pasta",
      "ingredients": ["1 lb pasta", "Salt", "Water"],
      "instructions": ["Boil water...", "Add pasta..."]
    }
  }
  

* *POST /api/save\_recipe*
  Save the current recipe.

* *GET /api/my\_recipes*
  Retrieve all saved recipes for the session.

* *GET /api/health*
  Health check endpoint (e.g., to verify server is running).

---

### Database Schema

*collections*:

* *conversations*

  json
  {
    session_id: String,
    history: Array,
    created_at: Date,
    updated_at: Date
  }
  

* *recipes*

  json
  {
    recipe_id: String,
    session_id: String,
    recipe_data: Object,
    saved_at: Date
  }
  

---

### How to Use

1. Open the app and click *"Start Cooking Together"*.
2. Chat like you would with a cooking assistant:

   * “What can I make with chicken and rice?”
   * “Give me a recipe for chocolate cake.”
   * “What’s a good egg substitute for baking?”
3. Get a recipe card: title, ingredient list, steps.
4. Use *copy* to copy ingredients quickly.
5. Click the *bookmark* icon to save favorite recipes.
6. Switch between light and dark themes anytime.

---

### Technologies Used

| Layer        | Tech Stack                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| *Frontend* | React 18, TypeScript, Tailwind CSS, Lucide React icons, Axios, Context API |
| *Backend*  | Flask (Python), OpenAI GPT-3.5, PyMongo, Flask-CORS, python-dotenv         |
| *Database* | MongoDB                                                                    |

---

### Development Notes

* The cooking assistant prompt is carefully crafted for helpful, structured output.
* Recipe outputs are JSON to allow clean parsing.
* Session-based chats let you have follow-ups with memory.
* Dark mode preference stays stored in localStorage.
* API calls use proper error handling and user feedback.

---

### Contributing

To contribute:

1. *Fork* the repository.
2. Create your *feature branch*.
3. Implement your changes.
4. Add tests if needed.
5. Submit a *pull request* for review.
