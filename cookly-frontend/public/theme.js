// Apply the saved theme before React loads so the page never flashes the wrong colours.
// Kept as a separate file (not inline) so the server's Content-Security-Policy can
// block all inline scripts.
try {
  var saved = localStorage.getItem('cookly-theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch (e) {
  /* storage blocked: fall back to the OS setting */
}
