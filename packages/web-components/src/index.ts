/**
 * @signalwire/web-components
 * UI Components Library built with Lit
 */

// SDK-aware components (sw-* family)
export { SwCallMedia } from './components/sw-call-media.js';
export { SwSelfMedia } from './components/sw-self-media.js';
export { SwLocalCamera } from './components/sw-local-camera.js';
export { SwParticipants } from './components/sw-participants.js';
export { SwParticipantControls } from './components/sw-participant-controls.js';
export { SwAudioLevel } from './components/sw-audio-level.js';
export { SwCallControls } from './components/sw-call-controls.js';
export { SwCallStatus } from './components/sw-call-status.js';
export { SwCallProvider } from './components/sw-call-provider.js';
export { SwCallDialpad } from './components/sw-call-dialpad.js';
export { SwClickToCall } from './components/sw-click-to-call.js';
export { SwDirectory } from './components/sw-directory.js';
export { SwDeviceSelector } from './components/sw-device-selector/index.js';
export { SwCallWidget } from './components/sw-call-widget/sw-call-widget.js';

// UI primitives (sw-ui-* family)
export * from './components/UI/index.js';

// Export types (re-exported from core)
export type { Call, CallParticipant, CallSelfParticipant, DeviceController, LayoutLayer, Participant } from './types/index.js';

// Export context
export * from './context/index.js';

// Theming utilities
export { useGoogleFont } from './utils/use-google-font.js';
export type { UseGoogleFontOptions } from './utils/use-google-font.js';
export { ensureSignalWireTheme, ensureSignalWireFonts } from './utils/theme-loader.js';

// Re-export Lit utilities for convenience
export { html, css, LitElement } from 'lit';
export type { TemplateResult, CSSResult } from 'lit';

// ============================================================================
// Library Ready Event (for async/dynamic script loading)
// ============================================================================

declare const __VERSION__: string;

/**
 * Library version from package.json, injected at build time.
 */
export const version: string = __VERSION__;

/**
 * Flag indicating the library has been loaded and is ready to use.
 */
export const ready: boolean = true;

/**
 * Emits 'signalwire:web-components:ready' event when the library is loaded.
 *
 * Scripts that might load BEFORE the library (check flag first):
 *    ```js
 *    if (window.SignalWireUI?.ready) {
 *      // Library already loaded, use it directly
 *      initApp();
 *    } else {
 *      window.addEventListener('signalwire:web-components:ready', () => initApp());
 *    }
 *    ```
 */
const emitReadyEvent = (): void => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('signalwire:web-components:ready', {
      detail: { version: __VERSION__ }
    });
    window.dispatchEvent(event);
  }
};

emitReadyEvent();
