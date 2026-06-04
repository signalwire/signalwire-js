/**
 * React JSX type declarations for SignalWire web components.
 *
 * Provides proper element types so `useRef<SwCallMedia>()` gives access
 * to component properties like `.call` without type casting.
 *
 * Usage:
 *   /// <reference types="@signalwire/web-components/react" />
 *
 * Or add to tsconfig.json:
 *   { "compilerOptions": { "types": ["@signalwire/web-components/react"] } }
 *
 * Then in your component:
 *   import type { SwCallMedia } from '@signalwire/web-components';
 *   const ref = useRef<SwCallMedia>(null);
 *   ref.current.call = call;  // fully typed, no cast needed
 */

import type { SwCallMedia } from './components/sw-call-media.js';
import type { SwSelfMedia } from './components/sw-self-media.js';
import type { SwLocalCamera } from './components/sw-local-camera.js';
import type { SwCallControls } from './components/sw-call-controls.js';
import type { SwCallStatus } from './components/sw-call-status.js';
import type { SwCallProvider } from './components/sw-call-provider.js';
import type { SwCallDialpad } from './components/sw-call-dialpad.js';
import type { SwCallWidget } from './components/sw-call-widget/sw-call-widget.js';
import type { SwDeviceSelector } from './components/sw-device-selector/sw-device-selector.js';
import type { SwAudioLevel } from './components/sw-audio-level.js';
import type { SwUiDialpad } from './components/UI/controls/sw-ui-dialpad.js';
import type { SwClickToCall } from './components/sw-click-to-call.js';
import type { SwDirectory } from './components/sw-directory.js';
import type { SwParticipantControls } from './components/sw-participant-controls.js';
import type { SwParticipants } from './components/sw-participants.js';

export {};

/**
 * Helper: maps a Lit element class to a React JSX props type.
 * Uses the actual element class for ref typing.
 */
type SWProps<E extends HTMLElement, A = object> = React.DetailedHTMLProps<
  React.HTMLAttributes<E> & A,
  E
>;

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      /** Remote video container and call context provider. */
      'sw-call-media': SWProps<SwCallMedia>;

      /** Local video overlay with optional mirror mode. */
      'sw-self-media': SWProps<
        SwSelfMedia,
        {
          mirror?: boolean;
        }
      >;

      /** Local camera preview (devices-context aware). */
      'sw-local-camera': SWProps<
        SwLocalCamera,
        {
          mirror?: boolean;
        }
      >;

      /** Mute, hangup, and screen-share controls. */
      'sw-call-controls': SWProps<
        SwCallControls,
        {
          orientation?: 'horizontal' | 'vertical';
          'show-tooltips'?: boolean;
        }
      >;

      /** Call status display with duration timer. */
      'sw-call-status': SWProps<SwCallStatus>;

      /** Provides Call/Devices/Transcript context to descendants. */
      'sw-call-provider': SWProps<SwCallProvider>;

      /** DTMF dialpad bound to the active call. */
      'sw-call-dialpad': SWProps<SwCallDialpad>;

      /** Drop-in widget composing call media, controls, and transcript. */
      'sw-call-widget': SWProps<
        SwCallWidget,
        {
          token?: string;
          host?: string;
          destination?: string;
          'audio-only'?: boolean;
        }
      >;

      /** Media device dropdowns with optional preview. */
      'sw-device-selector': SWProps<
        SwDeviceSelector,
        {
          'show-preview'?: boolean;
        }
      >;

      /** Real-time audio level visualizer. */
      'sw-audio-level': SWProps<
        SwAudioLevel,
        {
          bars?: number;
          orientation?: 'vertical' | 'horizontal';
          'max-size'?: number;
        }
      >;

      /** DTMF dialpad. */
      'sw-ui-dialpad': SWProps<
        SwUiDialpad,
        {
          'show-call-button'?: boolean;
          placeholder?: string;
        }
      >;

      /** Single-button call widget. */
      'sw-click-to-call': SWProps<
        SwClickToCall,
        {
          destination?: string;
          label?: string;
          'audio-only'?: boolean;
        }
      >;

      /** Searchable contact directory. */
      'sw-directory': SWProps<SwDirectory>;

      /** Per-participant mute, volume, and remove controls. */
      'sw-participant-controls': SWProps<
        SwParticipantControls,
        {
          'show-volume'?: boolean;
          'show-pin'?: boolean;
        }
      >;

      /** Remote participant overlay list. */
      'sw-participants': SWProps<SwParticipants>;
    }
  }
}
