// frontend/src/components/MessageBubble.tsx
import React, { useMemo } from 'react';
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
 * Improved MessageBubble:
 *  - Uses gap instead of space-x so reversing row direction keeps spacing
 *  - Responsive max widths and better word-wrapping
 *  - Accessible labels and stable timestamp formatting
 *  - Returns null when message.isRecipe is true (AI recipes handled by RecipeCard)
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isRecipe = Boolean(message.isRecipe && !isUser);

  // Let RecipeCard handle recipe rendering
  if (isRecipe) return null;

  const normalizeTimestamp = (ts?: string | Date | number | null): Date | null => {
    if (ts === undefined || ts === null) return null;
    if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
    if (typeof ts === 'number') {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts === 'string') {
      // ISO or other parseable formats
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
      const parsed = Date.parse(ts);
      return isNaN(parsed) ? null : new Date(parsed);
    }
    return null;
  };

  const dateObj = normalizeTimestamp(message.timestamp);

  const timeLabel = useMemo(() => {
    if (!dateObj) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch {
      try {
        return typeof dateObj.toLocaleTimeString === 'function'
          ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
      } catch {
        return '';
      }
    }
  }, [dateObj]);

  // bubble classes
  const bubbleBase = 'px-4 py-2 rounded-lg break-words whitespace-pre-wrap';
  const userBubble =
    'bg-orange-500 text-white rounded-br-sm';
  const aiBubble =
    'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-sm';

  return (
    <div
      className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} px-2`}
      role="article"
      aria-label={`${isUser ? 'User' : 'Chef Byte'} message${timeLabel ? ` at ${timeLabel}` : ''}`}
    >
      <div
        className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%] md:max-w-[65%] lg:max-w-2xl`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'
            }`}
            aria-hidden="true"
          >
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>
        </div>

        {/* Content bubble */}
        <div
          className={`${bubbleBase} ${isUser ? userBubble : aiBubble}`}
          title={timeLabel || undefined}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>

          {timeLabel ? (
            <p
              className={`text-xs mt-1 ${isUser ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}
              aria-hidden="true"
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
