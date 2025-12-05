// src/components/WelcomeScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
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
    src: 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Ingredients and spices on wooden table',
  },
  {
    src: 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Fresh salad bowl',
  },
  {
    src: 'https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Chocolate cake slice',
  },
];

export default function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const [pickedPrompt, setPickedPrompt] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // touch / drag refs
  const dragStartX = useRef<number | null>(null);
  const dragCurrentX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const rafRef = useRef<number | null>(null);

  const AUTOPLAY_INTERVAL = 4500; // ms
  const TRANSITION_MS = 420; // CSS transition time in ms
  const IMAGE_COUNT = heroImages.length;

  function handleStart(prompt?: string) {
    setPickedPrompt(prompt ?? null);
    setTimeout(() => onStartChat(prompt), 120);
  }

  const goTo = (index: number) => {
    setActiveImage(((index % IMAGE_COUNT) + IMAGE_COUNT) % IMAGE_COUNT);
  };

  const next = () => goTo(activeImage + 1);
  const prev = () => goTo(activeImage - 1);

  // autoplay
  useEffect(() => {
    if (isPaused) return;
    // clear any existing
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
    autoplayRef.current = window.setInterval(() => {
      // use state setter fn to avoid stale closures
      setActiveImage((cur) => (cur + 1) % IMAGE_COUNT);
    }, AUTOPLAY_INTERVAL);
    return () => {
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [isPaused]);

  // pause on pointer enter / focus
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerEnter = () => setIsPaused(true);
    const onPointerLeave = () => setIsPaused(false);
    const onFocusIn = () => setIsPaused(true);
    const onFocusOut = () => setIsPaused(false);

    el.addEventListener('pointerenter', onPointerEnter);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);

    return () => {
      el.removeEventListener('pointerenter', onPointerEnter);
      el.removeEventListener('pointerleave', onPointerLeave);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // keyboard accessibility
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setIsPaused(true);
        next();
      } else if (e.key === 'ArrowLeft') {
        setIsPaused(true);
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeImage]);

  // touch / drag handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const pointerDown = (clientX: number) => {
      isDragging.current = true;
      dragStartX.current = clientX;
      dragCurrentX.current = clientX;
      setIsPaused(true);
    };
    const pointerMove = (clientX: number) => {
      if (!isDragging.current || dragStartX.current === null) return;
      dragCurrentX.current = clientX;
      // request animation frame for smoother UI (if you want to show parallax effect)
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        // could add subtle transform to image container here for parallax; keeping minimal for performance
      });
    };
    const pointerUp = () => {
      if (!isDragging.current || dragStartX.current === null || dragCurrentX.current === null) {
        isDragging.current = false;
        dragStartX.current = null;
        dragCurrentX.current = null;
        setIsPaused(false);
        return;
      }
      const delta = (dragCurrentX.current ?? 0) - (dragStartX.current ?? 0);
      const threshold = Math.min(window.innerWidth * 0.12, 56); // swipe threshold
      if (delta > threshold) {
        // swipe right -> previous
        prev();
      } else if (delta < -threshold) {
        // swipe left -> next
        next();
      }
      isDragging.current = false;
      dragStartX.current = null;
      dragCurrentX.current = null;
      setIsPaused(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    // touch events
    const onTouchStart = (ev: TouchEvent) => pointerDown(ev.touches[0].clientX);
    const onTouchMove = (ev: TouchEvent) => pointerMove(ev.touches[0].clientX);
    const onTouchEnd = () => pointerUp();

    // mouse events for desktop drag
    const onMouseDown = (ev: MouseEvent) => pointerDown(ev.clientX);
    const onMouseMove = (ev: MouseEvent) => pointerMove(ev.clientX);
    const onMouseUp = () => pointerUp();
    const onMouseLeave = () => {
      if (isDragging.current) pointerUp();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // helper: set active and pause briefly when user interacts
  const userSetActive = (i: number) => {
    setActiveImage(i);
    setIsPaused(true);
    // resume autoplay after a delay
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
    window.setTimeout(() => setIsPaused(false), 3500);
  };

  return (
    <main className="min-h-screen w-screen overflow-x-hidden flex items-center justify-center bg-gradient-to-b from-amber-50 to-amber-100 dark:from-gray-900 dark:to-gray-950 px-4 py-8">
      <div className="w-full max-w-5xl text-center relative">
        {/* Blob decorative */}
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[420px] h-[420px] sm:w-[520px] sm:h-[520px] rounded-full bg-gradient-to-tr from-amber-100/60 to-amber-300/40 blur-3xl -z-10" />

        {/* HERO header */}
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

        {/* HERO card */}
        <section
          ref={containerRef}
          className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
          aria-roledescription="carousel"
          aria-label="Hero images"
        >
          {/* left: image carousel */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl select-none touch-none"
            aria-hidden="false"
          >
            <div className="relative h-56 sm:h-72 lg:h-96 bg-gray-100">
              {/* Images wrapper */}
              <div
                className="absolute inset-0 flex transition-transform"
                style={{
                  width: `${IMAGE_COUNT * 100}%`,
                  transform: `translateX(-${(activeImage * 100) / IMAGE_COUNT}%)`,
                  transition: `transform ${TRANSITION_MS}ms cubic-bezier(.22,.9,.3,1)`,
                }}
              >
                {heroImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="w-full flex-shrink-0 h-full"
                    aria-hidden={idx !== activeImage}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${idx + 1} of ${IMAGE_COUNT}`}
                    style={{ width: `${100 / IMAGE_COUNT}%` }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading={idx === activeImage ? 'eager' : 'lazy'}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    {/* translucent caption top-left */}
                    {idx === activeImage && (
                      <div className="absolute top-3 left-3 bg-black/30 text-white rounded-md px-3 py-1 text-xs">
                        <div className="font-medium">Chef Byte Pro Tip</div>
                        <div className="mt-0.5 text-[11px]">Try: "What can I make with chicken and rice?"</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-white/40 dark:bg-black/40 backdrop-blur-sm rounded-full py-1 px-2">
                {heroImages.map((_i, ii) => (
                  <button
                    key={ii}
                    onClick={() => userSetActive(ii)}
                    aria-label={`Show image ${ii + 1}`}
                    className={`w-2 h-2 rounded-full transition-all ${ii === activeImage ? 'scale-125 bg-amber-500' : 'bg-white/60 dark:bg-gray-400/40'}`}
                  />
                ))}
              </div>

              {/* left/right overlay buttons for desktop (visually subtle, accessible) */}
              <button
                onClick={() => {
                  setIsPaused(true);
                  prev();
                }}
                aria-label="Previous image"
                className="hidden md:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 text-white hover:bg-black/30 transition"
              >
                ‹
              </button>
              <button
                onClick={() => {
                  setIsPaused(true);
                  next();
                }}
                aria-label="Next image"
                className="hidden md:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 text-white hover:bg-black/30 transition"
              >
                ›
              </button>
            </div>
          </div>

          {/* right: controls */}
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

            {/* small gallery */}
            <div className="mt-4">
              <div className="hidden sm:grid grid-cols-3 gap-2">
                {heroImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => userSetActive(i)}
                    className={`overflow-hidden rounded-lg border w-full ${i === activeImage ? 'ring-2 ring-amber-300' : 'border-gray-100 dark:border-gray-700'}`}
                    aria-label={`Open image ${i + 1}`}
                  >
                    <img src={img.src} alt={img.alt} className="w-full h-20 object-cover" loading="lazy" draggable={false} />
                  </button>
                ))}
              </div>

              <div className="sm:hidden mt-2">
                <div className="flex gap-2 overflow-x-auto px-1 py-1 hide-scrollbar">
                  {heroImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => userSetActive(i)}
                      className={`flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden ${i === activeImage ? 'ring-2 ring-amber-300' : ''}`}
                      aria-label={`Open image ${i + 1}`}
                    >
                      <img src={img.src} alt={img.alt} className="w-full h-full object-cover" loading="lazy" draggable={false} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* footer */}
        <footer className="mt-8 relative z-10 text-sm text-gray-400">Built with ❤️ for food lovers</footer>
      </div>
    </main>
  );
}
