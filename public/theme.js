const btn = document.getElementById('themeToggle');
const current = localStorage.getItem('theme') || 'dark';
document.documentElement.dataset.theme = current;
if (btn) btn.textContent = current === 'dark' ? '🌙' : '☀️';
if (btn) btn.onclick = () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  btn.textContent = theme === 'dark' ? '🌙' : '☀️';
};
