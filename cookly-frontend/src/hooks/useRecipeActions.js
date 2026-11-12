/**
 * Actions shared by several pages: saving a TheMealDB meal and adding a
 * recipe's missing ingredients to the shopping list.
 *
 * The backend's "from-recipe" endpoint only works with recipes in MY
 * collection, so for a TheMealDB meal we save it first (or find the copy
 * I already saved) and then add the missing items, as one smooth action.
 */
import { useCallback } from 'react';
import { recipesApi, shoppingListApi } from '../api';
import { useToast } from '../context/ToastContext';

/** Find my saved copy of a TheMealDB meal, if there is one. */
export async function findSavedCopy(mealdbId, title) {
  const { results } = await recipesApi.list({ source: 'mealdb', search: title.slice(0, 100), limit: 50 });
  return results.find((r) => r.mealdbId === String(mealdbId)) || null;
}

export function addedMessage({ added = [], skipped = [] }) {
  if (!added.length && !skipped.length) return 'Nothing to add: you have everything!';
  if (!added.length) return 'Those items are already on your list';
  const base = `Added ${added.length} item${added.length === 1 ? '' : 's'} to your list`;
  return skipped.length ? `${base} · ${skipped.length} already there` : base;
}

export default function useRecipeActions() {
  const toast = useToast();

  /** Save a TheMealDB meal. Resolves with my saved recipe (new or existing). */
  const saveMeal = useCallback(
    async ({ mealdbId, title }, { quiet = false } = {}) => {
      try {
        const { recipe } = await recipesApi.saveFromMealDb(mealdbId);
        if (!quiet) toast.success(`Saved "${recipe.title}" to My Recipes`);
        return recipe;
      } catch (err) {
        if (err.status === 409) {
          if (!quiet) toast.info('You already saved this recipe');
          return findSavedCopy(mealdbId, title);
        }
        toast.error(err.message);
        err.toasted = true;
        throw err;
      }
    },
    [toast]
  );

  /**
   * Add the ingredients I'm missing to the shopping list.
   * `recipe` can be one of my recipes ({ id/_id }) or a TheMealDB meal ({ mealdbId, title }).
   */
  const addMissingToList = useCallback(
    async (recipe, pantry) => {
      try {
        let recipeId = recipe._id || recipe.id;
        if (!recipeId) {
          const saved = await saveMeal(recipe, { quiet: true });
          recipeId = saved?._id;
          if (!recipeId) throw new Error('Could not save this recipe first');
        }
        const result = await shoppingListApi.addFromRecipe(recipeId, { ingredients: pantry });
        toast.success(addedMessage(result));
        return { ...result, recipeId };
      } catch (err) {
        if (!err.toasted) toast.error(err.message);
        return null;
      }
    },
    [saveMeal, toast]
  );

  return { saveMeal, addMissingToList };
}
