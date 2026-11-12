/**
 * Pantry input: type an ingredient, press Enter or comma, and it becomes a
 * removable chip. Backspace on an empty field removes the last chip.
 * Pasting "eggs, onion, tomato" adds all three at once.
 */
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ingredientEmoji, normalizeIngredient } from '../utils/ingredients';

export default function ChipInput({ value, onChange, max = 10, placeholder = 'Add an ingredient…', id }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const add = (text) => {
    const incoming = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!incoming.length) return;

    const keys = new Set(value.map(normalizeIngredient));
    const next = [...value];
    for (const item of incoming) {
      const key = normalizeIngredient(item);
      if (!key || keys.has(key) || next.length >= max) continue;
      keys.add(key);
      next.push(item.slice(0, 50));
    }
    onChange(next);
    setDraft('');
  };

  const remove = (index) => onChange(value.filter((_, i) => i !== index));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value.length - 1);
    }
  };

  const full = value.length >= max;

  return (
    <div className="chip-input" onClick={() => inputRef.current?.focus()}>
      {value.map((item, i) => (
        <span className="chip" key={`${item}-${i}`}>
          <span aria-hidden>{ingredientEmoji(item)}</span>
          {item}
          <button type="button" onClick={() => remove(i)} aria-label={`Remove ${item}`}>
            <X size={14} />
          </button>
        </span>
      ))}
      <input
        id={id}
        ref={inputRef}
        value={draft}
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
        placeholder={full ? `That's the max (${max})` : value.length ? 'Add more…' : placeholder}
        disabled={full}
        aria-label="Add an ingredient"
        maxLength={50}
      />
    </div>
  );
}
