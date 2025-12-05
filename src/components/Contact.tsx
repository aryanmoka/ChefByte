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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  // Clear messages after 5s (and store timeout id so we can clear on unmount)
  const scheduleClearMessage = () => {
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setSubmitMessage(null);
    }, 5000);
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

    // basic client-side validation
    if (!validateForm()) return;

    setLoading(true);
    setSubmitMessage(null);
    setIsError(false);

    try {
      // Ensure your chatAPI.sendContactMessage returns an object like { success: boolean, message?: string }
      const payload = {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      };

      const response = await chatAPI.sendContactMessage(payload);

      // defensive handling: check multiple possible shapes
      const success = response?.success ?? response?.ok ?? false;
      const serverMsg = response?.message ?? response?.error ?? null;

      if (success) {
        if (!mountedRef.current) return;
        setSubmitMessage('Your message has been sent successfully!');
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
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-8">
      <button
        onClick={onGoBack}
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 mb-6"
        aria-label="Go back"
      >
        <ArrowLeft size={20} />
        <span>Back to Chat</span>
      </button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Get in Touch</h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg">
          Have a question, feedback, or just want to say hello? Send us a message!
        </p>
      </div>

      {/* Accessible status message for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="min-h-[2rem]">
        {submitMessage && (
          <div
            className={`px-4 py-3 rounded-lg mb-6 text-center ${
              isError
                ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                : 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            }`}
            role={isError ? 'alert' : 'status'}
          >
            <p className="font-medium">{submitMessage}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-6" noValidate>
        <div>
          <label htmlFor="name" className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
            Your Name
          </label>
          <input
            type="text"
            id="name"
            placeholder="Aryan Mokashi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 focus:border-orange-500 focus:ring focus:ring-orange-500 focus:ring-opacity-50"
            required
            disabled={loading}
            aria-required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
            Your Email
          </label>
          <input
            type="email"
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 focus:border-orange-500 focus:ring focus:ring-orange-500 focus:ring-opacity-50"
            required
            disabled={loading}
            aria-required
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
            Your Message
          </label>
          <textarea
            id="message"
            placeholder="Tell us what's on your mind..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 focus:border-orange-500 focus:ring focus:ring-orange-500 focus:ring-opacity-50 resize-y"
            required
            disabled={loading}
            aria-required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={20} />}
          <span>{loading ? 'Sending...' : 'Send Message'}</span>
        </button>
      </form>
    </div>
  );
};

export default Contact;
