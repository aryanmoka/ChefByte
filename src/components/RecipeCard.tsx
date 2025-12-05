// frontend/src/components/RecipeCard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Users, Copy, Check } from 'lucide-react';

interface Recipe {
  title: string;
  description?: string;
  image?: string; // optional image url (AI may provide)
  ingredients: string[];
  instructions: string[];
  prep_time?: string;
  cook_time?: string;
  servings?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
}

/**
 * Minimal RecipeCard
 * - Single "Copy ingredients" action (accessible)
 * - Optional image header
 * - Collapsible instructions for small screens
 * - Gentle mount animation using data-mounted attribute
 * - Defensive: handles missing arrays gracefully
 */
const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // mount & idle rendering
  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const idleCallbackId = useRef<number | null>(null);
  const clearTimer = useRef<number | null>(null);

  // small-screen instructions collapse
  const [expandedInstructions, setExpandedInstructions] = useState(false);

  const safeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const safeInstructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];

  useEffect(() => {
    mountedRef.current = true;
    const raf = window.requestAnimationFrame(() => setMounted(true));

    if ('requestIdleCallback' in window) {
      // @ts-ignore
      idleCallbackId.current = (window as any).requestIdleCallback(
        () => { if (mountedRef.current) setShowFullContent(true); },
        { timeout: 300 }
      );
    } else {
      idleCallbackId.current = window.setTimeout(() => {
        if (mountedRef.current) setShowFullContent(true);
      }, 150);
    }

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(raf);
      if (idleCallbackId.current != null) {
        if ('cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(idleCallbackId.current);
        } else {
          window.clearTimeout(idleCallbackId.current);
        }
      }
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, []);

  const scheduleClearMessage = (timeout = 2200) => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => {
      if (mountedRef.current) setStatusMessage(null);
    }, timeout);
  };

  const ingredientsList = useMemo(() => safeIngredients.join('\n'), [safeIngredients]);

  const copyIngredients = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ingredientsList || recipe.title);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = ingredientsList || recipe.title;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('Copy command failed');
      }

      if (!mountedRef.current) return;
      setCopied(true);
      setStatusMessage('Ingredients copied to clipboard');
      scheduleClearMessage();
      window.setTimeout(() => { if (mountedRef.current) setCopied(false); }, 1500);
    } catch (err) {
      console.error('Failed to copy ingredients:', err);
      if (!mountedRef.current) return;
      setStatusMessage('Unable to copy. Please copy manually.');
      scheduleClearMessage();
    }
  };

  // show only first N instructions when collapsed on smaller screens
  const COLLAPSE_COUNT = 3;
  const collapsedInstructions = safeInstructions.slice(0, COLLAPSE_COUNT);

  return (
    <article
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-w-full transform transition-all duration-250"
      aria-labelledby="recipe-title"
      data-mounted={mounted ? 'true' : 'false'}
    >
      {/* Optional image */}
      {recipe.image ? (
        <div className="w-full h-44 sm:h-56 md:h-64 overflow-hidden bg-gray-100 dark:bg-gray-900">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover object-center"
            loading="lazy"
            // defensive onError: hide broken images gracefully
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : null}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sm:p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 id="recipe-title" className="text-lg sm:text-xl md:text-2xl font-bold mb-1 truncate">
              {recipe.title}
            </h3>
            {recipe.description && (
              <p className="text-orange-100 text-sm leading-snug line-clamp-2">
                {recipe.description}
              </p>
            )}
          </div>

          <div className="ml-2 flex-shrink-0 flex items-center gap-3 text-sm">
            {(recipe.prep_time || recipe.cook_time || recipe.servings) && (
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/95">
                {recipe.prep_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> <span>Prep: {recipe.prep_time}</span>
                  </div>
                )}
                {recipe.cook_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> <span>Cook: {recipe.cook_time}</span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> <span>{recipe.servings}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6">
        {/* screen-reader visible status */}
        <div className="sr-only" aria-live="polite">{statusMessage}</div>

        <div className="recipe-enter-inner" data-mounted={mounted ? 'true' : 'false'}>
          {/* Ingredients */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3 gap-3">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Ingredients</h4>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyIngredients}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  aria-label={copied ? 'Ingredients copied' : 'Copy ingredients'}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {/* Visible toast for sighted users (small) */}
                {statusMessage && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-2 hidden sm:block">
                    {statusMessage}
                  </div>
                )}
              </div>
            </div>

            {!showFullContent ? (
              <div className="space-y-2">
                {safeIngredients.slice(0, 3).map((_, i) => (
                  <div key={i} className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full animate-pulse" />
                ))}
                {safeIngredients.length > 3 && (
                  <div className="text-xs text-gray-400 mt-2">Loading ingredients…</div>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {safeIngredients.length === 0 ? (
                  <li className="text-sm text-gray-500 dark:text-gray-400">No ingredients provided.</li>
                ) : (
                  safeIngredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <span className="text-orange-500 mt-1">•</span>
                      <span className="leading-relaxed break-words">{ingredient}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Instructions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Instructions</h4>
              {/* show collapse toggle on small screens when many steps */}
              {safeInstructions.length > COLLAPSE_COUNT && (
                <button
                  onClick={() => setExpandedInstructions(s => !s)}
                  className="text-xs text-amber-600 dark:text-amber-300 underline underline-offset-2"
                  aria-expanded={expandedInstructions}
                >
                  {expandedInstructions ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            {!showFullContent ? (
              <div className="space-y-3">
                {[0, 1].map(i => (
                  <div key={i} className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full animate-pulse" />
                ))}
                <div className="text-xs text-gray-400 mt-2">Preparing instructions…</div>
              </div>
            ) : (
              <ol className="space-y-3 list-none p-0 m-0">
                {safeInstructions.length === 0 ? (
                  <li className="text-sm text-gray-500 dark:text-gray-400">No instructions provided.</li>
                ) : (
                  // choose display list based on expanded state on small screens
                  (expandedInstructions ? safeInstructions : (safeInstructions.length > COLLAPSE_COUNT ? collapsedInstructions : safeInstructions))
                    .map((instruction, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white text-sm font-medium rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="leading-relaxed break-words">{instruction}</span>
                      </li>
                    ))
                )}
                {/* if collapsed, show a small hint to expand */}
                {!expandedInstructions && safeInstructions.length > COLLAPSE_COUNT && (
                  <li>
                    <button
                      onClick={() => setExpandedInstructions(true)}
                      className="text-sm text-amber-600 dark:text-amber-300 underline"
                    >
                      Show all steps
                    </button>
                  </li>
                )}
              </ol>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* mount animation: fade+lift when data-mounted=true */
        article[data-mounted="false"] .recipe-enter-inner {
          opacity: 0;
          transform: translateY(6px);
        }
        article[data-mounted="true"] .recipe-enter-inner {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 220ms ease, transform 220ms ease;
        }
      `}</style>
    </article>
  );
};

export default RecipeCard;
