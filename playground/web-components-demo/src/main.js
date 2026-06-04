/**
 * SignalWire WebRTC Demo Application
 * Main entry point
 *
 * This demo showcases all UI components from @signalwire/web-components:
 * - sw-call-media: Remote video display
 * - sw-self-media: Local video preview (mirrored)
 * - sw-call-controls: Mute audio, mute video, screen share, hangup
 * - sw-call-status: Call state and duration timer
 * - sw-participants: Participant overlays on video
 * - sw-participant-controls: Control individual participants
 * - sw-device-selector: Device selection dropdowns with preview
 * - sw-audio-level: Microphone level visualization
 * - sw-directory: Searchable address book
 * - sw-call-dialpad: Telephone keypad for manual dialing
 * - sw-click-to-call: One-click call widget
 *
 * @see https://github.com/signalwire/js for SDK documentation
 */

// Import UI components library - this registers all custom elements globally
// After this import, you can use <sw-call-media>, <sw-directory>, etc. in HTML
import '@signalwire/web-components';

// Import application modules
import { AppState } from './utils/state.js';
import { renderApp } from './components/App.js';

// Initialize application state with observable pattern
// State changes automatically trigger UI re-renders via subscriptions
const appState = new AppState();

/**
 * Initialize and render the application
 * Sets up the main app container and starts the render cycle
 */
function init() {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }

  // renderApp subscribes to state changes and re-renders on updates
  renderApp(appContainer, appState);
}

// Initialize when DOM is ready
// This ensures all HTML elements are available before we try to render
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Clean disconnection on page unload
// Important: Always disconnect the client to properly close WebSocket connections
// and clean up resources on the server side
window.addEventListener('beforeunload', () => {
  if (appState.signalWire) {
    appState.signalWire.disconnect();
  }
});
