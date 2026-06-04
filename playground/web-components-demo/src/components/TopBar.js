/**
 * Top Bar Component
 * Displays logo, registration toggle, and user info
 */

export function renderTopBar(container, state) {
  const template = document.createElement('template');
  template.innerHTML = `
    <header class="topbar">
      <div class="topbar-left">
        <svg class="logo" width="140" height="32" viewBox="0 0 140 32" fill="none">
          <text x="0" y="24" fill="#044EF5" font-family="system-ui" font-weight="600" font-size="20">SignalWire</text>
        </svg>
      </div>

      <div class="topbar-center">
        <span class="status-dot ${state.isRegistered ? 'connected' : ''}"></span>
        <span class="status-label">${state.isRegistered ? 'Registered' : 'Unregistered'}</span>
        <label class="toggle" aria-label="Registration toggle">
          <input type="checkbox" id="registration-toggle" ${state.isRegistered ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="topbar-right">
        ${state.isRegistered && state.displayName ? `
          <span class="user-name">${escapeHtml(state.displayName)}</span>
        ` : ''}
        <div class="channel-badges">
          ${state.channels.audio ? '<span class="badge" title="Audio available" aria-label="Audio channel available"><svg class="badge-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></span>' : ''}
          ${state.channels.video ? '<span class="badge" title="Video available" aria-label="Video channel available"><svg class="badge-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></span>' : ''}
          ${state.channels.messaging ? '<span class="badge" title="Messaging available" aria-label="Messaging channel available"><svg class="badge-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></span>' : ''}
        </div>
      </div>
    </header>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--topbar-height);
      padding: 0 var(--space-lg);
      background-color: var(--color-background);
      border-bottom: 1px solid var(--color-border);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .topbar-left {
      display: flex;
      align-items: center;
    }

    .topbar-center {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .status-label {
      font-size: var(--font-size-caption);
      color: var(--color-text-secondary);
      margin-right: var(--space-sm);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .user-name {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .channel-badges {
      display: flex;
      gap: var(--space-xs);
    }

    .badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background-color: var(--color-surface);
      border-radius: 6px;
      color: var(--color-text-secondary);
    }

    .badge-icon {
      width: 18px;
      height: 18px;
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Set up event handlers
  const toggle = container.querySelector('#registration-toggle');
  toggle.addEventListener('change', async () => {
    if (!state.signalWire) return;

    try {
      if (toggle.checked) {
        await state.signalWire.register();
      } else {
        await state.signalWire.unregister();
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Revert toggle
      toggle.checked = !toggle.checked;
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
