/**
 * "What can I make?" results.
 * The search lives in the URL (/match?i=egg,onion&mealdb=0) so results can
 * be bookmarked, shared and survive a refresh.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, AlertTriangle, ShoppingBasket, Bookmark, BookmarkCheck, ArrowRight } from 'lucide-react';
import { matchApi } from '../api';
import useAsync from '../hooks/useAsync';
import usePantry from '../hooks/usePantry';
import useRecipeActions from '../hooks/useRecipeActions';
import useDocumentTitle from '../hooks/useDocumentTitle';
import ChipInput from '../components/ChipInput';
import RecipeCard, { RecipeCardSkeleton, recipeLink } from '../components/RecipeCard';
import { Banner, Button, EmptyState, Img, MatchRing, SourceBadge, Switch, TierBadge } from '../components/ui';
import { matchTier } from '../utils/ingredients';
import { matchUrl } from './Home';

const TIERS = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready to cook' },
  { key: 'almost', label: 'Almost there' },
  { key: 'shop', label: 'Needs a shop' },
];

function HeroResult({ result, pantry, saved, onSave, onSaved, saving }) {
  const { addMissingToList } = useRecipeActions();
  const [adding, setAdding] = useState(false);
  const missing = result.missingIngredients;

  const addMissing = async () => {
    setAdding(true);
    const added = await addMissingToList(result, pantry);
    // Adding a TheMealDB meal's items saves it first, so reflect that.
    if (added && result.source === 'mealdb') onSaved(result.mealdbId);
    setAdding(false);
  };

  return (
    <div className="tile tile--flush match-hero span-8 row-2">
      <Link to={recipeLink(result)} className="match-hero__media" aria-label={result.title}>
        <Img src={result.image} alt="" />
        <div className="photo-tile__top">
          <span className="badge badge--ready">Best match</span>
          <SourceBadge source={result.source} />
        </div>
      </Link>
      <div className="match-hero__body">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div className="caption">{[result.category, result.area].filter(Boolean).join(' · ')}</div>
            <h2 style={{ marginTop: 4 }}>{result.title}</h2>
          </div>
          <MatchRing percent={result.matchPercent} size={84} stroke={8} sub={`${result.matchedCount}/${result.totalIngredients}`} />
        </div>
        <TierBadge percent={result.matchPercent} />

        <div className="stack" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 700 }}>You have</span>
          <div className="chips">
            {result.matchedIngredients.map((name) => (
              <span key={name} className="chip chip--have chip--sm">✓ {name}</span>
            ))}
          </div>
        </div>
        {missing.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="small" style={{ fontWeight: 700 }}>You need</span>
            <div className="chips">
              {missing.map((m) => (
                <span key={m.name} className="chip chip--missing chip--sm">{m.name}</span>
              ))}
            </div>
          </div>
        )}

        <div className="row row--wrap mt-auto">
          <Link to={recipeLink(result)} className="btn btn--primary">
            View recipe <ArrowRight size={16} />
          </Link>
          {missing.length > 0 && (
            <Button variant="secondary" onClick={addMissing} loading={adding}>
              <ShoppingBasket size={16} /> Add missing to list
            </Button>
          )}
          {result.source === 'mealdb' && (
            <Button variant="ghost" onClick={() => onSave(result)} disabled={saved} loading={saving}>
              {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {saved ? 'Saved' : 'Save'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatchResults() {
  useDocumentTitle('What can I make?');
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [storedPantry, setStoredPantry] = usePantry();
  const { saveMeal } = useRecipeActions();

  const urlIngredients = (params.get('i') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const includeMealDb = params.get('mealdb') !== '0';
  const assumeStaples = params.get('staples') !== '0';

  // Editable copy for the search bar; applied to the URL on "Search again".
  const [draft, setDraft] = useState(urlIngredients.length ? urlIngredients : storedPantry);
  const [draftMealDb, setDraftMealDb] = useState(includeMealDb);
  const [draftStaples, setDraftStaples] = useState(assumeStaples);
  const [tier, setTier] = useState('all');
  const [sort, setSort] = useState('match');
  const [savedIds, setSavedIds] = useState({});
  const [savingId, setSavingId] = useState(null);

  const key = urlIngredients.join(',');
  const { data, error, loading } = useAsync(
    () => matchApi.find({ ingredients: urlIngredients, includeMealDb, assumeStaples, limit: 30 }),
    [key, includeMealDb, assumeStaples],
    { enabled: urlIngredients.length > 0 }
  );

  const search = (e) => {
    e?.preventDefault();
    if (!draft.length) return;
    setStoredPantry(draft);
    navigate(matchUrl(draft, { includeMealDb: draftMealDb, assumeStaples: draftStaples }));
  };

  const onSave = async (result) => {
    setSavingId(result.mealdbId);
    try {
      const recipe = await saveMeal(result);
      if (recipe) setSavedIds((s) => ({ ...s, [result.mealdbId]: true }));
    } catch {
      /* toast already shown */
    }
    setSavingId(null);
  };

  const results = useMemo(() => {
    let list = data?.results || [];
    if (tier !== 'all') list = list.filter((r) => matchTier(r.matchPercent).key === tier);
    if (sort === 'missing') {
      list = [...list].sort((a, b) => a.missingIngredients.length - b.missingIngredients.length || b.matchPercent - a.matchPercent);
    }
    return list;
  }, [data, tier, sort]);

  const [hero, ...rest] = results;
  const pantryForActions = data?.pantry || urlIngredients;

  return (
    <div className="page">
      <form className="match-bar glass" onSubmit={search}>
        <ChipInput value={draft} onChange={setDraft} placeholder="Add ingredients you have…" />
        <div className="pantry-tile__options">
          <Switch checked={draftMealDb} onChange={setDraftMealDb} label="TheMealDB" />
          <Switch checked={draftStaples} onChange={setDraftStaples} label="Staples" />
        </div>
        <Button type="submit" disabled={!draft.length}>
          <Sparkles size={16} /> {urlIngredients.length ? 'Search again' : 'Find recipes'}
        </Button>
      </form>

      {!urlIngredients.length ? (
        <div className="tile">
          <EmptyState emoji="🧺" title="What's in your kitchen?">
            Add a few ingredients above, like eggs, onion and tomato, and we'll find recipes you can make.
          </EmptyState>
        </div>
      ) : loading ? (
        <>
          <p className="muted small" style={{ marginBottom: 16 }}>
            <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: -2, marginRight: 8 }} />
            Checking recipes for {urlIngredients.join(', ')}…
          </p>
          <div className="bento">
            <div className="tile span-8 row-2 skeleton" />
            <div className="tile span-4 skeleton" />
            <div className="tile span-4 skeleton" />
          </div>
          <div className="card-grid" style={{ marginTop: 'var(--gutter)' }}>
            {[1, 2, 3, 4].map((n) => (
              <RecipeCardSkeleton key={n} />
            ))}
          </div>
        </>
      ) : error ? (
        <div className="tile">
          <EmptyState emoji="😕" title="Couldn't search right now" action={<Button onClick={search}>Try again</Button>}>
            {error.message}
          </EmptyState>
        </div>
      ) : (
        <>
          {data.warnings?.map((w) => (
            <Banner key={w} icon={<AlertTriangle size={18} />}>
              {w}
            </Banner>
          ))}

          <div className="filters">
            <div className="row row--wrap" role="group" aria-label="Filter by match">
              {TIERS.map((t) => (
                <button key={t.key} type="button" className={`chip chip--button ${tier === t.key ? 'chip--active' : ''}`} onClick={() => setTier(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="row">
              <span className="muted small">
                {data.count} recipe{data.count === 1 ? '' : 's'}
              </span>
              <select className="select" style={{ width: 'auto', minHeight: 38, padding: '6px 12px' }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                <option value="match">Best match</option>
                <option value="missing">Fewest missing</option>
              </select>
            </div>
          </div>

          {!results.length ? (
            <div className="tile">
              <EmptyState emoji="🥄" title={data.count ? 'Nothing in this group' : 'No recipes use those ingredients yet'}>
                {data.count ? 'Try another filter.' : 'Try adding a few more, like rice, garlic or cheese.'}
              </EmptyState>
            </div>
          ) : (
            <>
              <section className="bento">
                <HeroResult
                  result={hero}
                  pantry={pantryForActions}
                  saved={savedIds[hero.mealdbId]}
                  saving={savingId === hero.mealdbId}
                  onSave={onSave}
                  onSaved={(mealdbId) => setSavedIds((s) => ({ ...s, [mealdbId]: true }))}
                />
                {rest.slice(0, 2).map((r) => (
                  <RecipeCard
                    key={r.id || r.mealdbId}
                    recipe={r}
                    className="span-4"
                    onSave={r.source === 'mealdb' ? onSave : undefined}
                    saved={savedIds[r.mealdbId]}
                    saving={savingId === r.mealdbId}
                  />
                ))}
              </section>
              {rest.length > 2 && (
                <div className="card-grid" style={{ marginTop: 'var(--gutter)' }}>
                  {rest.slice(2).map((r) => (
                    <RecipeCard
                      key={r.id || r.mealdbId}
                      recipe={r}
                      onSave={r.source === 'mealdb' ? onSave : undefined}
                      saved={savedIds[r.mealdbId]}
                      saving={savingId === r.mealdbId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
