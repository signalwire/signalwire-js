/**
 * Main Content Component
 * Renders the active view based on current state
 *
 * IMPORTANT: This component tracks the current view to avoid unnecessary re-renders.
 * Re-rendering destroys web components like sw-device-selector which hold media streams.
 * Only re-render when the actual view changes, not on every state update.
 */

import { renderDevicesView } from './views/DevicesView.js';
import { renderDirectoryView } from './views/DirectoryView.js';
import { renderDialpadView } from './views/DialpadView.js';
import { renderCallView } from './views/CallView.js';
import { renderClickToCallView } from './views/ClickToCallView.js';

/**
 * Determine the effective view based on state
 * @param {Object} state - Application state
 * @returns {string} The view to render
 */
function getEffectiveView(state) {
  if (state.activeCall) return 'call';
  return state.currentView || 'devices';
}

export function renderMainContent(container, state) {
  const effectiveView = getEffectiveView(state);

  // Skip re-render if view hasn't changed - prevents destroying media streams
  // This is critical for sw-device-selector which holds camera/microphone streams
  if (container._currentView === effectiveView) {
    // For call view, we still need to update (call state changes frequently)
    if (effectiveView === 'call') {
      renderCallView(container, state);
    }
    return;
  }

  // View changed - cleanup previous view's resources
  if (typeof container._audioLevelCleanup === 'function') {
    container._audioLevelCleanup();
    container._audioLevelCleanup = null;
  }

  // Track current view to prevent unnecessary re-renders
  container._currentView = effectiveView;

  // Render the appropriate view
  switch (effectiveView) {
    case 'call':
      renderCallView(container, state);
      break;
    case 'devices':
      renderDevicesView(container, state);
      break;
    case 'directory':
      renderDirectoryView(container, state);
      break;
    case 'dialpad':
      renderDialpadView(container, state);
      break;
    case 'quickcall':
      renderClickToCallView(container, state);
      break;
    default:
      renderDevicesView(container, state);
  }
}
