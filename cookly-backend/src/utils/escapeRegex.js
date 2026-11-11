/**
 * Escape special regex characters in user input before building a RegExp.
 * Without this, a search like "a.*" or "(" would be treated as a pattern
 * (or crash), and a nasty pattern could make MongoDB do very slow scans.
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
