(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = localStorage.getItem('theme') || 'auto';
  document.documentElement.classList.toggle('sl-theme-dark', theme === 'dark' || (theme === 'auto' && prefersDark));
})();
