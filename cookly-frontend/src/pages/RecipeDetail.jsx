/**
 * Recipe detail, for both:
 *   /recipes/:id      one of my recipes (own or saved copy)
 *   /meals/:mealdbId  a TheMealDB meal (shows "Saved" if I already have a copy)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bookmark, BookmarkCheck, Pencil, Trash2, ShoppingBasket, Play, Check, Plus, ChefHat, ExternalLink,
} from 'lucide-react';
import { mealsApi, recipesApi, shoppingListApi } from '../api';
import useAsync from '../hooks/useAsync';
import usePantry from '../hooks/usePantry';
import useRecipeActions, { addedMessage, findSavedCopy } from '../hooks/useRecipeActions';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useToast } from '../context/ToastContext';
import ChipInput from '../components/ChipInput';
import { ConfirmModal } from '../components/Modal';
import { Button, EmptyState, Img, MatchRing, Skeleton, SourceBadge, Stars, Switch, TierBadge } from '../components/ui';
import { splitIngredients } from '../utils/ingredients';

function youtubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function VideoTile({ url, title }) {
  const id = youtubeId(url);
  const [playing, setPlaying] = useState(false);
  if (!id) return null;
  return (
    <div className="tile video-tile span-6">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={`${title} video`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        // Load YouTube only when asked: faster page and no tracking until you press play.
        <button className="video-poster" onClick={() => setPlaying(true)} aria-label={`Play video for ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" />
          <span className="icon-btn icon-btn--glass">
            <Play size={28} fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}

/** Rating + notes, saved automatically (notes after you stop typing). */
function NotesTile({ recipe, onSaved }) {
  const toast = useToast();
  const [rating, setRating] = useState(recipe.rating);
  const [notes, setNotes] = useState(recipe.notes || '');
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const timer = useRef(null);

  const save = async (patch) => {
    setStatus('saving');
    try {
      const { recipe: updated } = await recipesApi.update(recipe._id, patch);
      onSaved(updated);
      setStatus('saved');
    } catch (err) {
      setStatus('idle');
      toast.error(err.message);
    }
  };

  const onNotes = (value) => {
    setNotes(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save({ notes: value }), 800);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="tile span-6">
      <div className="tile-head">
        <h3>My notes</h3>
        <span className="caption" aria-live="polite">
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : ''}
        </span>
      </div>
      <div className="stack">
        <div className="row">
          <span className="small muted" style={{ fontWeight: 600 }}>
            Your rating
          </span>
          <Stars
            value={rating}
            size={24}
            onChange={(value) => {
              setRating(value);
              save({ rating: value });
            }}
          />
        </div>
        <textarea
          className="textarea"
          rows={5}
          value={notes}
          maxLength={2000}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Tweaks, substitutions, who loved it…"
          aria-label="Notes"
        />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="page">
      <div className="bento">
        <div className="tile span-8 row-2 skeleton" />
        <div className="tile span-4 row-2">
          <Skeleton height={24} width="60%" />
          <Skeleton height={120} style={{ marginTop: 16 }} />
        </div>
        <div className="tile span-5">
          <Skeleton height={200} />
        </div>
        <div className="tile span-7">
          <Skeleton height={200} />
        </div>
      </div>
    </div>
  );
}

