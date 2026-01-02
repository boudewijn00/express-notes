// Theme management - execute immediately to prevent FOUC
(function() {
  const THEME_KEY = 'user-theme-preference';
  const HIGHLIGHT_LIGHT = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css';
  const HIGHLIGHT_DARK = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css';

  function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    // Update Highlight.js theme
    const highlightLink = document.getElementById('highlight-theme');
    if (highlightLink) {
      highlightLink.href = theme === 'dark' ? HIGHLIGHT_DARK : HIGHLIGHT_LIGHT;
    }

    // Update icon visibility
    updateThemeIcon(theme);
  }

  function updateThemeIcon(theme) {
    const moonIcons = document.querySelectorAll('.theme-icon-moon');
    const sunIcons = document.querySelectorAll('.theme-icon-sun');

    if (theme === 'dark') {
      moonIcons.forEach(icon => icon.style.display = 'none');
      sunIcons.forEach(icon => icon.style.display = 'block');
    } else {
      moonIcons.forEach(icon => icon.style.display = 'block');
      sunIcons.forEach(icon => icon.style.display = 'none');
    }
  }

  function getCurrentTheme() {
    return getStoredTheme() || getSystemPreference();
  }

  function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  }

  // Apply theme immediately (before DOMContentLoaded to prevent FOUC)
  applyTheme(getCurrentTheme());

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!getStoredTheme()) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  // Set up toggle button and navbar burger after DOM loads
  document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
      });
    }

    // Navbar burger menu functionality
    const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
    $navbarBurgers.forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.target;
        const $target = document.getElementById(target);
        el.classList.toggle('is-active');
        $target.classList.toggle('is-active');
      });
    });
  });
})();
