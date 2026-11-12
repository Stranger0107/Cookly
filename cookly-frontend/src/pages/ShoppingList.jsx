/**
 * Shopping list. Updates are optimistic: the tick shows instantly and is
 * rolled back if the API call fails.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, Trash2, Sparkles } from 'lucide-react';
import { recipesApi, shoppingListApi } from '../api';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { addedMessage } from '../hooks/useRecipeActions';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/Modal';
import { Button, EmptyState, Img, MatchRing, Skeleton } from '../components/ui';

function Item({ item, recipeTitle, onToggle, onRemove }) {
  return (
    <li className={`list-item ${item.checked ? 'list-item--checked' : ''}`}>
      <button className="check" onClick={() => onToggle(item)} aria-label={item.checked ? `Untick ${item.name}` : `Tick ${item.name}`} aria-pressed={item.checked}>
        <Check size={16} />
      </button>
      <div className="list-item__text" onClick={() => onToggle(item)}>
        <div className="list-item__name">{item.name}</div>
        <div className="list-item__sub">
          {[item.measure, recipeTitle && `for ${recipeTitle}`].filter(Boolean).join(' · ')}
        </div>
      </div>
      <button className="icon-btn icon-btn--sm" onClick={() => onRemove(item)} aria-label={`Remove ${item.name}`}>
        <Trash2 size={16} />
      </button>
    </li>
  );
}

export default function ShoppingList() {
  useDocumentTitle('Shopping list');
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => shoppingListApi.get(), []);
  const [name, setName] = useState('');
  const [measure, setMeasure] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const items = data?.list.items || [];
  const toBuy = items.filter((i) => !i.checked);
  const inCart = items.filter((i) => i.checked);

  // Recipes that items came from, for the "for Masala Omelette" labels and thumbnails.
  const recipeIds = useMemo(() => [...new Set(items.map((i) => i.fromRecipe).filter(Boolean))], [items]);
  const recipes = useAsync(
    () => Promise.all(recipeIds.map((id) => recipesApi.get(id).then((d) => d.recipe).catch(() => null))),
    [recipeIds.join(',')]
  );
  const recipeById = Object.fromEntries((recipes.data || []).filter(Boolean).map((r) => [r._id, r]));

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const result = await shoppingListApi.addItems([{ name: name.trim(), measure: measure.trim() }]);
      setData({ list: result.list });
      toast.success(addedMessage(result));
      setName('');
      setMeasure('');
    } catch (err) {
      toast.error(err.message);
    }
    setAdding(false);
  };

  const patchLocal = (itemId, changes) =>
    setData((d) => ({ list: { ...d.list, items: d.list.items.map((i) => (i._id === itemId ? { ...i, ...changes } : i)) } }));

  const toggle = async (item) => {
    patchLocal(item._id, { checked: !item.checked }); // optimistic
    try {
      await shoppingListApi.toggle(item._id, !item.checked);
    } catch (err) {
      patchLocal(item._id, { checked: item.checked }); // roll back
      toast.error(err.message);
    }
  };

  const remove = async (item) => {
    const before = data;
    setData((d) => ({ list: { ...d.list, items: d.list.items.filter((i) => i._id !== item._id) } }));
    try {
      await shoppingListApi.removeItem(item._id);
    } catch (err) {
      setData(before);
      toast.error(err.message);
    }
  };

  const clearChecked = async () => {
    setClearing(true);
    try {
      const { list, removed } = await shoppingListApi.clearChecked();
      setData({ list });
      toast.success(`Cleared ${removed} item${removed === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err.message);
    }
    setClearing(false);
    setConfirmClear(false);
  };

  const percent = items.length ? Math.round((inCart.length / items.length) * 100) : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Shopping list</h1>
          <p className="muted">Tick things off as they go in the basket.</p>
        </div>
      </div>

      <section className="bento">
        <div className="tile span-8 row-3">
          <form className="add-bar glass" onSubmit={add}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item, e.g. milk" aria-label="Item name" maxLength={100} />
            <input className="input measure" value={measure} onChange={(e) => setMeasure(e.target.value)} placeholder="Amount" aria-label="Amount" maxLength={50} />
            <Button type="submit" loading={adding} disabled={!name.trim()} aria-label="Add item">
              <Plus size={18} />
            </Button>
          </form>

          {loading ? (
            <div className="stack">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} height={48} />
              ))}
            </div>
          ) : error ? (
            <EmptyState emoji="😕" title="Couldn't load your list" action={<Button onClick={reload}>Try again</Button>}>
              {error.message}
            </EmptyState>
          ) : !items.length ? (
            <EmptyState
              emoji="🧺"
              title="Your list is empty"
              action={
                <Link to="/match" className="btn btn--primary">
                  <Sparkles size={16} /> Find something to cook
                </Link>
              }
            >
              Add items above, or add missing ingredients from any recipe.
            </EmptyState>
          ) : (
            <>
              <div className="list-group">
                <h3>To buy · {toBuy.length}</h3>
                {toBuy.length ? (
                  <ul className="ing-list">
                    {toBuy.map((item) => (
                      <Item key={item._id} item={item} recipeTitle={recipeById[item.fromRecipe]?.title} onToggle={toggle} onRemove={remove} />
                    ))}
                  </ul>
                ) : (
                  <p className="muted small" style={{ padding: '8px 12px' }}>
                    Everything's in the basket 🎉
                  </p>
                )}
              </div>
              {inCart.length > 0 && (
                <div className="list-group">
                  <h3>In the basket ✓ · {inCart.length}</h3>
                  <ul className="ing-list">
                    {inCart.map((item) => (
                      <Item key={item._id} item={item} recipeTitle={recipeById[item.fromRecipe]?.title} onToggle={toggle} onRemove={remove} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="tile span-4 tile--tint-herb" style={{ alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
          <MatchRing percent={percent} size={112} stroke={10} />
          <p style={{ fontWeight: 600 }}>
            {inCart.length} of {items.length} done
          </p>
        </div>

        <div className="tile span-4">
          <h3>Tidy up</h3>
          <p className="muted small" style={{ margin: '6px 0 16px' }}>
            Remove everything you've already ticked off.
          </p>
          <Button variant="danger-ghost" className="mt-auto" onClick={() => setConfirmClear(true)} disabled={!inCart.length}>
            <Trash2 size={16} /> Clear {inCart.length || ''} checked
          </Button>
        </div>

        <div className="tile span-4">
          <h3 style={{ marginBottom: 12 }}>Recipes on this list</h3>
          {recipeIds.length === 0 ? (
            <p className="muted small">Items you add from a recipe will be grouped here.</p>
          ) : (
            <div className="thumb-row">
              {recipeIds.map((id) =>
                recipeById[id] ? (
                  <Link key={id} to={`/recipes/${id}`}>
                    <Img src={recipeById[id].image} alt="" />
                    <span className="clamp-2">{recipeById[id].title}</span>
                  </Link>
                ) : null
              )}
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        open={confirmClear}
        title="Clear checked items?"
        message={`This removes ${inCart.length} ticked item${inCart.length === 1 ? '' : 's'} from your list.`}
        confirmLabel="Clear"
        loading={clearing}
        onConfirm={clearChecked}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
