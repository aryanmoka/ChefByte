# backend/database.py
import os
import uuid
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from pymongo import MongoClient, ASCENDING, errors

logger = logging.getLogger("cookbot.database")
logger.setLevel(logging.INFO)

# Optional: let top-level app configure handlers; otherwise add simple handler for standalone tests
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
    logger.addHandler(ch)


class Database:
    """
    Lightweight MongoDB wrapper for conversations and recipes.
    Configuration via environment variables:
      - MONGODB_URI (default: mongodb://localhost:27017/)
      - MONGODB_DBNAME (default: cooking_chatbot)
      - MONGODB_CONVERSATIONS (collection name)
      - MONGODB_RECIPES (collection name)
    """

    def __init__(self):
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
        dbname = os.getenv("MONGODB_DBNAME", "cooking_chatbot")
        conv_name = os.getenv("MONGODB_CONVERSATIONS", "conversations")
        recipes_name = os.getenv("MONGODB_RECIPES", "recipes")

        # Connection options tuned for cloud hosts
        try:
            self.client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000,  # quick fail if DB unreachable
                connectTimeoutMS=5000,
                socketTimeoutMS=20000,
                retryWrites=True,
            )
            # Test connection (raises if cannot connect)
            self.client.admin.command("ping")
            self.db = self.client[dbname]
            self.conversations = self.db[conv_name]
            self.recipes = self.db[recipes_name]
            self._ensure_indexes()
            logger.info("Connected to MongoDB (%s) and initialized collections.", mongo_uri)
        except errors.PyMongoError as e:
            # Fail open: log error and set collections to None so calling code can handle missing DB
            logger.exception("Failed to connect to MongoDB at %s: %s", mongo_uri, e)
            self.client = None
            self.db = None
            self.conversations = None
            self.recipes = None

    def _ensure_indexes(self):
        try:
            if self.conversations is not None:
                # session_id unique per conversation
                self.conversations.create_index([("session_id", ASCENDING)], unique=True, background=True)
            if self.recipes is not None:
                # index for lookups and sorting by saved_at
                self.recipes.create_index([("session_id", ASCENDING), ("saved_at", ASCENDING)], background=True)
                # ensure a unique recipe_id
                self.recipes.create_index([("recipe_id", ASCENDING)], unique=True, background=True)
        except errors.PyMongoError:
            logger.exception("Failed to create indexes (non-fatal)")

    # -------------------------
    # Conversation methods
    # -------------------------
    def save_conversation(self, session_id: str, messages: List[Dict[str, Any]]) -> bool:
        """
        Save or update a conversation (upsert).
        `messages` should be a list of dicts: {role: 'user'|'assistant'|'system', content: '...'}
        Returns True on success, False otherwise.
        """
        if not self.conversations:
            logger.error("save_conversation: DB not initialized")
            return False
        if not session_id:
            logger.error("save_conversation: missing session_id")
            return False

        try:
            now = datetime.utcnow()
            result = self.conversations.update_one(
                {"session_id": session_id},
                {
                    "$set": {"history": messages, "updated_at": now},
                    "$setOnInsert": {"session_id": session_id, "created_at": now},
                },
                upsert=True,
            )
            logger.debug("save_conversation: matched=%s modified=%s upserted_id=%s", result.matched_count, result.modified_count, getattr(result, "upserted_id", None))
            return True
        except errors.PyMongoError as e:
            logger.exception("Error saving conversation for session %s: %s", session_id, e)
            return False

    def get_conversation(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a conversation document by session_id.
        Returns the document dict or None if not found / error.
        """
        if not self.conversations:
            logger.error("get_conversation: DB not initialized")
            return None
        if not session_id:
            return None
        try:
            doc = self.conversations.find_one({"session_id": session_id}, {"_id": 0})
            return doc
        except errors.PyMongoError as e:
            logger.exception("Error fetching conversation %s: %s", session_id, e)
            return None

    # -------------------------
    # Recipes methods
    # -------------------------
    def save_recipe(self, session_id: str, recipe_data: Dict[str, Any]) -> Optional[str]:
        """
        Save a recipe document and return generated recipe_id on success, else None.
        """
        if not self.recipes:
            logger.error("save_recipe: DB not initialized")
            return None
        if not session_id or not recipe_data:
            logger.error("save_recipe: missing parameters")
            return None

        try:
            recipe_id = str(uuid.uuid4())
            doc = {
                "recipe_id": recipe_id,
                "session_id": session_id,
                "recipe_data": recipe_data,
                "saved_at": datetime.utcnow(),
            }
            self.recipes.insert_one(doc)
            logger.debug("Saved recipe %s for session %s", recipe_id, session_id)
            return recipe_id
        except errors.DuplicateKeyError:
            # extremely unlikely because we use uuid4, but handle gracefully
            logger.exception("save_recipe: Duplicate recipe_id; retrying once")
            try:
                recipe_id = str(uuid.uuid4())
                doc["recipe_id"] = recipe_id
                self.recipes.insert_one(doc)
                return recipe_id
            except Exception:
                logger.exception("save_recipe retry failed")
                return None
        except errors.PyMongoError as e:
            logger.exception("Error saving recipe for session %s: %s", session_id, e)
            return None

    def get_user_recipes(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Return list of recipes for a session (most recent first).
        Always returns a list (empty on error or no recipes).
        """
        if not self.recipes:
            logger.error("get_user_recipes: DB not initialized")
            return []
        if not session_id:
            return []

        try:
            cursor = (
                self.recipes.find({"session_id": session_id}, {"_id": 0})
                .sort("saved_at", -1)
            )
            return list(cursor)
        except errors.PyMongoError as e:
            logger.exception("Error fetching recipes for %s: %s", session_id, e)
            return []
