import React, { useState } from 'react';
import { Utensils, Sparkles, Flame } from 'lucide-react';

type WelcomeScreenProps = {
  onStartChat: (initialPrompt?: string) => void;
};

const examplePrompts = [
  'What can I make with chicken and rice?',
  'Give me a recipe for chocolate cake',
  'Quick dinner ideas for two people',
];

const heroImages = [
  {
    src: 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Ingredients and spices on wooden table',
  },
  {
    src: 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Fresh salad bowl',
  },
  {
    src: 'https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Chocolate cake slice',
  },
];

export default function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const [pickedPrompt, setPickedPrompt] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  function handleStart(prompt?: string) {
    setPickedPrompt(prompt ?? null);
    setTimeout(() => onStartChat(prompt), 120);
  }

  return (
    <main className="min-h-screen w-screen overflow-x-hidden flex items-center justify-center bg-gradient-to-b from-amber-50 to-amber-100 dark:from-gray-900 dark:to-gray-950 px-4 py-8">

      <div className="w-full max-w-4xl text-center relative">
        {/* decorative blob (responsive sizes) */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] sm:w-[520px] sm:h-[520px] rounded-full bg-gradient-to-tr from-amber-100/60 to-amber-300/40 blur-3xl -z-10" />

        {/* HERO */}
        <header className="mb-6 relative z-10">
          <div className="mx-auto w-fit mb-4">
            <div className="p-3 sm:p-4 bg-white/80 dark:bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 dark:border-gray-700/40">
              <Flame className="w-9 h-9 sm:w-10 sm:h-10 text-amber-600" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Welcome to <span className="text-amber-600">Chef Byte</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            Smart recipe ideas, step-by-step guides and ingredient hacks — served fast and styled beautifully.
          </p>
        </header>

        {/* HERO CARD with images */}
        <section className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: image */}
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative h-48 sm:h-64 lg:h-96">
              {/* image */}
              <img
                src={heroImages[activeImage].src}
                alt={heroImages[activeImage].alt}
                className="w-full h-full object-cover"
                loading="eager"
              />

              {/* image indicators (smaller on mobile) */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-white/40 dark:bg-black/40 backdrop-blur-sm rounded-full py-1 px-2">
                {heroImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === activeImage ? 'scale-125 bg-amber-500' : 'bg-white/60 dark:bg-gray-400/40'
                    }`}
                  />
                ))}
              </div>

              {/* overlay text */}
              <div className="absolute top-3 left-3 bg-gradient-to-r from-black/30 to-transparent text-white rounded-md px-3 py-1 text-xs">
                <div className="font-medium">Chef Byte Pro Tip</div>
                <div className="mt-0.5">Try: "What can I make with chicken and rice?"</div>
              </div>
            </div>
          </div>

          {/* Right: controls */}
          <div className="order-first lg:order-last">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Get started</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Click start or pick a prompt — quick recipes and tailored tips await.</p>

              <div className="mt-4 grid gap-3">
                <button
                  onClick={() => handleStart()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                >
                  <Sparkles className="w-5 h-5" />
                  Start Cooking
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {examplePrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleStart(p)}
                      className={`text-sm text-left px-3 py-2 rounded-lg border transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 ${
                        pickedPrompt === p
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-500" />
                  Recipes are suggestions — adjust to taste & check allergies.
                </div>
              </div>
            </div>

            {/* small gallery: horizontal on mobile */}
            <div className="mt-4">
              <div className="hidden sm:grid grid-cols-3 gap-2">
                {heroImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`overflow-hidden rounded-lg border w-full ${i === activeImage ? 'ring-2 ring-amber-300' : 'border-gray-100 dark:border-gray-700'}`}
                  >
                    <img src={img.src} alt={img.alt} className="w-full h-20 object-cover" />
                  </button>
                ))}
              </div>

              <div className="sm:hidden mt-2">
                <div className="flex gap-2 overflow-x-auto px-1 py-1 hide-scrollbar">
                  {heroImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden ${i === activeImage ? 'ring-2 ring-amber-300' : ''}`}
                    >
                      <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-8 relative z-10 text-sm text-gray-400">Built with ❤️ for food lovers</footer>
      </div>
    </main>
  );
}