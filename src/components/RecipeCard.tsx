// frontend/src/components/RecipeCard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Users, Copy, Check, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { chatAPI } from '../services/api';

interface Recipe {
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  prep_time?: string;
  cook_time?: string;
  servings?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  sessionId: string;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, sessionId }) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, []);

  const scheduleClearMessage = (timeout = 2500) => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => {
      if (mountedRef.current) {
        setStatusMessage(null);
      }
    }, timeout);
  };

  // memoize ingredients joined text for copy and performance
  const ingredientsList = useMemo(() => recipe.ingredients.join('\n'), [recipe.ingredients]);

  // Copy to clipboard with fallback
  const copyIngredients = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ingredientsList);
      } else {
        // fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = ingredientsList;
        textarea.style.position = 'fixed'; // avoid reflow
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
      window.setTimeout(() => {
        if (mountedRef.current) setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy ingredients:', err);
      if (!mountedRef.current) return;
      setStatusMessage('Unable to copy. Please copy manually.');
      scheduleClearMessage();
    }
  };

  // Save recipe via API (defensive and shows feedback)
  const saveRecipe = async () => {
    if (!sessionId) {
      setStatusMessage('Unable to save: missing session');
      scheduleClearMessage();
      return;
    }
    if (saved) {
      setStatusMessage('Recipe already saved');
      scheduleClearMessage();
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      // Expect chatAPI.saveRecipe to return { success: boolean, message?: string }
      const res = await chatAPI.saveRecipe(sessionId, recipe);

      const success = res?.success ?? false;
      const serverMsg = res?.message ?? null;

      if (success) {
        if (!mountedRef.current) return;
        setSaved(true);
        setStatusMessage('Recipe saved');
        scheduleClearMessage();
      } else {
        throw new Error(serverMsg || 'Save failed');
      }
    } catch (err: any) {
      console.error('Failed to save recipe:', err);
      if (!mountedRef.current) return;
      setStatusMessage(typeof err === 'string' ? err : err?.message ?? 'Failed to save recipe');
      scheduleClearMessage();
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <article
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      aria-labelledby="recipe-title"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sm:p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 id="recipe-title" className="text-xl sm:text-2xl font-bold mb-1 truncate">
              {recipe.title}
            </h3>
            {recipe.description && (
              <p className="text-orange-100 text-sm truncate">{recipe.description}</p>
            )}
          </div>

          {/* Save button */}
          <div className="ml-2 flex-shrink-0">
            <button
              onClick={saveRecipe}
              disabled={saving || saved}
              aria-pressed={saved}
              aria-label={saved ? 'Recipe saved' : 'Save recipe'}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : saved ? (
                <BookmarkCheck className="h-5 w-5" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 mt-3 text-sm items-center">
          {recipe.prep_time && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4" />
              <span>Prep: {recipe.prep_time}</span>
            </div>
          )}
          {recipe.cook_time && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4" />
              <span>Cook: {recipe.cook_time}</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-4 w-4" />
              <span>Serves: {recipe.servings}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6">
        {/* Status (ARIA live) */}
        <div className="sr-only" aria-live="polite">
          {statusMessage}
        </div>

        {/* Ingredients */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Ingredients</h4>

            <div className="flex items-center gap-2">
              <button
                onClick={copyIngredients}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
                aria-label={copied ? 'Ingredients copied' : 'Copy ingredients'}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              {/* small visual feedback */}
              {statusMessage && (
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-2 hidden sm:block">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>

          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
              >
                <span className="text-orange-500 mt-1">•</span>
                <span className="leading-relaxed break-words">{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Instructions</h4>
          <ol className="space-y-3 list-none p-0 m-0">
            {recipe.instructions.map((instruction, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
              >
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white text-sm font-medium rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </article>
  );
};

export default RecipeCard;
