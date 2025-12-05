// frontend/src/components/MessageBubble.tsx
import React from 'react';
import { Bot, User } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp?: string | Date | number | null;
  isRecipe?: boolean;
  recipeData?: any;
}

interface MessageBubbleProps {
  message: Message;
}

/**
 * Defensive MessageBubble:
 * - Accepts timestamp as Date | ISO string | number (ms) | undefined.
 * - Normalizes timestamp to a Date when possible and falls back gracefully.
 * - If message is an AI recipe (isRecipe true and not user), returns null so RecipeCard handles it.
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isRecipe = Boolean(message.isRecipe && !isUser);

  // If it's a recipe (AI), let the RecipeCard render it instead
  if (isRecipe) return null;

  // Normalize timestamp to a Date object or null if invalid/missing
  const normalizeTimestamp = (ts?: string | Date | number | null): Date | null => {
    if (ts === undefined || ts === null) return null;
    if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
    if (typeof ts === 'number') {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts === 'string') {
      // try direct parse (ISO or common formats)
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
      // fallback: try Date.parse
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) return new Date(parsed);
      return null;
    }
    return null;
  };

  const dateObj = normalizeTimestamp(message.timestamp);

  // Format time safely using Intl if available
  const formatTime = (d: Date | null) => {
    if (!d) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      // final guarded fallback
      try {
        return typeof d.toLocaleTimeString === 'function' ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      } catch {
        return '';
      }
    }
  };

  const timeLabel = formatTime(dateObj);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-xs lg:max-w-2xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>
        </div>

        {/* Message Content Bubble */}
        <div
          className={`px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-orange-500 text-white rounded-br-sm'
              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {timeLabel ? (
            <p
              className={`text-xs mt-1 ${
                isUser ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {timeLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