export default function RecipeDetail({ kind }) {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isMine = kind === 'mine';
  const id = isMine ? params.id : params.mealdbId;

  const [pantry, setPantry] = usePantry();
  const [assumeStaples, setAssumeStaples] = useState(true);
  const [cookingMode, setCookingMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(null); // 'save' | 'list' | ingredient name
  const [savedCopy, setSavedCopy] = useState(null);
  const { saveMeal, addMissingToList } = useRecipeActions();

  const { data, error, loading, setData } = useAsync(
    () => (isMine ? recipesApi.get(id).then((d) => d.recipe) : mealsApi.get(id).then((d) => d.meal)),
    [kind, id]
  );
  const recipe = data;
  useDocumentTitle(recipe?.title || 'Recipe');

  // For TheMealDB meals: do I already have a saved copy?
  useEffect(() => {
    setSavedCopy(null);
    if (!isMine && recipe) findSavedCopy(recipe.mealdbId, recipe.title).then(setSavedCopy).catch(() => {});
  }, [isMine, recipe]);

  const split = useMemo(
    () => (recipe ? splitIngredients(recipe.ingredients, pantry, { assumeStaples }) : null),
    [recipe, pantry, assumeStaples]
  );

  if (loading) return <DetailSkeleton />;
  if (error || !recipe) {
    return (
      <div className="page">
        <div className="tile">
          <EmptyState emoji="🍽️" title="Recipe not found" action={<Link to="/recipes" className="btn btn--primary">Back to My Recipes</Link>}>
            {error?.status === 404 ? "It may have been deleted, or it isn't yours." : error?.message}
          </EmptyState>
        </div>
      </div>
    );
  }

  const source = isMine ? (recipe.source === 'mealdb' ? 'saved' : 'user') : savedCopy ? 'saved' : 'mealdb';
  const target = isMine ? recipe : savedCopy || recipe; // what "add to list" should use
  const haveNames = new Set(split.have.map((i) => i.name));

  const onSave = async () => {
    setBusy('save');
    try {
      setSavedCopy(await saveMeal(recipe));
    } catch {
      /* toast shown */
    }
    setBusy(null);
  };

  const onAddMissing = async () => {
    setBusy('list');
    const result = await addMissingToList(target, pantry);
    if (result && !isMine && !savedCopy) setSavedCopy({ _id: result.recipeId, mealdbId: recipe.mealdbId });
    setBusy(null);
  };

  const addOne = async (ing) => {
    setBusy(ing.name);
    try {
      toast.success(addedMessage(await shoppingListApi.addItems([{ name: ing.name, measure: ing.measure }])));
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(null);
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await recipesApi.remove(recipe._id);
      toast.success(`Deleted "${recipe.title}"`);
      navigate('/recipes', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <section className="bento">
        <div className="tile photo-tile span-8 row-2 detail-hero">
          <Img src={recipe.image} alt="" />
          <div className="photo-tile__top">
            <SourceBadge source={source} />
          </div>
          <div className="photo-tile__caption">
            <div className="chips">
              {[recipe.category, recipe.area, ...(recipe.tags || [])].filter(Boolean).map((t) => (
                <span key={t} className="chip chip--sm" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                  {t}
                </span>
              ))}
            </div>
            <h1>{recipe.title}</h1>
            {recipe.rating ? <Stars value={recipe.rating} size={18} /> : null}
            <div className="detail-actions">
              {split.missing.length > 0 && (
                <Button variant="primary" size="sm" onClick={onAddMissing} loading={busy === 'list'}>
                  <ShoppingBasket size={16} /> Add {split.missing.length} missing to list
                </Button>
              )}
              {!isMine && !savedCopy && (
                <Button variant="secondary" size="sm" onClick={onSave} loading={busy === 'save'}>
                  <Bookmark size={16} /> Save
                </Button>
              )}
              {!isMine && savedCopy && (
                <Link to={`/recipes/${savedCopy._id}`} className="btn btn--secondary btn--sm">
                  <BookmarkCheck size={16} /> Open my copy
                </Link>
              )}
              {isMine && (
                <>
                  <Link to={`/recipes/${recipe._id}/edit`} className="btn btn--secondary btn--sm">
                    <Pencil size={16} /> Edit
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={16} /> Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="tile glass span-4 row-2">
          <div className="tile-head">
            <h3>Your match</h3>
            {pantry.length > 0 && <TierBadge percent={split.percent} />}
          </div>
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 8 }}>
            <MatchRing percent={split.percent} size={128} stroke={11} />
            <p className="muted small">
              {pantry.length
                ? `You have ${split.have.length} of ${split.total} ingredients`
                : 'Add what you have to see your match'}
            </p>
          </div>
          <div className="stack mt-auto" style={{ marginTop: 18 }}>
            <ChipInput value={pantry} onChange={setPantry} placeholder="What do you have?" />
            <Switch checked={assumeStaples} onChange={setAssumeStaples} label="I have salt, water & pepper" />
          </div>
        </div>

        <div className="tile span-5 row-auto">
          <div className="tile-head">
            <h3>Ingredients</h3>
            <span className="caption">{recipe.ingredients.length} items</span>
          </div>
          <ul className="ing-list">
            {recipe.ingredients.map((ing) => {
              const have = haveNames.has(ing.name);
              return (
                <li key={ing.name} className={`ing-row ${have ? 'ing-row--have' : 'ing-row--missing'}`}>
                  <span className="ing-row__state" aria-label={have ? 'You have this' : 'Missing'}>
                    <Check size={14} />
                  </span>
                  <span className="ing-row__name">{ing.name}</span>
                  <span className="ing-row__measure">{ing.measure}</span>
                  {!have && (
                    <button
                      className="icon-btn icon-btn--sm"
                      onClick={() => addOne(ing)}
                      aria-label={`Add ${ing.name} to shopping list`}
                      title="Add to shopping list"
                      disabled={busy === ing.name}
                    >
                      {busy === ing.name ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={16} />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`tile span-7 row-auto ${cookingMode ? 'cooking-mode' : ''}`}>
          <div className="tile-head">
            <h3>Method</h3>
            <Switch checked={cookingMode} onChange={setCookingMode} label={<span className="row" style={{ gap: 6 }}><ChefHat size={16} /> Cooking mode</span>} />
          </div>
          {recipe.steps.length ? (
            <ol className="steps">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="muted">No steps written yet.</p>
          )}
          {recipe.sourceUrl && (
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="link small" style={{ marginTop: 16 }}>
              Original source <ExternalLink size={14} style={{ verticalAlign: -2 }} />
            </a>
          )}
        </div>

        <VideoTile url={recipe.youtubeUrl} title={recipe.title} />
        {isMine && <NotesTile recipe={recipe} onSaved={(updated) => setData(updated)} />}
      </section>

      <ConfirmModal
        open={confirmDelete}
        title={`Delete "${recipe.title}"?`}
        message="This removes it from My Recipes. This can't be undone."
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
