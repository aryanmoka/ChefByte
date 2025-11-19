import React, { useState } from 'react';
import { MessageCircle, Utensils, Clock, Users, Sparkles } from 'lucide-react';

type WelcomeScreenProps = {
  onStartChat: (initialPrompt?: string) => void;
};

const examplePrompts = [
  'What can I make with chicken and rice?',
  'Give me a recipe for chocolate cake',
  'How do I make pasta from scratch?',
  'Quick dinner ideas for two people',
  'Vegetarian recipes under 30 minutes',
  "What's a good substitute for eggs in baking?",
];

const features = [
  {
    icon: <MessageCircle className="h-6 w-6" />,
    title: 'Natural Conversation',
    description: 'Chat naturally about cooking, ingredients, and techniques',
  },
  {
    icon: <Utensils className="h-6 w-6" />,
    title: 'Personalized Recipes',
    description: 'Get recipes tailored to your preferences and dietary needs',
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: 'Quick Solutions',
    description: 'Find fast answers to cooking questions and ingredient substitutions',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'All Skill Levels',
    description: "Whether you're a beginner or expert, get help at your level",
  },
];

export default function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const [pickedPrompt, setPickedPrompt] = useState<string | null>(null);

  function handleStart(prompt?: string) {
    // slight visual delay so users get micro-feedback when clicking
    setPickedPrompt(prompt ?? null);
    setTimeout(() => onStartChat(prompt), 120);
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* HERO */}
      <div className="grid gap-10 lg:grid-cols-2 items-center mb-12">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-gray-900 dark:text-white">
            Meet <span className="text-amber-500">Chef Byte</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
            Your friendly cooking assistant — recipes, tips, substitutions and step-by-step
            guidance. Fast, personalised, and delightful.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => handleStart()}
              className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-5 rounded-lg shadow-lg transition transform hover:-translate-y-0.5"
              aria-label="Start chat"
            >
              <Sparkles className="w-5 h-5" /> Start cooking
            </button>

            <button
              onClick={() => window.scrollTo({ top: 520, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent py-3 px-4 rounded-lg shadow-sm hover:shadow-md transition"
            >
              Learn more
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Tip: Click any example below to auto-fill the chat input and jump straight into the recipe flow.
          </div>
        </div>

        {/* Visual card */}
        <div className="relative">
          <div className="bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <Utensils className="w-7 h-7 text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Chef Byte Pro Tip</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Try "What can I make with chicken and rice?" — quick, tasty, and flexible.</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {/* simulated chat preview */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-500">You</div>
                <div className="mt-1 text-sm text-gray-800 dark:text-gray-100">"What can I make with chicken and rice?"</div>
                <div className="mt-3 text-xs text-gray-500">Chef Byte</div>
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-200">"One-pan chicken fried rice — 30 mins, family favourite. Shall I show the recipe?"</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {features.map((f, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm hover:shadow-lg transition transform hover:-translate-y-1">
            <div className="text-amber-500 mb-3">{f.icon}</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{f.title}</h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{f.description}</p>
          </div>
        ))}
      </div>

      {/* Example Prompts */}
      <section id="prompts" className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">Try asking me...</h3>

        <div className="grid sm:grid-cols-2 gap-3">
          {examplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleStart(p)}
              className={`text-left p-4 rounded-lg transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600 ${
                pickedPrompt === p ? 'ring-2 ring-amber-200 dark:ring-amber-700' : 'ring-1 ring-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-200">"{p}"</div>
                <div className="text-xs text-amber-500">Try</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={() => handleStart(examplePrompts[0])}
            className="inline-flex items-center gap-2 border border-amber-500 text-amber-600 py-2 px-4 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900 transition"
          >
            Quick start: chicken & rice
          </button>
        </div>
      </section>

      {/* Footer small */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Built with ❤️ · Recipes are suggestions — always double-check food allergies and portions.
      </div>
    </div>
  );
}
