function setTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('ui-theme', mode);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'light' ? 'dark' : 'light');
}
function initTheme() {
  const saved = localStorage.getItem('ui-theme');
  if (!saved) setTheme('dark'); else setTheme(saved);
}
function notify(text) { const t = document.getElementById('toast'); if (!t) return; t.textContent = text; t.classList.add('show'); setTimeout(()=> t.classList.remove('show'), 1800); }
window.addEventListener('DOMContentLoaded', initTheme);
