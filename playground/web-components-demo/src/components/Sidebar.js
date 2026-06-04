/**
 * Sidebar Component
 * Navigation menu with collapsible state
 *
 * Features:
 * - Collapsible sidebar with menu items
 * - Secondary panel for directory (slides out from sidebar)
 * - Directory panel accessible during active calls
 */

const menuItems = [
  { id: 'devices', label: 'Select Devices', icon: 'settings' },
  { id: 'directory', label: 'Open Directory', icon: 'contacts', hasPanel: true },
  { id: 'dialpad', label: 'Dialpad Calls', icon: 'dialpad' },
  { id: 'quickcall', label: 'Quick Call', icon: 'quickcall' }
];

const icons = {
  settings: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
  contacts: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 0H4v2h16V0zM4 24h16v-2H4v2zM20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75c1.24 0 2.25 1.01 2.25 2.25s-1.01 2.25-2.25 2.25S9.75 10.24 9.75 9 10.76 6.75 12 6.75zM17 17H7v-1.5c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z"/></svg>`,
  dialpad: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 19c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
  quickcall: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>`,
  collapse: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`
};

export function renderSidebar(container, state) {
  const isExpanded = state.sidebarExpanded;
  // Track whether directory panel is open (opened via clicking "Open Directory")
  const isDirectoryPanelOpen = state.directoryPanelOpen || false;

  const template = document.createElement('template');
  template.innerHTML = `
    <div class="sidebar-wrapper ${isDirectoryPanelOpen ? 'with-panel' : ''}">
      <nav class="sidebar ${isExpanded ? 'expanded' : 'collapsed'}" aria-label="Main navigation">
        <ul class="sidebar-menu" role="menu">
          ${menuItems.map(item => {
            // Determine if this item should be highlighted:
            // - Regular items are highlighted when they're the current view AND directory panel is closed
            // - Directory item is highlighted when its panel is open
            const isActive = item.hasPanel
              ? isDirectoryPanelOpen  // Directory is active when panel is open
              : (state.currentView === item.id && !isDirectoryPanelOpen);  // Other items active only when directory panel is closed

            return `
            <li role="none">
              <button
                class="sidebar-item ${isActive ? 'active' : ''}"
                data-view="${item.id}"
                ${item.hasPanel ? 'data-has-panel="true"' : ''}
                role="menuitem"
                aria-current="${isActive ? 'page' : 'false'}"
                ${!isExpanded ? `data-tooltip="${item.label}"` : ''}
              >
                <span class="sidebar-icon" aria-hidden="true">${icons[item.icon]}</span>
                ${isExpanded ? `<span class="sidebar-label">${item.label}</span>` : ''}
              </button>
            </li>
          `}).join('')}
        </ul>

        <button class="sidebar-toggle" aria-label="${isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}">
          <span class="sidebar-icon">${isExpanded ? icons.collapse : icons.expand}</span>
          ${isExpanded ? '<span class="sidebar-label">Collapse</span>' : ''}
        </button>
      </nav>

      <!-- Secondary directory panel - accessible during calls -->
      <div class="directory-panel ${isDirectoryPanelOpen ? 'open' : ''}" aria-label="Directory panel">
        <div class="directory-panel-header">
          <h3>Directory</h3>
          <button class="directory-panel-close" aria-label="Close directory panel">
            ${icons.collapse}
          </button>
        </div>
        <div class="directory-panel-content">
          <sw-directory id="sidebar-directory"></sw-directory>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    /* Sidebar wrapper containing both navigation and directory panel */
    .sidebar-wrapper {
      display: flex;
      height: 100%;
      transition: width var(--transition-sidebar);
      position: relative;
      z-index: 10;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--color-surface);
      border-right: 1px solid var(--color-border);
      transition: width var(--transition-sidebar);
      overflow: hidden;
      flex-shrink: 0;
    }

    .sidebar.expanded {
      width: var(--sidebar-width-expanded);
    }

    .sidebar.collapsed {
      width: var(--sidebar-width-collapsed);
      overflow: visible;
    }

    .sidebar-menu {
      flex: 1;
      list-style: none;
      padding: var(--space-sm);
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      width: 100%;
      padding: var(--space-md);
      border: none;
      border-radius: 8px;
      background-color: transparent;
      color: var(--color-text-secondary);
      font-size: var(--font-size-body);
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast);
      text-align: left;
    }

    .sidebar-item:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--color-text-primary);
    }

    .sidebar-item.active {
      background-color: rgba(4, 78, 245, 0.1);
      color: var(--color-primary);
    }

    .sidebar-item.active .sidebar-icon {
      color: var(--color-primary);
    }


    .sidebar-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .sidebar-icon svg {
      width: 100%;
      height: 100%;
    }

    .sidebar-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      width: calc(100% - var(--space-md));
      margin: var(--space-sm);
      padding: var(--space-md);
      border: none;
      border-radius: 8px;
      background-color: transparent;
      color: var(--color-text-secondary);
      font-size: var(--font-size-body);
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .sidebar-toggle:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    .sidebar.collapsed .sidebar-item,
    .sidebar.collapsed .sidebar-toggle {
      justify-content: center;
    }

    /* Tooltip styles for collapsed sidebar */
    .sidebar.collapsed .sidebar-item[data-tooltip] {
      position: relative;
    }

    .sidebar.collapsed .sidebar-item[data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      left: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);
      background-color: var(--color-text-primary);
      color: var(--color-background);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: var(--font-size-caption);
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity var(--transition-fast), visibility var(--transition-fast);
      z-index: 100;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .sidebar.collapsed .sidebar-item[data-tooltip]:hover::after {
      opacity: 1;
      visibility: visible;
    }

    /* Directory Panel - Secondary panel that slides out from sidebar */
    .directory-panel {
      width: 0;
      height: 100%;
      background-color: var(--color-background);
      border-right: 1px solid var(--color-border);
      overflow: hidden;
      transition: width var(--transition-sidebar);
      display: flex;
      flex-direction: column;
    }

    .directory-panel.open {
      width: 300px;
    }

    .directory-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md);
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-surface);
    }

    .directory-panel-header h3 {
      font-size: var(--font-size-h2);
      font-weight: var(--font-weight-semibold);
      margin: 0;
    }

    .directory-panel-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background-color: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .directory-panel-close:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    .directory-panel-close svg {
      width: 20px;
      height: 20px;
    }

    .directory-panel-content {
      flex: 1;
      overflow: auto;
      padding: var(--space-md);
    }

    .directory-panel-content sw-directory {
      height: 100%;
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Set up event handlers
  const menuButtons = container.querySelectorAll('.sidebar-item');
  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      const hasPanel = btn.dataset.hasPanel === 'true';

      if (hasPanel) {
        // Toggle directory panel instead of changing view
        // The directory panel slides out from the sidebar and remains
        // accessible during calls - this is the key feature!
        state.directoryPanelOpen = !state.directoryPanelOpen;
        // Don't change main content view - directory is only in sidebar panel
      } else {
        // Normal navigation - only change view if no active call
        // (during a call, only directory panel is accessible)
        if (!state.activeCall) {
          state.currentView = view;
          // Close directory panel when navigating to other views
          // This ensures only one menu item is highlighted at a time
          state.directoryPanelOpen = false;
        }
      }
    });
  });

  const toggleBtn = container.querySelector('.sidebar-toggle');
  toggleBtn.addEventListener('click', () => {
    state.sidebarExpanded = !state.sidebarExpanded;
  });

  // Close button for directory panel
  const closePanelBtn = container.querySelector('.directory-panel-close');
  if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => {
      state.directoryPanelOpen = false;
    });
  }

  // Connect directory component to SignalWire client
  const directory = container.querySelector('#sidebar-directory');
  if (directory && state.signalWire) {
    directory.directory = state.signalWire.directory;

    // Handle call initiation from directory panel
    // The sw-directory component dispatches 'sw-dial' when the call button is clicked
    directory.addEventListener('sw-dial', async (event) => {
      const { address } = event.detail;
      if (!state.signalWire || !state.isRegistered) {
        console.error('Cannot initiate call: not registered');
        return;
      }

      try {
        // If already on a call, hang up first
        if (state.activeCall) {
          await state.activeCall.hangup();
          state.activeCall = null;
        }

        // Get the default channel for this address (video for rooms, audio for others)
        const channel = address.defaultChannel;
        if (!channel) {
          console.error(`No callable channel found for ${address.displayName}`);
          return;
        }

        // dial() takes destination as first param, options as second
        // Use video for room-type addresses, audio-only for others
        const call = await state.signalWire.dial(channel, {
          audio: true,
          video: address.type === 'room'
        });

        state.activeCall = call;

        // Subscribe to call end
        const statusSub = call.status$.subscribe(status => {
          if (status === 'destroyed' || status === 'failed') {
            state.activeCall = null;
            statusSub.unsubscribe();
            errorSub.unsubscribe();
          }
        });

        // Subscribe to call errors — fatal errors auto-destroy the call
        const errorSub = call.errors$.subscribe(callError => {
          console.error(`[Sidebar] Call error [${callError.kind}]:`, callError.error);
        });
      } catch (error) {
        console.error('Failed to initiate call from directory:', error);
      }
    });
  }
}
