/**
 * One card for every kind of recipe in the app:
 *   - my recipes        (has _id)
 *   - TheMealDB meals   (has mealdbId, maybe only title + image)
 *   - match results     (has matchPercent + missingIngredients)
 */
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Img, MatchRing, SourceBadge, Stars } from './ui';

export function recipeLink(recipe) {
  const id = recipe._id || recipe.id;
  return id ? `/recipes/${id}` : `/meals/${recipe.mealdbId}`;
}

export default function RecipeCard({ recipe, onSave, saved, saving, showSource = true, className = '' }) {
  const isMatch = typeof recipe.matchPercent === 'number';
  const source = recipe.source === 'mealdb' && (recipe._id || recipe.id) && !isMatch ? 'saved' : recipe.source;
  const missing = recipe.missingIngredients || [];

  return (
    <Link to={recipeLink(recipe)} className={`tile tile--flush tile--interactive recipe-card ${className}`}>
      <div className="recipe-card__media">
        <Img src={recipe.image} alt="" />
        {showSource && source && (
          <div className="media-badges">
            <SourceBadge source={source} />
          </div>
        )}
        {onSave && (
          <button
            type="button"
            className={`icon-btn icon-btn--glass save-btn ${saved ? 'icon-btn--active' : ''}`}
            aria-label={saved ? 'Saved' : 'Save to My Recipes'}
            disabled={saving}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!saved) onSave(recipe);
            }}
          >
            {saving ? <span className="spinner" /> : saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
        )}
      </div>

      <div className="recipe-card__body">
        <h3 className="recipe-card__title clamp-2">{recipe.title}</h3>
        {(recipe.category || recipe.area) && (
          <div className="recipe-card__meta">
            {[recipe.category, recipe.area].filter(Boolean).join(' · ')}
          </div>
        )}

        {isMatch && (
          <div className="recipe-card__foot">
            <div className="stack" style={{ gap: 4 }}>
              <span className="small" style={{ fontWeight: 600 }}>
                {recipe.matchedCount}/{recipe.totalIngredients} ingredients
              </span>
              {missing.length > 0 && (
                <span className="caption clamp-2">
                  Need: {missing.slice(0, 3).map((m) => m.name).join(', ')}
                  {missing.length > 3 && ` +${missing.length - 3} more`}
                </span>
              )}
            </div>
            <MatchRing percent={recipe.matchPercent} size={56} stroke={6} />
          </div>
        )}

        {!isMatch && recipe.rating ? (
          <div className="mt-auto">
            <Stars value={recipe.rating} size={16} />
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function RecipeCardSkeleton() {
  return (
    <div className="tile tile--flush recipe-card" aria-hidden>
      <div className="recipe-card__media skeleton" style={{ borderRadius: 0 }} />
      <div className="recipe-card__body">
        <div className="skeleton" style={{ height: 20, width: '80%' }} />
        <div className="skeleton" style={{ height: 14, width: '45%' }} />
      </div>
    </div>
  );
}
