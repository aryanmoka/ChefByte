// ChatInterface.tsx (UPDATED)
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
  timestamp: string;
  isRecipe?: boolean;
  recipeData?: any;
}

interface ChatInterfaceProps {
  sessionId: string;
  initialPrompt?: string | null;
}

const STORAGE_PREFIX = 'chefbyte_chat_';

export default function ChatInterface({ sessionId, initialPrompt = null }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentId, setLastSentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // typing buffer map (to avoid frequent full-array updates)
  const typingBuffers = useRef<Record<string, string>>({});

  // load/save history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + sessionId);
      if (raw) setMessages(JSON.parse(raw));
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

  // enable smooth scrolling on mobile and allow vertical pan
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // ensure helpful CSS for touch scrolling
    el.style.webkitOverflowScrolling = 'touch'; // eslint-disable-line @typescript-eslint/ban-ts-comment
    el.style.setProperty('-webkit-overflow-scrolling', 'touch'); // defensive
    el.style.touchAction = 'pan-y';
  }, []);

  // scroll to bottom helper (use smooth but fallback gracefully)
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    // prefer scrollIntoView on the anchor ref; if it fails, scroll the container
    try {
      messagesEndRef.current?.scrollIntoView({ behavior });
    } catch {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    // only smooth scroll after a short delay so entrance animations don't fight the scroll
    const t = setTimeout(() => scrollToBottom('smooth'), 80);
    return () => clearTimeout(t);
  }, [messages, isLoading]);

  // autofocus initial prompt auto-send
  useEffect(() => {
    if (initialPrompt) {
      setInputValue(initialPrompt);
      const t = setTimeout(() => handleSendMessage(initialPrompt), 180);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  // push helper
  const pushMessage = (msg: Message) => setMessages(prev => [...prev, msg]);

  /**
   * Throttled / batched typing animation:
   * - Avoids updating the entire messages array every single character.
   * - Writes to a typingBuffers map and updates the placeholder message at most every `throttleMs`.
   */
  const animateAIText = (placeholderId: string, fullText: string, throttleMs = 45) => {
    let idx = 0;
    const total = fullText.length;
    let lastUpdate = performance.now();
    let running = true;

    const step = () => {
      if (!running) return;
      // increment by a few characters (randomised slightly for natural feel)
      const stepSize = Math.max(1, Math.floor(1 + Math.random() * 3));
      idx = Math.min(total, idx + stepSize);
      typingBuffers.current[placeholderId] = fullText.slice(0, idx);

      const now = performance.now();
      if (now - lastUpdate >= throttleMs || idx === total) {
        // commit to messages state - only replace the placeholder message content
        setMessages(prev =>
          prev.map(m => (m.id === placeholderId ? { ...m, content: typingBuffers.current[placeholderId] } : m))
        );
        lastUpdate = now;
      }

      if (idx < total) {
        // schedule next frame via setTimeout to avoid hammering RAF for long texts
        window.setTimeout(step, Math.max(8, throttleMs / 2));
      } else {
        running = false;
      }
    };

    step();

    return () => {
      running = false;
    };
  };

  // send message core
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

    const aiPlaceholderId = `ai_${Date.now()}_pending`;
    const aiPlaceholder: Message = {
      id: aiPlaceholderId,
      type: 'ai',
      content: '',
      timestamp: new Date().toISOString()
    };
    pushMessage(aiPlaceholder);

    // ensure we scroll the placeholder into view quickly
    setTimeout(() => scrollToBottom('smooth'), 40);

    try {
      const response = await chatAPI.sendMessage(text, sessionId);

      const respText: string = response?.response ?? '';
      const isRecipe = Boolean(response?.is_recipe);
      const recipeData = response?.recipe_data ?? null;

      // animate typing with throttling
      const stopAnim = animateAIText(aiPlaceholderId, respText, 50);

      // wait for "animation" to complete: estimate duration but also wait for final commit
      // use a promise that resolves when the buffer equals full text
      await new Promise<void>((resolve) => {
        const maxWait = Math.min(Math.max(respText.length * 18, 300), 8000);
        const poll = setInterval(() => {
          if (typingBuffers.current[aiPlaceholderId] === respText) {
            clearInterval(poll);
            resolve();
          }
        }, 60);
        // fallback safety
        setTimeout(() => {
          clearInterval(poll);
          resolve();
        }, maxWait);
      });

      stopAnim && stopAnim();

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: respText,
        timestamp: new Date().toISOString(),
        isRecipe,
        recipeData
      };

      // replace placeholder
      setMessages(prev => prev.map(m => (m.id === aiPlaceholderId ? aiMessage : m)));

      // small delay to allow card entrance animation to play before final scroll
      setTimeout(() => scrollToBottom('smooth'), 120);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err?.message || 'Failed to send message. Try again.');
      setMessages(prev => prev.filter(m => m.id !== aiPlaceholderId));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRetry = async () => {
    if (!lastSentId) return;
    const lastUser = messages.find(m => m.id === lastSentId);
    if (lastUser && lastUser.type === 'user') {
      await handleSendMessage(lastUser.content);
    }
  };

  const handleSaveRecipe = async (recipeData: any) => {
    try {
      const res = await chatAPI.saveRecipe(sessionId, recipeData);
      alert(res?.message ?? 'Recipe saved!');
    } catch (e) {
      console.error('Save recipe failed', e);
      alert('Failed to save recipe. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col bg-gray-100 dark:bg-gray-900 rounded-lg shadow-xl">
      {/* Messages Display Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
        // Make sure the container receives touch events and does not block scroll
        role="log"
        aria-live="polite"
      >
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
             <div className="mt-4 flex items-start gap-3 recipe-enter-wrapper">
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

        {isLoading && <TypingIndicator />}

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
}
