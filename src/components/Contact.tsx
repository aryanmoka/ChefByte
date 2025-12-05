// src/components/Contact.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { chatAPI } from '../services/api'; // keep your existing API wrapper

interface ContactProps {
  onGoBack: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Contact: React.FC<ContactProps> = ({ onGoBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const mountedRef = useRef(true);
  const clearTimerRef = useRef<number | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  const scheduleClearMessage = (timeout = 5000) => {
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setSubmitMessage(null);
    }, timeout);
  };

  const validateForm = () => {
    if (!name.trim()) {
      setSubmitMessage('Please enter your name.');
      setIsError(true);
      scheduleClearMessage();
      return false;
    }
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setSubmitMessage('Please enter a valid email address.');
      setIsError(true);
      scheduleClearMessage();
      return false;
    }
    if (!message.trim()) {
      setSubmitMessage('Please enter a message.');
      setIsError(true);
      scheduleClearMessage();
      return false;
    }
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setSubmitMessage(null);
    setIsError(false);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      };

      const response = await chatAPI.sendContactMessage(payload);

      const success = response?.success ?? response?.ok ?? false;
      const serverMsg = response?.message ?? response?.error ?? null;

      if (success) {
        if (!mountedRef.current) return;
        setSubmitMessage(serverMsg ?? 'Your message has been sent successfully!');
        setIsError(false);
        setName('');
        setEmail('');
        setMessage('');
      } else {
        if (!mountedRef.current) return;
        setSubmitMessage(serverMsg || 'Failed to send message. Please try again later.');
        setIsError(true);
      }
    } catch (err: any) {
      console.error('Contact form submission error:', err);
      if (!mountedRef.current) return;
      const text = err?.message ?? 'An unexpected error occurred.';
      setSubmitMessage(text);
      setIsError(true);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      scheduleClearMessage();
      // announce change for screen readers
      if (liveRef.current) {
        try {
          liveRef.current.focus();
        } catch {}
      }
    }
  };

  return (
    <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl">
        {/* Back */}
        <div className="mb-4">
          <button
            onClick={onGoBack}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-amber-400 transition-colors"
            aria-label="Back to Chat"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Chat</span>
          </button>
        </div>

        {/* Card: theme-aware background and border */}
        <div className="rounded-2xl shadow-xl overflow-hidden ring-1 ring-black/5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Left illustration / photo (visible on lg) */}
            <div className="hidden lg:flex items-center justify-center p-6">
              {/* Use an image or SVG — theme aware overlay */}
              <div className="w-full h-full max-w-[260px] rounded-lg overflow-hidden relative">
                <img
                  src="https://images.pexels.com/photos/3184190/pexels-photo-3184190.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Cooking illustration"
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: '4 / 5' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent mix-blend-overlay" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h4 className="text-sm font-semibold">Fast replies, friendly help</h4>
                  <p className="text-xs opacity-90 mt-1">Share feedback or request recipes — we’ll reply by email.</p>
                </div>
              </div>
            </div>

            {/* Form area */}
            <div className="col-span-1 lg:col-span-2 px-6 py-8 sm:px-8">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 text-center lg:text-left">
                Get in Touch
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm text-center lg:text-left max-w-2xl">
                Have a question, feedback, or just want to say hello? Send us a message!
              </p>

              {/* Accessible status message */}
              <div
                tabIndex={-1}
                ref={liveRef}
                aria-live="polite"
                aria-atomic="true"
                className="mt-4 min-h-[2rem]"
              >
                {submitMessage && (
                  <div
                    className={`px-4 py-3 rounded-lg mb-4 text-center ${
                      isError
                        ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/80 dark:text-red-200 dark:border-red-800'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/80 dark:text-emerald-100 dark:border-emerald-700'
                    }`}
                    role={isError ? 'alert' : 'status'}
                  >
                    <p className="font-medium text-sm">{submitMessage}</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleEmailSubmit} className="mt-4 space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Your Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Aryan Mokashi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      aria-required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Your Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      aria-required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    placeholder="Tell us what's on your mind..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
                    aria-required
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.995] text-white rounded-lg font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="text-sm">{loading ? 'Sending...' : 'Send Message'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setName('');
                      setEmail('');
                      setMessage('');
                      setSubmitMessage(null);
                      setIsError(false);
                      if (mountedRef.current) {
                        const el = document.getElementById('name') as HTMLInputElement | null;
                        if (el) el.focus();
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/60 transition"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <strong className="text-amber-400">Note:</strong> We respect your privacy — we'll only use your email to reply.
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* small footer */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Built with ❤️ · Recipes are suggestions — always double-check allergies & portions.
        </div>
      </div>
    </div>
  );
};

export default Contact;
