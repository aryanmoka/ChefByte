// ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, RefreshCcw, Save } from 'lucide-react';
import MessageBubble from './MessageBubble';
import RecipeCard from './RecipeCard';
import TypingIndicator from './TypingIndicator';
import { chatAPI } from '../services/api';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string; // ISO string to ease storage
  isRecipe?: boolean;
  recipeData?: any;
}

interface ChatInterfaceProps {
  sessionId: string;
  /** optional initial prompt to autofill & auto-send (from WelcomeScreen) */
  initialPrompt?: string | null;
}

const STORAGE_PREFIX = 'chefbyte_chat_';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, initialPrompt = null }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentId, setLastSentId] = useState<string | null>(null); // for retry
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Persist/load chat history per sessionId
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + sessionId);
      if (raw) {
        setMessages(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    }
  }, [sessionId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }, [messages, sessionId]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  // Autofill & auto-send initialPrompt if provided
  useEffect(() => {
    if (initialPrompt) {
      setInputValue(initialPrompt);
      // Slight delay to let UI render & user see autofilled text
      const t = setTimeout(() => {
        handleSendMessage(initialPrompt);
      }, 180);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]); // run only once when initialPrompt changes

  // Helper: add message to state
  const pushMessage = (msg: Message) =>
    setMessages(prev => [...prev, msg]);

  // Typing animation: gradually reveal AI text
  const animateAIText = (fullText: string, onChunk: (text: string) => void) => {
    const total = fullText.length;
    let i = 0;
    const baseDelay = 14; // ms per char (adjust speed)
    // chunking: add small delay to look natural
    const interval = window.setInterval(() => {
      i += Math.max(1, Math.floor(Math.random() * 3)); // random step for natural feel
      if (i >= total) {
        onChunk(fullText);
        clearInterval(interval);
      } else {
        onChunk(fullText.slice(0, i));
      }
    }, baseDelay);
    return () => clearInterval(interval);
  };

  // Core send logic (can be reused for retry)
  const handleSendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? inputValue ?? '').trim();
    if (!text || isLoading) return;

    setError(null);
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    pushMessage(userMsg);
    setInputValue('');
    setIsLoading(true);
    setLastSentId(userMsg.id);

    // temporary placeholder for AI message while generating
    const aiPlaceholderId = `ai_${Date.now()}_pending`;
    const aiPlaceholder: Message = {
      id: aiPlaceholderId,
      type: 'ai',
      content: '', // will be filled by animation
      timestamp: new Date().toISOString()
    };
    pushMessage(aiPlaceholder);

    try {
      const response = await chatAPI.sendMessage(text, sessionId);

      // normalize response fields
      const respText: string = response?.response ?? '';
      const isRecipe = Boolean(response?.is_recipe);
      const recipeData = response?.recipe_data ?? null;

      // animate typing into the placeholder message
      let cancelAnim: (() => void) | null = null;
      await new Promise<void>((resolve) => {
        cancelAnim = animateAIText(respText, (chunk) => {
          setMessages(prev => prev.map(m => m.id === aiPlaceholderId ? { ...m, content: chunk } : m));
        });
        // we want to resolve when the animation completes; animation clears itself
        // fallback timeout: if response is short, allow small delay then resolve
        const fallback = setTimeout(() => resolve(), Math.max(220, respText.length * 10));
        // a simple completion detection: poll last message content equals full text
        const checkInterval = setInterval(() => {
          const latest = (messagesEndRef.current && null) // not needed
        }, 200);
        // simpler: resolve after a small delay proportional to text length
        setTimeout(() => {
          clearTimeout(fallback);
          clearInterval(checkInterval);
          resolve();
        }, Math.min(Math.max(respText.length * 10, 250), 6000));
      });

      // Replace placeholder with final AI message object
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: respText,
        timestamp: new Date().toISOString(),
        isRecipe,
        recipeData
      };

      setMessages(prev => prev.map(m => m.id === aiPlaceholderId ? aiMessage : m));
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err?.message || 'Failed to send message. Try again.');
      // remove the ai placeholder (or show error message bubble)
      setMessages(prev => prev.filter(m => m.id !== aiPlaceholderId));
      // Optionally allow retry by keeping lastSentId set
    } finally {
      setIsLoading(false);
      // keep focus on input
      inputRef.current?.focus();
    }
  };

  // Retry the last failed send (resend last user message)
  const handleRetry = async () => {
    if (!lastSentId) return;
    const lastUser = messages.find(m => m.id === lastSentId);
    if (lastUser && lastUser.type === 'user') {
      await handleSendMessage(lastUser.content);
    }
  };

  // Save recipe via API (if available)
  const handleSaveRecipe = async (recipeData: any) => {
    try {
      // optimistic feedback
      const res = await chatAPI.saveRecipe(sessionId, recipeData);
      // res assumed { success: true, recipe_id: '...' }
      alert(res?.message ?? 'Recipe saved!');
    } catch (e) {
      console.error('Save recipe failed', e);
      alert('Failed to save recipe. Please try again.');
    }
  };

  // Keyboard handling for textarea: Enter to send, Shift+Enter newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col bg-gray-100 dark:bg-gray-900 rounded-lg shadow-xl">
      {/* Messages Display Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <p className="text-lg">Start a conversation about cooking!</p>
            <p className="text-sm mt-2">Ask me for recipes, cooking tips, or ingredient substitutions.</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble message={message} />

            {message.isRecipe && message.recipeData && (
              <div className="mt-4 flex items-start gap-3">
                <RecipeCard recipe={message.recipeData} sessionId={sessionId} />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleSaveRecipe(message.recipeData)}
                    title="Save recipe"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && <TypingIndicator />} {/* typing indicator */}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border rounded-md"
                aria-label="Retry sending message"
              >
                <RefreshCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} /> {/* scroll anchor */}
      </div>

      {/* Message Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex space-x-4 items-end">
          <div className="flex-1 relative">
            <label htmlFor="chat-input" className="sr-only">Message</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about cooking, recipes, or ingredients..."
              rows={1}
              className="w-full resize-none px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={isLoading}
              aria-label="Chat input"
            />
            <div className="text-xs text-gray-400 mt-1">Press Enter to send, Shift+Enter for a new line.</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
