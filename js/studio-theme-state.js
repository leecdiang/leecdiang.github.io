/* Inline before the stylesheet so each document starts in the visit's theme. */
(() => {
  const key = 'studio-theme-visit';
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['system', 'light', 'dark'].includes(value);
  function read() {
    try {
      const value = JSON.parse(sessionStorage.getItem(key));
      if (value && valid(value.preference) && typeof value.systemDark === 'boolean') return value;
    } catch {}
    return null;
  }
  let preference = 'system';
  function select(value) {
    preference = valid(value) ? value : 'system';
    root.dataset.themePreference = preference;
    root.dataset.color = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    try { sessionStorage.setItem(key, JSON.stringify({preference, systemDark: system.matches})); } catch {}
  }
  function sync() {
    const stored = read();
    select(stored && stored.systemDark === system.matches ? stored.preference : 'system');
  }
  const navigation = performance.getEntriesByType('navigation')[0]?.type;
  let internal = false;
  try { internal = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch {}
  // Reloads and fresh entry reset; native links and history share this tab's visit.
  if (navigation !== 'reload' && (navigation === 'back_forward' || internal)) sync();
  else select('system');
  window.StudioThemeState = {get preference() { return preference; }, select, sync};
})();
