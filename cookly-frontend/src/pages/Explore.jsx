/**
 * Explore TheMealDB by name, ingredient, category or cuisine.
 * The mode and query live in the URL (?mode=category&q=Seafood).
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Type, Carrot, LayoutGrid, Globe2 } from 'lucide-react';
import { mealsApi, recipesApi } from '../api';
import useAsync from '../hooks/useAsync';
import useRecipeActions from '../hooks/useRecipeActions';
import useDocumentTitle from '../hooks/useDocumentTitle';
import RecipeCard, { RecipeCardSkeleton } from '../components/RecipeCard';
import { Button, EmptyState, Img, Segmented } from '../components/ui';

const MODES = [
  { value: 'name', label: 'By name', icon: <Type size={16} /> },
  { value: 'ingredient', label: 'By ingredient', icon: <Carrot size={16} /> },
  { value: 'category', label: 'By category', icon: <LayoutGrid size={16} /> },
  { value: 'area', label: 'By cuisine', icon: <Globe2 size={16} /> },
];

// Cuisines that actually have recipes in TheMealDB (checked against the live API).
// The backend also searches each one's country name ("Indian" + "India").
const AREAS = [
  'Algerian', 'American', 'Argentine', 'Australian', 'Brazilian', 'British', 'Canadian', 'Chinese', 'Croatian',
  'Dutch', 'Egyptian', 'Filipino', 'French', 'Greek', 'Indian', 'Irish', 'Italian', 'Jamaican', 'Japanese',
  'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 'Norwegian', 'Polish', 'Portuguese', 'Russian', 'Saudi Arabian',
  'Spanish', 'Syrian', 'Thai', 'Tunisian', 'Turkish', 'Ukrainian', 'Uruguayan', 'Venezuelan', 'Vietnamese',
];

const FETCHERS = {
  name: mealsApi.search,
  ingredient: mealsApi.byIngredient,
  category: mealsApi.byCategory,
  area: mealsApi.byArea,
};

export default function Explore() {
  useDocumentTitle('Explore');
  const [params, setParams] = useSearchParams();
  const mode = MODES.some((m) => m.value === params.get('mode')) ? params.get('mode') : 'name';
  const defaults = { name: 'chicken', ingredient: 'garlic', category: 'Seafood', area: 'Italian' };
  const q = params.get('q') || defaults[mode];

  const [draft, setDraft] = useState(q);
  useEffect(() => {
    setDraft(q);
  }, [q]);

  const { saveMeal } = useRecipeActions();
  const [savedIds, setSavedIds] = useState({});
  const [savingId, setSavingId] = useState(null);

  // Which meals have I already saved? (first 50 is plenty for bookmark icons)
  useEffect(() => {
    recipesApi
      .list({ source: 'mealdb', limit: 50 })
      .then(({ results }) => setSavedIds(Object.fromEntries(results.map((r) => [r.mealdbId, true]))))
      .catch(() => {});
  }, []);

  const categories = useAsync(() => mealsApi.categories(), []);
  const results = useAsync(() => FETCHERS[mode](q), [mode, q]);

  const setMode = (m) => setParams({ mode: m });
  const runSearch = (value) => value.trim() && setParams({ mode, q: value.trim() });

  const onSave = async (meal) => {
    setSavingId(meal.mealdbId);
    try {
      if (await saveMeal(meal)) setSavedIds((s) => ({ ...s, [meal.mealdbId]: true }));
    } catch {
      /* toast already shown */
    }
    setSavingId(null);
  };

  const featured = mode === 'category' && categories.data?.results.find((c) => c.name.toLowerCase() === q.toLowerCase());
  const list = results.data?.results || [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Explore recipes</h1>
          <p className="muted">Hundreds of meals from TheMealDB. Bookmark the ones you like.</p>
        </div>
      </div>

      <div className="explore-controls">
        <Segmented options={MODES} value={mode} onChange={setMode} label="Search mode" />

        {(mode === 'name' || mode === 'ingredient') && (
          <form
            className="explore-search"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(draft);
            }}
          >
            <div className="input-icon">
              <Search size={18} />
              <input
                className="input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={mode === 'name' ? 'Search meals, e.g. lasagne' : 'One ingredient, e.g. chicken breast'}
                aria-label="Search"
                maxLength={60}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        )}

        {mode === 'category' && (
          <div className="row row--wrap">
            {(categories.data?.results || []).map((c) => (
              <button
                key={c.id}
                className={`chip chip--button ${c.name.toLowerCase() === q.toLowerCase() ? 'chip--active' : ''}`}
                onClick={() => runSearch(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {mode === 'area' && (
          <div className="row row--wrap">
            {AREAS.map((a) => (
              <button
                key={a}
                className={`chip chip--button ${a.toLowerCase() === q.toLowerCase() ? 'chip--active' : ''}`}
                onClick={() => runSearch(a)}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {featured && (
        <section className="bento" style={{ marginBottom: 'var(--gutter)' }}>
          <div className="tile tile--tint-saffron span-12 row-auto category-feature">
            <Img src={featured.image} alt="" />
            <div className="stack">
              <span className="eyebrow">Category</span>
              <h2>{featured.name}</h2>
              <p className="muted clamp-2" style={{ WebkitLineClamp: 3 }}>
                {featured.description}
              </p>
            </div>
          </div>
        </section>
      )}

      {results.loading ? (
        <div className="card-grid">
          {Array.from({ length: 8 }, (_, n) => (
            <RecipeCardSkeleton key={n} />
          ))}
        </div>
      ) : results.error ? (
        <div className="tile">
          <EmptyState emoji="😕" title="Couldn't load recipes" action={<Button onClick={results.reload}>Try again</Button>}>
            {results.error.message}
          </EmptyState>
        </div>
      ) : list.length === 0 ? (
        <div className="tile">
          <EmptyState emoji="🔍" title={`No meals found for "${q}"`}>
            {mode === 'ingredient'
              ? "TheMealDB doesn't have any recipes with this ingredient yet. Try a related one, or add your own recipe."
              : 'Try something else, or browse by category.'}
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="muted small" style={{ marginBottom: 12 }}>
            {list.length} meal{list.length === 1 ? '' : 's'}
          </p>
          <div className="card-grid">
            {list.map((meal) => (
              <RecipeCard
                key={meal.mealdbId}
                recipe={meal}
                showSource={false}
                onSave={onSave}
                saved={savedIds[meal.mealdbId]}
                saving={savingId === meal.mealdbId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
