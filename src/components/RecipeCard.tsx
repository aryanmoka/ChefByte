// frontend/src/components/RecipeCard.tsx
import React, { useState } from 'react';
import { Clock, Users, Copy, Check } from 'lucide-react';

interface Recipe {
  title: string;
  description?: string;
  image?: string;
  ingredients: string[];
  instructions: string[];
  prep_time?: string;
  cook_time?: string;
  servings?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  sessionId?: string; // Kept for compatibility if passed, though unused here
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const [copied, setCopied] = useState(false);
  const [expandedInstructions, setExpandedInstructions] = useState(false);

  // Defensive checks
  const safeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const safeInstructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];

  const copyIngredients = async () => {
    try {
      const textToCopy = safeIngredients.join('\n') || recipe.title;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Logic to show limited instructions initially
  const COLLAPSE_COUNT = 3;
  const showAllInstructions = expandedInstructions || safeInstructions.length <= COLLAPSE_COUNT;
  const visibleInstructions = showAllInstructions ? safeInstructions : safeInstructions.slice(0, COLLAPSE_COUNT);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mt-2">
      
      {/* 1. IMAGE HEADER (Optional) */}
      {recipe.image && (
        <div className="w-full h-48 sm:h-56 bg-gray-100 dark:bg-gray-900 relative">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* 2. TITLE & META HEADER */}
      <div className="p-5 bg-gradient-to-r from-orange-500 to-amber-600 text-white">
        <h3 className="text-xl font-bold leading-tight mb-2">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-orange-50 text-sm leading-relaxed opacity-90 mb-3">
            {recipe.description}
          </p>
        )}
        
        {/* Meta tags (Time, Servings) */}
        {(recipe.prep_time || recipe.cook_time || recipe.servings) && (
          <div className="flex flex-wrap gap-4 text-xs font-medium mt-2 pt-2 border-t border-white/20">
            {recipe.prep_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Prep: {recipe.prep_time}</span>
              </div>
            )}
            {recipe.cook_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Cook: {recipe.cook_time}</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Servings: {recipe.servings}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. CONTENT BODY */}
      <div className="p-5 space-y-6">
        
        {/* INGREDIENTS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-orange-500 rounded-full"></span>
              Ingredients
            </h4>
            <button
              onClick={copyIngredients}
              className="text-xs flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          
          <ul className="grid grid-cols-1 gap-2">
            {safeIngredients.length > 0 ? (
              safeIngredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="leading-relaxed">{ing}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-400 italic">No ingredients listed.</li>
            )}
          </ul>
        </div>

        {/* INSTRUCTIONS SECTION */}
        <div>
           <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
              Instructions
           </h4>
           
           <div className="space-y-4">
             {visibleInstructions.length > 0 ? (
               visibleInstructions.map((step, i) => (
                 <div key={i} className="flex gap-3 text-sm group">
                   <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center text-xs mt-0.5 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                     {i + 1}
                   </div>
                   <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-0.5">
                     {step}
                   </p>
                 </div>
               ))
             ) : (
               <p className="text-sm text-gray-400 italic">No instructions listed.</p>
             )}
           </div>

           {/* Expand/Collapse Button */}
           {!showAllInstructions && (
             <button 
               onClick={() => setExpandedInstructions(true)}
               className="mt-4 w-full py-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded transition-colors"
             >
               Show Full Recipe ({safeInstructions.length - COLLAPSE_COUNT} more steps)
             </button>
           )}
           {expandedInstructions && safeInstructions.length > COLLAPSE_COUNT && (
              <button 
              onClick={() => setExpandedInstructions(false)}
              className="mt-4 w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Show Less
            </button>
           )}
        </div>

      </div>
    </div>
  );
};

export default RecipeCard;