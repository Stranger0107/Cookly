/**
 * My Recipes: my own + saved recipes with search, filters and pagination.
 * Filters live in the URL (?search=egg&source=user&page=2) so the back button works.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, BookOpen, PencilLine, BookmarkCheck } from 'lucide-react';
import { mealsApi, recipesApi } from '../api';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import RecipeCard, { RecipeCardSkeleton } from '../components/RecipeCard';
import { Button, EmptyState, Pagination, Skeleton } from '../components/ui';

const LIMIT = 12;
const SOURCES = [
  { value: '', label: 'All' },
  { value: 'user', label: 'My own' },
  { value: 'mealdb', label: 'Saved from TheMealDB' },
];

export default function MyRecipes() {
  useDocumentTitle('My Recipes');
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const source = params.get('source') || '';
  const page = Number(params.get('page')) || 1;

  const [draft, setDraft] = useState(search);
  useEffect(() => {
    setDraft(search);
  }, [search]);

  // Update one filter and go back to page 1.
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  // Debounced search: wait until typing pauses before hitting the API.
  useEffect(() => {
    if (draft === search) return undefined;
    const t = setTimeout(() => setFilter('search', draft.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const list = useAsync(
    () => recipesApi.list({ search: search || undefined, category: category || undefined, source: source || undefined, page, limit: LIMIT }),
    [search, category, source, page]
  );
  const counts = useAsync(
    () =>
      Promise.all([
        recipesApi.list({ limit: 1 }),
        recipesApi.list({ source: 'user', limit: 1 }),
        recipesApi.list({ source: 'mealdb', limit: 1 }),
      ]).then((res) => res.map((r) => r.pagination.total)),
    []
  );
  const categories = useAsync(() => mealsApi.categories(), []);

  const filtered = Boolean(search || category || source);
  const results = list.data?.results || [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>My Recipes</h1>
          <p className="muted">Everything you've written or saved, in one cookbook.</p>
        </div>
        <Link to="/recipes/new" className="btn btn--primary">
          <Plus size={18} /> New recipe
        </Link>
      </div>

      <div className="stat-strip">
        {[
          { icon: BookOpen, label: 'Total recipes' },
          { icon: PencilLine, label: 'My own' },
          { icon: BookmarkCheck, label: 'Saved' },
        ].map(({ icon: Icon, label }, i) => (
          <div key={label} className="tile">
            <span className="stat__icon">
              <Icon size={20} />
            </span>
            <div>
              {counts.data ? <div className="num">{counts.data[i]}</div> : <Skeleton height={32} width={40} />}
              <div className="caption">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar glass">
        <div className="input-icon">
          <Search size={18} />
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search by title or ingredient"
            aria-label="Search my recipes"
            maxLength={100}
          />
        </div>
        <select className="select" value={category} onChange={(e) => setFilter('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {(categories.data?.results || []).map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="row row--wrap" role="group" aria-label="Source">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              className={`chip chip--button ${source === s.value ? 'chip--active' : ''}`}
              onClick={() => setFilter('source', s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {list.loading ? (
        <div className="card-grid">
          {Array.from({ length: 8 }, (_, n) => (
            <RecipeCardSkeleton key={n} />
          ))}
        </div>
      ) : list.error ? (
        <div className="tile">
          <EmptyState emoji="😕" title="Couldn't load your recipes" action={<Button onClick={list.reload}>Try again</Button>}>
            {list.error.message}
          </EmptyState>
        </div>
      ) : results.length === 0 ? (
        <div className="tile">
          {filtered ? (
            <EmptyState
              emoji="🔍"
              title="No recipes match those filters"
              action={
                <Button variant="secondary" onClick={() => setParams({})}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              emoji="📖"
              title="Your cookbook is empty"
              action={
                <div className="row row--wrap" style={{ justifyContent: 'center' }}>
                  <Link to="/explore" className="btn btn--primary">
                    Explore recipes
                  </Link>
                  <Link to="/recipes/new" className="btn btn--secondary">
                    Write your own
                  </Link>
                </div>
              }
            >
              Save meals from TheMealDB or write down your own favourites.
            </EmptyState>
          )}
        </div>
      ) : (
        <>
          <div className="card-grid">
            {results.map((r) => (
              <RecipeCard key={r._id} recipe={r} />
            ))}
          </div>
          <Pagination pagination={list.data.pagination} onPage={(p) => setFilter('page', String(p))} />
        </>
      )}
    </div>
  );
}
