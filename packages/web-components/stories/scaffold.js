/**
 * Story scaffold — credential picker injected into every *.story.html by the
 * Vite plugin. Runs synchronously so window.__SW_CREDS is available before any
 * deferred <script type="module"> evaluates.
 *
 * Exposes:
 *   window.__SW_CREDS   { token, destination, label }   current credential
 *   window.__SW_PRESETS [...]                            available presets
 *   'sw-creds-change'   CustomEvent on window           fired on selection change
 */
(function () {
  const STORAGE_KEY = 'sw-story-creds';
  const THEME_STORAGE_KEY = 'sw-story-theme';
  const PRESETS = window.__SW_PRESETS || [];

  // ── Theme (light/dark/system) ────────────────────────────────────────────

  function loadTheme() {
    try {
      const t = localStorage.getItem(THEME_STORAGE_KEY);
      if (t === 'dark' || t === 'light' || t === 'system') return t;
    } catch (_) {}
    return 'system';
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);

    // Reach into same-origin story iframes too.
    document.querySelectorAll('iframe').forEach(function (frame) {
      try {
        const r = frame.contentDocument && frame.contentDocument.documentElement;
        if (!r) return;
        if (mode === 'system') r.removeAttribute('data-theme');
        else r.setAttribute('data-theme', mode);
      } catch (_) {}
    });
  }

  function saveTheme(mode) {
    try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch (_) {}
    applyTheme(mode);
    updateThemeUI();
  }

  // Apply synchronously so the first paint matches the saved choice.
  applyTheme(loadTheme());

  // ── Persist / restore ────────────────────────────────────────────────────

  function loadCreds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.token !== undefined) return parsed;
      }
    } catch (_) {}
    return PRESETS[0] || { id: 'custom', label: 'Custom', token: '', destination: '' };
  }

  function saveCreds(creds) {
    window.__SW_CREDS = creds;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(creds)); } catch (_) {}
    window.dispatchEvent(new CustomEvent('sw-creds-change', { detail: creds }));
  }

  // Initialise __SW_CREDS synchronously — available for module scripts.
  window.__SW_CREDS = loadCreds();

  // ── Apply to web components ──────────────────────────────────────────────

  function applyToElements() {
    const { token = '', destination = '' } = window.__SW_CREDS;

    function applyInDoc(doc) {
      doc.querySelectorAll('sw-call-widget, sw-click-to-call').forEach(function (el) {
        el.token = token;
        el.destination = destination;
      });
    }

    // Apply in the current document (when bar is inside a story directly).
    applyInDoc(document);

    // Also reach into any same-origin iframes (story iframes inside the main viewer).
    document.querySelectorAll('iframe').forEach(function (frame) {
      try {
        if (frame.contentDocument) applyInDoc(frame.contentDocument);
      } catch (_) {}
    });
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  const BAR_H = 44;

  function truncate(str, n) {
    return str.length <= n ? str : str.slice(0, n) + '…';
  }

  function renderBar() {
    if (document.getElementById('sw-scaffold-bar')) return;

    // Body offset so the fixed bar doesn't overlap content.
    document.body.style.paddingTop = BAR_H + 'px';

    const bar = document.createElement('div');
    bar.id = 'sw-scaffold-bar';
    Object.assign(bar.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      height: BAR_H + 'px',
      zIndex: '99999',
      background: '#0d0e1a',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '0 14px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: 'rgba(255,255,255,0.5)',
      userSelect: 'none',
    });

    // Label
    const lbl = document.createElement('span');
    lbl.textContent = 'Credential:';
    Object.assign(lbl.style, { flexShrink: '0', letterSpacing: '0.05em' });
    bar.appendChild(lbl);

    // Preset pills
    const pills = document.createElement('div');
    Object.assign(pills.style, { display: 'flex', gap: '4px', flexShrink: '0' });

    PRESETS.forEach(function (preset) {
      const btn = document.createElement('button');
      btn.textContent = preset.label;
      btn.dataset.presetId = preset.id;
      Object.assign(btn.style, {
        padding: '3px 10px',
        borderRadius: '100px',
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'transparent',
        color: 'rgba(255,255,255,0.55)',
        fontSize: '11px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      });
      btn.addEventListener('mouseenter', function () {
        if (window.__SW_CREDS?.id !== preset.id) {
          btn.style.background = 'rgba(255,255,255,0.06)';
        }
      });
      btn.addEventListener('mouseleave', function () {
        if (window.__SW_CREDS?.id !== preset.id) {
          btn.style.background = 'transparent';
        }
      });
      btn.addEventListener('click', function () {
        selectPreset(preset);
      });
      pills.appendChild(btn);
    });
    bar.appendChild(pills);

    // ── Theme toggle (Auto · Light · Dark) ─────────────────────────────
    const themeGroup = document.createElement('div');
    themeGroup.id = 'sw-scaffold-theme-group';
    Object.assign(themeGroup.style, {
      display: 'inline-flex',
      gap: '2px',
      padding: '2px',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '100px',
      flexShrink: '0',
      marginLeft: '4px',
    });
    [
      { id: 'system', icon: '◐', title: 'Follow system' },
      { id: 'light',  icon: '☀',  title: 'Light' },
      { id: 'dark',   icon: '☾',  title: 'Dark' },
    ].forEach(function (opt) {
      const b = document.createElement('button');
      b.dataset.themeId = opt.id;
      b.textContent = opt.icon;
      b.title = opt.title;
      Object.assign(b.style, {
        padding: '0 8px',
        height: '22px',
        minWidth: '24px',
        border: 'none',
        background: 'transparent',
        color: 'rgba(255,255,255,0.55)',
        fontSize: '13px',
        lineHeight: '1',
        borderRadius: '100px',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      });
      b.addEventListener('click', function () { saveTheme(opt.id); });
      themeGroup.appendChild(b);
    });
    bar.appendChild(themeGroup);

    // Custom button
    const customBtn = document.createElement('button');
    customBtn.id = 'sw-scaffold-custom-btn';
    customBtn.textContent = 'Custom ▾';
    Object.assign(customBtn.style, {
      padding: '3px 10px',
      borderRadius: '100px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'transparent',
      color: 'rgba(255,255,255,0.55)',
      fontSize: '11px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background 0.15s',
      flexShrink: '0',
    });
    customBtn.addEventListener('click', toggleCustomForm);
    bar.appendChild(customBtn);

    // Divider
    const div = document.createElement('span');
    div.textContent = '|';
    Object.assign(div.style, { color: 'rgba(255,255,255,0.12)', flexShrink: '0' });
    bar.appendChild(div);

    // Current token + destination summary
    const summary = document.createElement('span');
    summary.id = 'sw-scaffold-summary';
    Object.assign(summary.style, {
      flex: '1',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      color: 'rgba(255,255,255,0.3)',
      fontFamily: 'monospace',
      fontSize: '11px',
    });
    bar.appendChild(summary);

    // Dismiss
    const close = document.createElement('button');
    close.textContent = '×';
    Object.assign(close.style, {
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,0.3)',
      fontSize: '18px',
      lineHeight: '1',
      cursor: 'pointer',
      padding: '0 2px',
      flexShrink: '0',
    });
    close.title = 'Dismiss (credential still active)';
    close.addEventListener('click', function () {
      bar.style.display = 'none';
      document.body.style.paddingTop = '0';
    });
    bar.appendChild(close);

    // Custom form (hidden by default)
    const form = document.createElement('div');
    form.id = 'sw-scaffold-custom-form';
    Object.assign(form.style, {
      display: 'none',
      position: 'fixed',
      top: BAR_H + 'px',
      left: '0',
      right: '0',
      background: '#0d0e1a',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '10px 14px',
      gap: '8px',
      alignItems: 'center',
      zIndex: '99998',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
    });

    const tokenInput = document.createElement('input');
    tokenInput.id = 'sw-scaffold-token-input';
    tokenInput.placeholder = 'token (c2c_… / c2t_… / eyJ…)';
    Object.assign(tokenInput.style, inputStyle());

    const destInput = document.createElement('input');
    destInput.id = 'sw-scaffold-dest-input';
    destInput.placeholder = 'destination  e.g. /public/test-room';
    Object.assign(destInput.style, inputStyle());

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    Object.assign(applyBtn.style, {
      padding: '5px 14px',
      background: '#044ef5',
      border: 'none',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      flexShrink: '0',
    });
    applyBtn.addEventListener('click', function () {
      const t = tokenInput.value.trim();
      const d = destInput.value.trim();
      if (!t) { tokenInput.focus(); return; }
      selectCustom(t, d);
      form.style.display = 'none';
    });

    form.appendChild(tokenInput);
    form.appendChild(destInput);
    form.appendChild(applyBtn);
    document.body.appendChild(form);
    document.body.appendChild(bar);

    // Sync UI to current state
    updateUI();
    applyToElements();
  }

  function inputStyle() {
    return {
      flex: '1',
      minWidth: '180px',
      padding: '5px 10px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '6px',
      color: 'rgba(255,255,255,0.8)',
      fontSize: '12px',
      fontFamily: 'monospace',
      outline: 'none',
    };
  }

  function toggleCustomForm() {
    const form = document.getElementById('sw-scaffold-custom-form');
    if (!form) return;
    const visible = form.style.display !== 'none';
    form.style.display = visible ? 'none' : 'flex';
    if (!visible) {
      const tokenInput = document.getElementById('sw-scaffold-token-input');
      const destInput = document.getElementById('sw-scaffold-dest-input');
      if (tokenInput) tokenInput.value = window.__SW_CREDS?.token || '';
      if (destInput) destInput.value = window.__SW_CREDS?.destination || '';
      if (tokenInput) tokenInput.focus();
    }
  }

  function selectPreset(preset) {
    saveCreds(preset);
    const form = document.getElementById('sw-scaffold-custom-form');
    if (form) form.style.display = 'none';
    updateUI();
    applyToElements();
  }

  function selectCustom(token, destination) {
    saveCreds({ id: 'custom', label: 'Custom', token, destination });
    updateUI();
    applyToElements();
  }

  function updateThemeUI() {
    const current = loadTheme();
    document.querySelectorAll('#sw-scaffold-theme-group button[data-theme-id]').forEach(function (btn) {
      const active = btn.dataset.themeId === current;
      btn.style.background = active ? 'rgba(4,78,245,0.25)' : 'transparent';
      btn.style.color = active ? '#7aa2f7' : 'rgba(255,255,255,0.55)';
    });
  }

  function updateUI() {
    const creds = window.__SW_CREDS || {};
    updateThemeUI();

    // Highlight active preset pill
    document.querySelectorAll('#sw-scaffold-bar button[data-preset-id]').forEach(function (btn) {
      const active = btn.dataset.presetId === creds.id;
      btn.style.background = active ? 'rgba(4,78,245,0.25)' : 'transparent';
      btn.style.borderColor = active ? '#044ef5' : 'rgba(255,255,255,0.15)';
      btn.style.color = active ? '#7aa2f7' : 'rgba(255,255,255,0.55)';
    });

    // Highlight custom button
    const customBtn = document.getElementById('sw-scaffold-custom-btn');
    if (customBtn) {
      const active = creds.id === 'custom';
      customBtn.style.background = active ? 'rgba(4,78,245,0.25)' : 'transparent';
      customBtn.style.borderColor = active ? '#044ef5' : 'rgba(255,255,255,0.15)';
      customBtn.style.color = active ? '#7aa2f7' : 'rgba(255,255,255,0.55)';
    }

    // Summary text
    const summary = document.getElementById('sw-scaffold-summary');
    if (summary) {
      const tok = creds.token ? truncate(creds.token, 28) : '—';
      const dest = creds.destination || '—';
      summary.textContent = tok + '  →  ' + dest;
      summary.title = (creds.token || '') + '  →  ' + (creds.destination || '');
    }
  }

  // ── Boot ─────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBar);
  } else {
    renderBar();
  }
})();
