/**
 * Create / edit a recipe.
 * Ingredients and steps are dynamic lists. On edit, only the fields that
 * actually changed are sent (the backend PUT is a partial update).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { Plus, X, ArrowUp, ArrowDown, ClipboardPaste } from 'lucide-react';
import { mealsApi, recipesApi } from '../api';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { Button, EmptyState, Field, Img, Skeleton, Stars, TextInput } from '../components/ui';

const EMPTY = {
  title: '',
  category: '',
  area: '',
  image: '',
  youtubeUrl: '',
  tags: [],
  ingredients: [{ name: '', measure: '' }],
  steps: [''],
  rating: null,
  notes: '',
};

function fromRecipe(r) {
  return {
    title: r.title,
    category: r.category || '',
    area: r.area || '',
    image: r.image || '',
    youtubeUrl: r.youtubeUrl || '',
    tags: r.tags || [],
    ingredients: r.ingredients.length ? r.ingredients.map(({ name, measure }) => ({ name, measure: measure || '' })) : EMPTY.ingredients,
    steps: r.steps.length ? r.steps : [''],
    rating: r.rating ?? null,
    notes: r.notes || '',
  };
}

// Strip empty rows so the API only sees real content.
function toPayload(form) {
  return {
    ...form,
    title: form.title.trim(),
    ingredients: form.ingredients.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), measure: i.measure.trim() })),
    steps: form.steps.map((s) => s.trim()).filter(Boolean),
  };
}

const move = (list, from, to) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export default function RecipeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? 'Edit recipe' : 'New recipe');
  const navigate = useNavigate();
  const toast = useToast();

  const existing = useAsync(() => recipesApi.get(id).then((d) => d.recipe), [id], { enabled: isEdit });
  const categories = useAsync(() => mealsApi.categories(), []);

  const [form, setForm] = useState(EMPTY);
  const [initial, setInitial] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    if (existing.data) {
      const f = fromRecipe(existing.data);
      setForm(f);
      setInitial(f);
    }
  }, [existing.data]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saving && currentLocation.pathname !== nextLocation.pathname);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setIngredient = (i, key, value) =>
    set('ingredients', form.ingredients.map((ing, n) => (n === i ? { ...ing, [key]: value } : ing)));
  const setStep = (i, value) => set('steps', form.steps.map((s, n) => (n === i ? value : s)));

  const addTag = () => {
    const tag = tagDraft.trim();
    if (tag && !form.tags.includes(tag) && form.tags.length < 20) set('tags', [...form.tags, tag.slice(0, 30)]);
    setTagDraft('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = toPayload(form);

    const local = {};
    if (!payload.title) local.title = 'Title is required';
    if (!payload.ingredients.length) local.ingredients = 'A recipe needs at least one ingredient';
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    let body = payload;
    if (isEdit) {
      const before = toPayload(initial);
      body = Object.fromEntries(Object.entries(payload).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k])));
      if (!Object.keys(body).length) {
        navigate(`/recipes/${id}`);
        return;
      }
    }

    setSaving(true);
    try {
      const { recipe } = isEdit ? await recipesApi.update(id, body) : await recipesApi.create(body);
      setInitial(form); // not dirty any more, so navigation isn't blocked
      toast.success(isEdit ? 'Recipe updated' : `"${recipe.title}" added to My Recipes`);
      setTimeout(() => navigate(`/recipes/${recipe._id}`), 0);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error(err.message);
      setSaving(false);
    }
  };

  if (isEdit && existing.loading) {
    return (
      <div className="page">
        <Skeleton height={44} width={280} />
        <div className="tile" style={{ marginTop: 24 }}>
          <Skeleton height={300} />
        </div>
      </div>
    );
  }
  if (isEdit && existing.error) {
    return (
      <div className="page">
        <div className="tile">
          <EmptyState emoji="🍽️" title="Recipe not found">
            {existing.error.message}
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <form className="page" onSubmit={onSubmit} noValidate>
      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit recipe' : 'New recipe'}</h1>
          <p className="muted">{isEdit ? 'Changes are saved when you press Save.' : 'Write down a recipe you love.'}</p>
        </div>
      </div>

      <div className="bento">
        <div className="span-8 row-auto stack-lg" style={{ gap: 'var(--gutter)' }}>
          <div className="tile">
            <h3 style={{ marginBottom: 16 }}>Basics</h3>
            <div className="form-grid">
              <div className="full">
                <Field label="Title" htmlFor="title" error={errors.title}>
                  <TextInput id="title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} error={errors.title} placeholder="e.g. Masala Omelette" />
                </Field>
              </div>
              <Field label="Category" htmlFor="category" error={errors.category}>
                <input
                  id="category"
                  className="input"
                  list="category-list"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  maxLength={50}
                  placeholder="Breakfast"
                />
                <datalist id="category-list">
                  {(categories.data?.results || []).map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Cuisine" htmlFor="area" error={errors.area}>
                <TextInput id="area" value={form.area} onChange={(e) => set('area', e.target.value)} maxLength={50} placeholder="Indian" />
              </Field>
              <Field label="Image URL" htmlFor="image" error={errors.image} hint="Paste a link to a photo (http/https)">
                <TextInput id="image" type="url" value={form.image} onChange={(e) => set('image', e.target.value)} error={errors.image} placeholder="https://…" />
              </Field>
              <Field label="YouTube URL" htmlFor="youtubeUrl" error={errors.youtubeUrl}>
                <TextInput id="youtubeUrl" type="url" value={form.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} error={errors.youtubeUrl} placeholder="https://youtube.com/watch?v=…" />
              </Field>
              <div className="full">
                <Field label="Tags" htmlFor="tags" error={errors.tags}>
                  <div className="chip-input" style={{ minHeight: 50, background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {form.tags.map((t) => (
                      <span key={t} className="chip chip--sm" style={{ height: 30 }}>
                        {t}
                        <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      id="tags"
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      onBlur={addTag}
                      placeholder="quick, vegetarian… (Enter to add)"
                      maxLength={30}
                    />
                  </div>
                </Field>
              </div>
            </div>
          </div>

          <div className="tile">
            <div className="tile-head">
              <h3>Ingredients</h3>
              <span className="caption">{form.ingredients.filter((i) => i.name.trim()).length} / 50</span>
            </div>
            {errors.ingredients && <p className="error small" style={{ color: 'var(--danger)', marginBottom: 10 }}>{errors.ingredients}</p>}
            <div className="builder">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="builder-row">
                  <input className="input" value={ing.name} onChange={(e) => setIngredient(i, 'name', e.target.value)} placeholder="Ingredient" aria-label={`Ingredient ${i + 1} name`} maxLength={100} />
                  <input className="input" value={ing.measure} onChange={(e) => setIngredient(i, 'measure', e.target.value)} placeholder="Amount" aria-label={`Ingredient ${i + 1} amount`} maxLength={50} />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => set('ingredients', form.ingredients.length > 1 ? form.ingredients.filter((_, n) => n !== i) : EMPTY.ingredients)}
                    aria-label={`Remove ingredient ${i + 1}`}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
              onClick={() => set('ingredients', [...form.ingredients, { name: '', measure: '' }])}
              disabled={form.ingredients.length >= 50}
            >
              <Plus size={16} /> Add ingredient
            </Button>
          </div>

          <div className="tile">
            <div className="tile-head">
              <h3>Method</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPasteOpen(true)}>
                <ClipboardPaste size={16} /> Paste all steps
              </Button>
            </div>
            <div className="builder">
              {form.steps.map((step, i) => (
                <div key={i} className="builder-row builder-row--step">
                  <span className="step-num">{i + 1}</span>
                  <textarea className="textarea" rows={2} value={step} onChange={(e) => setStep(i, e.target.value)} placeholder="Describe this step" aria-label={`Step ${i + 1}`} maxLength={2000} />
                  <div className="stack" style={{ gap: 2 }}>
                    <button type="button" className="icon-btn icon-btn--sm" onClick={() => set('steps', move(form.steps, i, i - 1))} aria-label={`Move step ${i + 1} up`} disabled={i === 0}>
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" className="icon-btn icon-btn--sm" onClick={() => set('steps', move(form.steps, i, i + 1))} aria-label={`Move step ${i + 1} down`} disabled={i === form.steps.length - 1}>
                      <ArrowDown size={16} />
                    </button>
                    <button type="button" className="icon-btn icon-btn--sm" onClick={() => set('steps', form.steps.length > 1 ? form.steps.filter((_, n) => n !== i) : [''])} aria-label={`Remove step ${i + 1}`}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
              onClick={() => set('steps', [...form.steps, ''])}
              disabled={form.steps.length >= 50}
            >
              <Plus size={16} /> Add step
            </Button>
          </div>
        </div>

        <div className="span-4 row-auto">
          <div className="sticky-side">
            <div className="tile tile--flush recipe-card">
              <div className="recipe-card__media">
                <Img src={form.image} alt="" />
              </div>
              <div className="recipe-card__body">
                <span className="caption">Preview</span>
                <h3 className="recipe-card__title">{form.title || 'Untitled recipe'}</h3>
                <div className="recipe-card__meta">{[form.category, form.area].filter(Boolean).join(' · ') || 'No category yet'}</div>
              </div>
            </div>

            <div className="tile">
              <h3 style={{ marginBottom: 12 }}>Rating & notes</h3>
              <div className="stack">
                <Stars value={form.rating} size={26} onChange={(v) => set('rating', v)} />
                <textarea className="textarea" rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Tips, substitutions…" aria-label="Notes" maxLength={2000} />
              </div>
            </div>

            <div className="row">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" className="grow" loading={saving}>
                {isEdit ? 'Save changes' : 'Create recipe'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={pasteOpen}
        title="Paste all steps"
        onClose={() => setPasteOpen(false)}
        actions={
          <>
            <Button variant="ghost" type="button" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const steps = pasteText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 50);
                if (steps.length) set('steps', steps);
                setPasteOpen(false);
                setPasteText('');
              }}
            >
              Use these steps
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: 12 }}>One step per line. This replaces the current steps.</p>
        <textarea className="textarea" rows={8} value={pasteText} onChange={(e) => setPasteText(e.target.value)} aria-label="Steps, one per line" />
      </Modal>

      <Modal
        open={blocker.state === 'blocked'}
        title="Discard your changes?"
        onClose={() => blocker.reset?.()}
        actions={
          <>
            <Button variant="ghost" type="button" onClick={() => blocker.reset?.()}>
              Keep editing
            </Button>
            <Button variant="danger" type="button" onClick={() => blocker.proceed?.()}>
              Discard
            </Button>
          </>
        }
      >
        You have unsaved changes to this recipe.
      </Modal>
    </form>
  );
}
