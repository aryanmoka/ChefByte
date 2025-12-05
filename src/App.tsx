// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';

import ChatInterface from './components/ChatInterface';
import WelcomeScreen from './components/WelcomeScreen';
import Footer from './components/Footer';
import Contact from './components/Contact';
import { useTheme } from './contexts/ThemeContext';

// IMPORTANT: ThemeProvider should wrap <App /> (in index.tsx / main.tsx).
// This file expects useTheme() to work correctly.

function App() {
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showContactPage, setShowContactPage] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const { isDark, toggleTheme } = useTheme();

  // Initialize or load session ID (persisted in localStorage)
  useEffect(() => {
    try {
      const key = 'chefbyte_session_id';
      const existing = localStorage.getItem(key);
      if (existing) {
        setSessionId(existing);
        return;
      }
      const newId =
        typeof (window as any).crypto?.randomUUID === 'function'
          ? (window as any).crypto.randomUUID()
          : `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      localStorage.setItem(key, newId);
      setSessionId(newId);
    } catch {
      const fallback = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      setSessionId(fallback);
    }
  }, []);

  // Close mobile menu on ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  // Close mobile menu when clicking outside — robust and non-racy:
  // we attach a mousedown listener on document so it runs before React's onClick.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isMobileMenuOpen) return;
      const target = e.target as Node | null;
      // if click is outside the aside (mobile menu), close it
      if (mobileMenuRef.current && target && !mobileMenuRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobileMenuOpen]);

  // Centralized navigation function
  const navigateTo = (view: 'home' | 'chatbot' | 'contact') => {
    if (view === 'home') {
      setHasStartedChat(false);
      setShowContactPage(false);
    } else if (view === 'chatbot') {
      setHasStartedChat(true);
      setShowContactPage(false);
    } else if (view === 'contact') {
      setHasStartedChat(false);
      setShowContactPage(true);
    }
    setIsMobileMenuOpen(false);
    // ensure small scroll to top so header is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBackToHome = () => navigateTo('home');

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col font-inter">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-white dark:bg-gray-800 px-3 py-2 rounded shadow"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="fixed w-full top-0 left-0 z-30">
        <div className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center max-w-full mx-auto rounded-b-xl">
          <div className="text-2xl font-bold text-indigo-600 dark:text-amber-400">Chef Byte</div>

          {/* Desktop nav */}
          <nav className="hidden md:flex space-x-6">
            <button
              onClick={() => navigateTo('home')}
              className={`text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-amber-300 transition duration-200 font-medium py-2 px-3 rounded-md ${
                !hasStartedChat && !showContactPage ? 'text-indigo-600 dark:text-amber-300 font-bold' : ''
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('contact')}
              className={`text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-amber-300 transition duration-200 font-medium py-2 px-3 rounded-md ${
                showContactPage ? 'text-indigo-600 dark:text-amber-300 font-bold' : ''
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-orange-700 dark:bg-gray-700 hover:bg-orange-800 dark:hover:bg-gray-600 transition-colors duration-200 text-white"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-300" /> : <Moon className="h-5 w-5 text-orange-200" />}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen((s: boolean) => !s)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ touchAction: 'manipulation' }}
            >
              <span className="sr-only">{isMobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6 text-gray-50 dark:text-gray-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Overlay (only active when menu open) */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-60 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ zIndex: 40, backgroundColor: 'rgba(0,0,0,0.45)' }}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden={!isMobileMenuOpen}
      />

      {/* Mobile Sidebar - keep it above overlay and make clicks inside not close it */}
      <aside
        ref={mobileMenuRef}
        className={`fixed top-0 right-0 h-full w-72 transform transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        style={{
          zIndex: 50,
          pointerEvents: isMobileMenuOpen ? 'auto' : 'none',
          touchAction: 'pan-y',
        }}
        onClick={(e) => {
          // stop event bubbling so document mousedown doesn't close while interacting inside
          e.stopPropagation();
        }}
      >
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl">
          <div className="flex items-center justify-between p-4">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="px-4 py-2 space-y-1 flex-1 overflow-auto">
            <button
              onClick={() => {
                navigateTo('home');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-3 px-3 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Home
            </button>

            <button
              onClick={() => {
                navigateTo('contact');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-3 px-3 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Contact
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigateTo('chatbot');
              }}
              className="block w-full text-left py-3 px-3 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Chat
            </button>
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-300">Built with ❤️</div>
          </div>
        </div>
      </aside>

      {/* Main content: pad top to header height so nothing is hidden under fixed header */}
      <main id="main-content" className="pt-[64px] md:pt-[64px] flex-1 flex flex-col">
        {!hasStartedChat && !showContactPage ? (
          <WelcomeScreen onStartChat={() => navigateTo('chatbot')} />
        ) : showContactPage ? (
          <Contact onGoBack={() => navigateTo('chatbot')} />
        ) : (
          <ChatInterface sessionId={sessionId} />
        )}
      </main>

      {/* Show footer on all pages EXCEPT chat */}
      {(!hasStartedChat || showContactPage) && <Footer />}
    </div>
  );
}

export default App;
