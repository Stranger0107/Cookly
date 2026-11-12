import { useCallback, useState } from 'react';

/**
 * The user's last-used pantry ingredients, remembered in localStorage so the
 * recipe page and the next visit can reuse them.
 */
const KEY = 'cookly-pantry';

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export default function usePantry() {
  const [pantry, setPantryState] = useState(read);

  const setPantry = useCallback((next) => {
    setPantryState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  return [pantry, setPantry];
}

export const readPantry = read;
