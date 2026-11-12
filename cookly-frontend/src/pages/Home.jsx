/**
 * Home dashboard - the signature bento screen.
 * Every tile loads its own data, so one slow request never blocks the rest.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Shuffle, BookmarkCheck, PencilLine, ShoppingBasket, Carrot, ArrowRight, Check } from 'lucide-react';
import { mealsApi, recipesApi, shoppingListApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import usePantry from '../hooks/usePantry';
import useDocumentTitle from '../hooks/useDocumentTitle';
import ChipInput from '../components/ChipInput';
import RecipeCard, { RecipeCardSkeleton } from '../components/RecipeCard';
import { Button, EmptyState, Img, Skeleton, Switch } from '../components/ui';
import { ingredientEmoji } from '../utils/ingredients';

const SUGGESTIONS = ['Eggs', 'Onion', 'Tomato', 'Chicken', 'Rice', 'Garlic', 'Cheese', 'Pasta'];

export function matchUrl(ingredients, { includeMealDb = true, assumeStaples = true } = {}) {
  const params = new URLSearchParams({ i: ingredients.join(',') });
  if (!includeMealDb) params.set('mealdb', '0');
  if (!assumeStaples) params.set('staples', '0');
  return `/match?${params}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function PantryTile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pantry, setPantry] = usePantry();
  const [includeMealDb, setIncludeMealDb] = useState(true);
  const [assumeStaples, setAssumeStaples] = useState(true);

  const unused = SUGGESTIONS.filter((s) => !pantry.some((p) => p.toLowerCase() === s.toLowerCase()));

  const submit = (e) => {
    e.preventDefault();
    if (pantry.length) navigate(matchUrl(pantry, { includeMealDb, assumeStaples }));
  };

  return (
    <form className="tile glass span-8 row-2 pantry-tile" onSubmit={submit}>
      <div>
        <span className="eyebrow">
          {greeting()}, {user?.name?.split(' ')[0]}
        </span>
        <h1 style={{ marginTop: 6 }}>What's in your kitchen?</h1>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <ChipInput id="pantry" value={pantry} onChange={setPantry} placeholder="Type an ingredient and press Enter" />
        <div className="row row--between">
          <span className="caption">Press Enter or comma to add · {pantry.length}/10</span>
          {pantry.length > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPantry([])}>
              Clear
            </button>
          )}
        </div>
      </div>

      {unused.length > 0 && pantry.length < 10 && (
        <div className="suggestions" aria-label="Quick add">
          {unused.map((s) => (
            <button key={s} type="button" className="chip chip--button" onClick={() => setPantry([...pantry, s])}>
              {ingredientEmoji(s)} {s}
            </button>
          ))}
        </div>
      )}

      <div className="row row--wrap row--between mt-auto" style={{ gap: 16 }}>
        <div className="pantry-tile__options">
          <Switch checked={includeMealDb} onChange={setIncludeMealDb} label="Include TheMealDB recipes" />
          <Switch checked={assumeStaples} onChange={setAssumeStaples} label="I have salt, water & pepper" />
        </div>
        <Button type="submit" size="lg" disabled={!pantry.length}>
          <Sparkles size={18} /> Find recipes
        </Button>
      </div>
    </form>
  );
}

function RandomMealTile() {
  const { data, loading, reload } = useAsync(() => mealsApi.random(), []);
  const meal = data?.meal;

  return (
    <div className="tile photo-tile span-4 row-2 random-tile">
      {loading && !meal ? <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /> : <Img src={meal?.image} alt="" />}
      <div className="photo-tile__top">
        <span className="badge badge--mealdb">Random pick</span>
        <button className="icon-btn icon-btn--glass" onClick={reload} aria-label="Show another random meal" disabled={loading}>
          {loading ? <span className="spinner" /> : <Shuffle size={18} />}
        </button>
      </div>
      {meal && (
        <div className="photo-tile__caption">
          <div>
            <div className="caption">{[meal.category, meal.area].filter(Boolean).join(' · ')}</div>
            <div className="h3" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              {meal.title}
            </div>
          </div>
          <Link to={`/meals/${meal.mealdbId}`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>
            View recipe <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, to, tint }) {
  return (
    <Link to={to} className={`tile tile--interactive stat span-3 ${tint ? `tile--tint-${tint}` : ''}`}>
      <div className="row row--between">
        <span className="small muted" style={{ fontWeight: 600 }}>
          {label}
        </span>
        <span className="stat__icon">
          <Icon size={20} />
        </span>
      </div>
      {value === undefined ? <Skeleton height={48} width={64} /> : <span className="stat__value">{value}</span>}
    </Link>
  );
}

function ShoppingPreview({ list, onToggle }) {
  const items = (list?.items || []).filter((i) => !i.checked).slice(0, 5);
  return (
    <div className="tile span-4">
      <div className="tile-head">
        <h3>Shopping list</h3>
        <Link to="/shopping-list" className="link small">
          Open list
        </Link>
      </div>
      {!list ? (
        <div className="stack">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} height={36} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState emoji="🧺" title="All stocked up">
          Missing ingredients from recipes will show up here.
        </EmptyState>
      ) : (
        <ul className="ing-list">
          {items.map((item) => (
            <li key={item._id} className="list-item" style={{ padding: '8px 6px' }}>
              <button className="check" onClick={() => onToggle(item)} aria-label={`Mark ${item.name} as bought`}>
                <Check size={16} />
              </button>
              <div className="list-item__text" onClick={() => onToggle(item)}>
                <div className="list-item__name">{item.name}</div>
                {item.measure && <div className="list-item__sub">{item.measure}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Home() {
  useDocumentTitle('Home');
  const toast = useToast();
  const [pantry] = usePantry();

  const saved = useAsync(() => recipesApi.list({ source: 'mealdb', limit: 1 }), []);
  const own = useAsync(() => recipesApi.list({ source: 'user', limit: 1 }), []);
  const recent = useAsync(() => recipesApi.list({ limit: 8 }), []);
  const list = useAsync(() => shoppingListApi.get(), []);
  const categories = useAsync(() => mealsApi.categories(), []);

  const toBuy = list.data ? list.data.list.items.filter((i) => !i.checked).length : undefined;

  const toggleItem = async (item) => {
    try {
      const data = await shoppingListApi.toggle(item._id, true);
      list.setData(data);
      toast.success(`Ticked off ${item.name}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <section className="bento">
        <PantryTile />
        <RandomMealTile />
      </section>

      <section className="bento" aria-label="Your stats">
        <StatTile icon={BookmarkCheck} label="Saved recipes" value={saved.data?.pagination.total} to="/recipes?source=mealdb" />
        <StatTile icon={PencilLine} label="My own recipes" value={own.data?.pagination.total} to="/recipes?source=user" />
        <StatTile icon={ShoppingBasket} label="Items to buy" value={toBuy} to="/shopping-list" tint={toBuy ? 'saffron' : undefined} />
        <StatTile icon={Carrot} label="In your pantry" value={pantry.length} to="/match" tint="herb" />
      </section>

      <section className="bento">
        <div className="tile span-8">
          <div className="tile-head">
            <h3>Recently added</h3>
            <Link to="/recipes" className="link small">
              See all
            </Link>
          </div>
          {recent.loading ? (
            <div className="h-scroll">
              {[1, 2, 3].map((n) => (
                <RecipeCardSkeleton key={n} />
              ))}
            </div>
          ) : recent.data?.results.length ? (
            <div className="h-scroll">
              {recent.data.results.map((r) => (
                <RecipeCard key={r._id} recipe={r} />
              ))}
            </div>
          ) : (
            <EmptyState
              emoji="📖"
              title="Your cookbook is empty"
              action={
                <div className="row row--wrap" style={{ justifyContent: 'center' }}>
                  <Link to="/explore" className="btn btn--primary btn--sm">
                    Explore recipes
                  </Link>
                  <Link to="/recipes/new" className="btn btn--secondary btn--sm">
                    Write your own
                  </Link>
                </div>
              }
            >
              Save recipes from TheMealDB or write your own.
            </EmptyState>
          )}
        </div>
        <ShoppingPreview list={list.data?.list} onToggle={toggleItem} />
      </section>

      <section className="bento">
        <div className="tile span-12">
          <div className="tile-head">
            <h3>Browse categories</h3>
            <Link to="/explore?mode=category" className="link small">
              Explore
            </Link>
          </div>
          <div className="h-scroll category-strip">
            {categories.loading
              ? Array.from({ length: 6 }, (_, n) => <Skeleton key={n} height={120} radius={20} />)
              : (categories.data?.results || []).map((c) => (
                  <Link key={c.id} to={`/explore?mode=category&q=${encodeURIComponent(c.name)}`} className="category-tile">
                    <Img src={c.image} alt="" />
                    {c.name}
                  </Link>
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}
