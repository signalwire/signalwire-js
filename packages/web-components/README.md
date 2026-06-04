# @signalwire/web-components

UI Components library built with Lit for SignalWire TypeScript SDK.

## Features

- Built with [Lit](https://lit.dev/) - A simple library for building fast, lightweight web components
- TypeScript support with full type definitions
- Context-based state sharing using `@lit/context`
- RxJS observable-driven data flow
- CSS Custom Properties for theming (dark mode ready)
- Accessible components with ARIA attributes and keyboard navigation
- Custom Elements that work in any framework

## Installation

```bash
npm install @signalwire/web-components
```

## Quick Start

```typescript
import '@signalwire/web-components';

// Or import specific components
import '@signalwire/web-components/sw-call-status';
import '@signalwire/web-components/sw-call-media';
import '@signalwire/web-components/sw-self-media';
```

```html
<!-- Basic video call layout -->
<sw-call-media .call="${call}">
  <sw-participants>
    <sw-self-media mirror></sw-self-media>
  </sw-participants>
</sw-call-media>
<sw-call-controls></sw-call-controls>
```

---

## Components

### sw-call-media

Root container component that renders the remote video stream and provides call context to child components.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `call` | `Call` | - | Call object with streams and layout data |

**CSS Custom Properties:**

```css
sw-call-media {
  --sw-color-primary: #044cf6;
  --sw-color-background: #000000;
  --sw-border-radius: 0px;
}
```

**CSS Parts:** `container`, `video`, `layers`

**Usage:**

```html
<!-- Basic usage -->
<sw-call-media .call="${call}"></sw-call-media>

<!-- With child components -->
<sw-call-media .call="${call}">
  <sw-participants>
    <sw-self-media></sw-self-media>
  </sw-participants>
</sw-call-media>
```

```typescript
// JavaScript/TypeScript
const callMedia = document.querySelector('sw-call-media');
callMedia.call = myCallObject;
```

---

### sw-self-media

Renders the local video stream as an overlay with positioning from layout layers.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mirror` | `boolean` | `false` | Mirror video horizontally |

**CSS Parts:** `container`, `video`

**Context:** Consumes `callContext` from parent `sw-call-media`

**Usage:**

```html
<!-- Basic usage (inside sw-participants) -->
<sw-participants>
  <sw-self-media></sw-self-media>
</sw-participants>

<!-- With mirrored video -->
<sw-participants>
  <sw-self-media mirror></sw-self-media>
</sw-participants>
```

---

### sw-participants

Renders overlay containers for all remote participants based on layout layer data.

**CSS Parts:** `overlay`, `name`, `indicators`

**Context:** Consumes `callContext` from parent `sw-call-media`

**Usage:**

```html
<!-- Basic usage -->
<sw-call-media .call="${call}">
  <sw-participants></sw-participants>
</sw-call-media>

<!-- With local video as child -->
<sw-call-media .call="${call}">
  <sw-participants>
    <sw-self-media mirror></sw-self-media>
  </sw-participants>
</sw-call-media>
```

---

### sw-call-controls

Responsive button bar for call actions: mute audio, mute video, screen share, and hangup.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `call` | `CallControlsCall` | - | Call object (optional if using context) |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Button layout direction |
| `showTooltips` | `boolean` | `true` | Show hover tooltips |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| `sw-mute-audio` | `{ muted: boolean }` | Audio mute toggled |
| `sw-mute-video` | `{ muted: boolean }` | Video mute toggled |
| `sw-screen-share` | `{ active: boolean }` | Screen share toggled |
| `sw-hangup` | - | Call ended |

**CSS Custom Properties:**

```css
sw-call-controls {
  --sw-color-primary: #044cf6;
  --sw-color-danger: #ef4444;
  --sw-color-active: #ef4444;
  --sw-button-size: 48px;
  --sw-button-gap: 12px;
}
```

**CSS Parts:** `container`, `button`, `button-active`, `button-disabled`, `tooltip`

**Usage:**

```html
<!-- Basic usage (uses context from sw-call-media) -->
<sw-call-media .call="${call}">
  <!-- ... -->
</sw-call-media>
<sw-call-controls></sw-call-controls>

<!-- With explicit call property -->
<sw-call-controls .call="${call}" orientation="vertical"></sw-call-controls>

<!-- Without tooltips -->
<sw-call-controls show-tooltips="false"></sw-call-controls>
```

```typescript
// Listen for events
const controls = document.querySelector('sw-call-controls');

controls.addEventListener('sw-mute-audio', (e) => {
  console.log('Audio muted:', e.detail.muted);
});

controls.addEventListener('sw-hangup', () => {
  console.log('Call ended');
});
```

---

### sw-call-status

Displays call state, status text, and duration timer.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `call` | `CallStatusCall` | - | Call with status$ observable |

**Status Values:** `new`, `trying`, `ringing`, `connecting`, `connected`, `disconnecting`, `disconnected`, `failed`, `destroyed`

**CSS Custom Properties:**

```css
sw-call-status {
  --sw-color-primary: #044cf6;
  --sw-color-success: #10b981;
  --sw-color-warning: #f59e0b;
  --sw-color-danger: #ef4444;
}
```

**CSS Parts:** `container`, `status-text`, `duration`

**Usage:**

```html
<!-- Basic usage (uses context) -->
<sw-call-status></sw-call-status>

<!-- With explicit call -->
<sw-call-status .call="${call}"></sw-call-status>
```

---

### sw-ui-dialpad

12-key telephone keypad for DTMF tones and dialing. (Replaces the legacy
`<sw-dialpad>` element, which has been removed.)

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showCallButton` | `boolean` | `false` | Show call button below keypad |
| `placeholder` | `string` | `'Enter number'` | Input placeholder text |
| `allowText` | `boolean` | `false` | Allow free-text input in the display |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| `sw-digit-press` | `{ digit: string, digits: string }` | Key pressed |
| `sw-dialpad-backspace` | `{ digits: string }` | Backspace pressed |
| `sw-dialpad-input` | `{ digits: string }` | Free-text input changed (when `allow-text`) |
| `sw-dial` | `{ digits: string }` | Call button clicked |

**Theming:** styled via the design tokens in `theme.css`
(`--fg-default`, `--bg-surface`, `--interactive-button-primary-bg`, …) plus
local knobs `--sw-dialpad-display-size` and `--sw-dialpad-key-size`.

**Usage:**

```html
<!-- Basic DTMF dialpad -->
<sw-ui-dialpad></sw-ui-dialpad>

<!-- With call button for dialing -->
<sw-ui-dialpad show-call-button placeholder="Phone number"></sw-ui-dialpad>
```

```typescript
const dialpad = document.querySelector('sw-ui-dialpad');

dialpad.addEventListener('sw-dial', (e) => {
  console.log('Dialing:', e.detail.digits);
});

dialpad.addEventListener('sw-digit-press', (e) => {
  console.log('Pressed:', e.detail.digit);
});
```

---

### sw-device-selector

Dropdown for selecting audio/video input and output devices.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `deviceController` | `DeviceController` | - | Device management object |
| `showPreview` | `boolean` | `false` | Show preview panel with video/audio level |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| `sw-tab-change` | `{ tab: 'microphone' \| 'camera' \| 'speaker' }` | Tab changed |
| `sw-device-change` | `{ device: MediaDeviceInfo }` | Device selected |
| `sw-test-speaker` | - | Speaker test triggered |

**CSS Custom Properties:**

```css
sw-device-selector {
  --sw-color-primary: #044cf6;
  --sw-color-background: #1a1a1a;
  --sw-color-surface: #2a2a2a;
}
```

**CSS Parts:** `container`, `tabs`, `device-list`, `device-item`, `device-item-selected`, `preview`

**Usage:**

```html
<!-- Basic usage -->
<sw-device-selector .deviceController="${deviceController}"></sw-device-selector>

<!-- With preview panel -->
<sw-device-selector .deviceController="${deviceController}" show-preview> </sw-device-selector>
```

```typescript
// Listen for device changes
const selector = document.querySelector('sw-device-selector');

selector.addEventListener('sw-device-change', (e) => {
  const device = e.detail.device;
  console.log(`Selected ${device.kind}: ${device.label}`);
});
```

---

### sw-audio-level

Real-time audio level indicator using Web Audio API.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `stream` | `MediaStream` | - | MediaStream to analyze |
| `bars` | `number` | `5` | Number of bars to display |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Bar orientation |
| `maxSize` | `number` | `32` | Maximum bar height/width in pixels |

**CSS Custom Properties:**

```css
sw-audio-level {
  --sw-color-success: #10b981;
  --sw-color-warning: #f59e0b;
  --sw-color-danger: #ef4444;
  --sw-audio-bar-width: 4px;
  --sw-audio-bar-gap: 2px;
  --sw-audio-bar-radius: 2px;
  --sw-audio-bar-background: rgba(255, 255, 255, 0.2);
}
```

**CSS Parts:** `container`, `bar`, `bar-active`

**Usage:**

```html
<!-- Basic usage -->
<sw-audio-level .stream="${localStream}"></sw-audio-level>

<!-- Horizontal with more bars -->
<sw-audio-level .stream="${localStream}" orientation="horizontal" bars="10" maxSize="48">
</sw-audio-level>
```

---

### sw-click-to-call

Single button widget for calling a preconfigured destination.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `client` | `ClickToCallClient` | - | Client for initiating calls |
| `destination` | `string` | - | SIP address or number to call |
| `label` | `string` | `'Call'` | Button label text |
| `audioOnly` | `boolean` | `true` | Audio-only mode |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| `sw-dial` | `{ destination: string }` | Call initiated |
| `sw-mute-toggle` | `{ muted: boolean }` | Mute toggled during call |
| `sw-hangup` | - | Call ended |

**CSS Custom Properties:**

```css
sw-click-to-call {
  --sw-color-primary: #044cf6;
  --sw-color-success: #10b981;
  --sw-color-danger: #ef4444;
}
```

**CSS Parts:** `container`, `button`, `controls`, `status`, `duration`

**Usage:**

```html
<!-- Basic click-to-call button -->
<sw-click-to-call .client="${client}" destination="sip:support@example.com" label="Contact Support">
</sw-click-to-call>

<!-- Audio/video call -->
<sw-click-to-call
  .client="${client}"
  destination="+15551234567"
  label="Call Sales"
  audio-only="false"
>
</sw-click-to-call>
```

```typescript
const ctc = document.querySelector('sw-click-to-call');

ctc.addEventListener('sw-dial', (e) => {
  console.log('Calling:', e.detail.destination);
});

ctc.addEventListener('sw-hangup', () => {
  console.log('Call ended');
});
```

---

### sw-directory

Searchable list of directory addresses for selecting call destinations.

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `directory` | `DirectoryService` | - | Directory service with addresses observable |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| `sw-address-select` | `{ address: Address }` | Address selected (single click) |
| `sw-dial` | `{ address: Address }` | Address dialed (double-click) |

**CSS Custom Properties:**

```css
sw-directory {
  --sw-color-primary: #044cf6;
  --sw-color-success: #10b981;
  --sw-color-text: #1f2937;
}
```

**CSS Parts:** `container`, `search`, `list`, `item`, `item-selected`, `item-name`, `item-type`, `item-channels`

**Usage:**

```html
<!-- Basic directory list -->
<sw-directory .directory="${directoryService}"></sw-directory>
```

```typescript
const directory = document.querySelector('sw-directory');

// Single click selection
directory.addEventListener('sw-address-select', (e) => {
  console.log('Selected:', e.detail.address.name);
});

// Double click to dial
directory.addEventListener('sw-dial', (e) => {
  client.call({ destination: e.detail.address.id });
});
```

---

### sw-participant-controls

Control panel for individual participant actions (mute, volume, pin, remove).

**Properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `participant` | `ControlParticipant` | - | Participant to control |
| `capabilities` | `string[]` | `[]` | Available actions |
| `showVolume` | `boolean` | `false` | Show volume slider |
| `showPin` | `boolean` | `false` | Show pin button |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| `sw-participant-mute-audio` | `{ participant, muted: boolean }` | Audio muted |
| `sw-participant-mute-video` | `{ participant, muted: boolean }` | Video muted |
| `sw-participant-volume` | `{ participant, volume: number }` | Volume changed |
| `sw-participant-pin` | `{ participant, pinned: boolean }` | Pin toggled |
| `sw-participant-remove` | `{ participant }` | Participant removed |

**CSS Parts:** `container`, `action-button`, `slider`

**Usage:**

```html
<!-- Basic participant controls -->
<sw-participant-controls
  .participant=${participant}
  .capabilities=${['memberMuteAudio', 'memberMuteVideo', 'memberRemove']}>
</sw-participant-controls>

<!-- With volume and pin controls -->
<sw-participant-controls
  .participant=${participant}
  .capabilities=${['memberMuteAudio', 'memberMuteVideo']}
  show-volume
  show-pin>
</sw-participant-controls>
```

```typescript
const controls = document.querySelector('sw-participant-controls');

controls.addEventListener('sw-participant-mute-audio', (e) => {
  const { participant, muted } = e.detail;
  console.log(`${participant.name} audio ${muted ? 'muted' : 'unmuted'}`);
});
```

---

## UI Primitives (`sw-ui-*`)

In addition to the SDK-aware components above, the package exports a set of
presentational `sw-ui-*` primitives that have no dependency on
`@signalwire/js`. They are themed via the design tokens in
`@signalwire/web-components/theme.css` and can be used in any layout.

| Tag | Purpose |
|-----|---------|
| `sw-ui-icon` | Inline SVG icon by name (see `IconName` type) |
| `sw-ui-dropup` | Anchored dropdown panel that opens upward |
| `sw-ui-split-button` | Primary action paired with a chevron menu |
| `sw-ui-control-bar` | Mute / camera / screen-share / hand-raise / fullscreen bar |
| `sw-ui-dialpad` | DTMF keypad (see above) |
| `sw-ui-call-layout` | Fluid landscape/portrait video + transcript + controls layout |
| `sw-ui-background` | Bundled or remote background image with thumbnail fallback |
| `sw-ui-modal` | Dialog primitive with backdrop and focus management |
| `sw-ui-content-drawer` | Slide-in panel that renders text / markdown / code / html |
| `sw-ui-responsive-container` | Reports its own size class as an attribute |
| `sw-ui-alert` | Stackable alert / prompt with `showPrompt(...)` helper |
| `sw-ui-transcript-view` | Transcript renderer with Prism syntax highlighting |

Each primitive is also available as a subpath import:

```ts
import '@signalwire/web-components/sw-ui-modal';
import '@signalwire/web-components/sw-ui-call-layout';
import { showPrompt } from '@signalwire/web-components/sw-ui-alert';
```

`sw-ui-transcript-view` pulls in `marked`, `dompurify`, and `prismjs` at
runtime (lazy-loaded for the Prism language packs).

---

## Context System

The components use Lit context (`@lit/context`) to share call state. The `sw-call-media` component acts as the context provider, and child components automatically consume the call context.

```html
<!-- sw-call-media provides context -->
<sw-call-media .call="${call}">
  <!-- These components consume context automatically -->
  <sw-participants>
    <sw-self-media></sw-self-media>
  </sw-participants>
</sw-call-media>

<!-- Components outside sw-call-media need explicit call property -->
<sw-call-controls .call="${call}"></sw-call-controls>
<sw-call-status .call="${call}"></sw-call-status>
```

---

## Theming

All components support CSS Custom Properties for theming:

```css
/* Global theme */
:root {
  /* Primary colors */
  --sw-color-primary: #044cf6;
  --sw-color-success: #10b981;
  --sw-color-warning: #f59e0b;
  --sw-color-danger: #ef4444;

  /* Background colors */
  --sw-color-background: #000000;
  --sw-color-surface: #1a1a1a;

  /* Text colors */
  --sw-color-text: #ffffff;
  --sw-color-text-secondary: #9ca3af;

  /* Sizing */
  --sw-border-radius: 8px;
  --sw-button-size: 48px;
  --sw-button-gap: 12px;
}

/* Dark mode example */
@media (prefers-color-scheme: dark) {
  :root {
    --sw-color-background: #0a0a0a;
    --sw-color-surface: #1a1a1a;
    --sw-color-text: #ffffff;
  }
}
```

### Styling with CSS Parts

Use `::part()` to style internal elements:

```css
sw-call-controls::part(button) {
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

sw-call-controls::part(button-active) {
  background: var(--sw-color-danger);
}

sw-call-media::part(video) {
  border-radius: 12px;
}
```

---

## TypeScript Interfaces

```typescript
import type { Call, CallSelf, DeviceController, LayoutLayer, Participant } from '@signalwire/web-components';

// Call object interface
interface Call {
  self?: { id: string };
  remoteStream$: Observable<MediaStream | null>;
  localStream$: Observable<MediaStream | null>;
  layoutLayers$: Observable<LayoutLayer[]>;
  status$: Observable<CallStatus>;
}

// Layout layer for participant positioning
interface LayoutLayer {
  layer_index: number;
  z_index: number;
  member_id?: string;
  playing_file: boolean;
  position: VideoPosition;
  reservation: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

// DeviceController is imported from @signalwire/js via @signalwire/web-components
// It provides observables for device lists and selection methods.
// See @signalwire/js documentation for the full DeviceController interface.

// Directory address
interface Address {
  id: string;
  name: string;
  displayName?: string;
  type?: 'room' | 'person';
  channels?: {
    audio?: boolean;
    video?: boolean;
    messaging?: boolean;
  };
}
```

---

## Full Example

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      .call-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #000;
      }

      .video-area {
        flex: 1;
        position: relative;
      }

      .controls-bar {
        padding: 16px;
        display: flex;
        justify-content: center;
        gap: 16px;
        background: rgba(0, 0, 0, 0.8);
      }
    </style>
  </head>
  <body>
    <div class="call-container">
      <sw-call-status></sw-call-status>

      <div class="video-area">
        <sw-call-media id="call-media">
          <sw-participants>
            <sw-self-media mirror></sw-self-media>
          </sw-participants>
        </sw-call-media>
      </div>

      <div class="controls-bar">
        <sw-call-controls></sw-call-controls>
        <sw-dialpad></sw-dialpad>
      </div>
    </div>

    <script type="module">
      import '@signalwire/web-components';
      import { SignalWire } from '@signalwire/js';

      const client = new SignalWire({
        host: 'your-signalwire-space.signalwire.com',
        token: 'your-token'
      });

      await client.connect();

      const call = await client.call({
        destination: 'sip:room@example.com',
        audio: true,
        video: true
      });

      // Set the call on the media component (provides context)
      document.getElementById('call-media').call = call;
    </script>
  </body>
</html>
```

---

## Development

### Start Development Server

```bash
npm run dev
```

### Building

```bash
npm run build
```

This creates optimized production builds in the `dist` folder.

### Type Checking

```bash
npm run type-check
```

### Testing

```bash
npm test
```

---

## Project Structure

```
web-components/
├── src/
│   ├── components/           # UI components
│   │   ├── call-media.ts
│   │   ├── self-media.ts
│   │   ├── participants.ts
│   │   ├── call-controls.ts
│   │   ├── call-status.ts
│   │   ├── dialpad.ts
│   │   ├── device-selector.ts
│   │   ├── audio-level.ts
│   │   ├── click-to-call.ts
│   │   ├── directory.ts
│   │   ├── participant-controls.ts
│   │   └── example-button.ts
│   ├── context/              # Lit context definitions
│   ├── types/                # TypeScript interfaces
│   └── index.ts              # Main entry point
├── dist/                     # Build output (generated)
├── tests/                    # Test files
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

---

## License

MIT
