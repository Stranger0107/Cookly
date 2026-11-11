/**
 * A tiny in-memory cache with a time-to-live (TTL) per entry.
 *
 * Why: TheMealDB data barely changes, so calling it again for the same
 * search within a few minutes is wasted time. Serving from memory makes
 * repeat requests near-instant and keeps us polite to a free API.
 *
 * Trade-offs worth mentioning in an interview:
 * - Lives in one process: lost on restart and not shared between multiple
 *   server instances. Redis would be the next step for that.
 * - `maxEntries` caps memory. A JS Map remembers insertion order, so the
 *   first key is always the oldest one, which makes eviction simple.
 */
class TTLCache {
  constructor({ ttlMs = 10 * 60 * 1000, maxEntries = 500 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map(); // key -> { value, expiresAt }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Lazy expiry: we only check (and delete) stale entries when they're read.
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    // Re-inserting moves the key to the "newest" end of the Map.
    this.store.delete(key);

    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }

    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }
}

module.exports = TTLCache;
