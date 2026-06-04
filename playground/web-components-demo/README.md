# SignalWire WebRTC Demo

A production-quality demonstration application showcasing all UI components from `@signalwire/web-components` integrated with the `@signalwire/js` SDK.

## Features

- **Authentication Flow**: Welcome modal with token input or URL fetch
- **Device Management**: Camera, microphone, and speaker selection with live preview
- **Directory Browsing**: Searchable contact list with infinite scroll
- **Manual Dialing**: Full dialpad with keyboard support
- **Click-to-Call Widget**: One-click calling with configurable options
- **Active Call Experience**: Remote video, self video, call controls, participants
- **Inbound Call Handling**: Accept/reject incoming calls
- **Audio Level Visualization**: Real-time microphone level display

## Getting Started

### Prerequisites

- Node.js 18+
- A SignalWire account with a SAT (Subscriber Access Token)

### Installation

```bash
# From the monorepo root
npm install

# Build dependencies
npm run build:main
npm run build:web-components
```

### Running the Demo

```bash
# Start the development server
npm run dev:web-components-demo

# Or from this directory
npm run dev
```

Open http://localhost:5173 in your browser and enter your SAT token to connect.

## UI Components Showcased

This demo showcases the SDK-aware components from `@signalwire/web-components`:

| Class                   | Tag Name                  | Location        | Description                    |
| ----------------------- | ------------------------- | --------------- | ------------------------------ |
| `SwCallMedia`           | `sw-call-media`           | CallView        | Remote video display           |
| `SwSelfMedia`           | `sw-self-media`           | CallView        | Local video (mirrored)         |
| `SwLocalCamera`         | `sw-local-camera`         | CallView        | Devices-aware local preview    |
| `SwCallControls`        | `sw-call-controls`        | CallView        | Mute, video, hangup buttons    |
| `SwCallStatus`          | `sw-call-status`          | CallView        | Call state and duration        |
| `SwCallProvider`        | `sw-call-provider`        | CallView        | Provides Call/Devices context  |
| `SwCallDialpad`         | `sw-call-dialpad`         | DialpadView     | DTMF pad bound to active call  |
| `SwParticipants`        | `sw-participants`         | CallView        | Participant overlays           |
| `SwParticipantControls` | `sw-participant-controls` | CallView        | Mute/remove participants       |
| `SwDeviceSelector`      | `sw-device-selector`      | DevicesView     | Device dropdowns with preview  |
| `SwAudioLevel`          | `sw-audio-level`          | DevicesView     | Microphone level visualization |
| `SwDirectory`           | `sw-directory`            | Sidebar         | Searchable contact list        |
| `SwClickToCall`         | `sw-click-to-call`        | ClickToCallView | One-click call widget          |
| `SwCallWidget`          | `sw-call-widget`          | —               | Drop-in widget composing the family |

## Component Integration Patterns

### 1. Authentication & SDK Initialization

```javascript
import { SignalWire } from '@signalwire/js';

// Create client with SAT token
const client = new SignalWire({ token: satToken });

// Wait for connection
await new Promise((resolve, reject) => {
  const subscription = client.isConnected$.subscribe((isConnected) => {
    if (isConnected) {
      subscription.unsubscribe();
      resolve();
    }
  });
});

// Subscribe to state changes
client.isRegistered$.subscribe((isRegistered) => {
  console.log('Registration status:', isRegistered);
});
```

### 2. Device Selection

```javascript
// Connect device selector to SDK
const deviceSelector = document.querySelector('sw-device-selector');
deviceSelector.deviceController = signalWire;
```

### 3. Directory Integration

```javascript
// Connect directory to SDK (automatically populates)
const directory = document.querySelector('sw-directory');
directory.directory = signalWire.directory;

// Listen for call events
directory.addEventListener('sw-directory-call', (event) => {
  const { address, channels } = event.detail;
  // Initiate call using address info
});
```

### 4. Audio Level Visualization

```javascript
// Get microphone stream
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Connect to audio level component
const audioLevel = document.querySelector('sw-audio-level');
audioLevel.stream = stream;
audioLevel.bars = 5;
audioLevel.orientation = 'horizontal';
audioLevel.maxSize = 100;
```

### 5. Click-to-Call Widget

```javascript
// Configure click-to-call widget
const widget = document.querySelector('sw-click-to-call');
widget.client = signalWire;
widget.destination = 'support@example.com';
widget.label = 'Call Support';
widget.audioOnly = false;

// Listen for events
widget.addEventListener('sw-dial', (e) => {
  console.log('Call initiated to:', e.detail.destination);
});

widget.addEventListener('sw-hangup', () => {
  console.log('Call ended');
});
```

### 6. Active Call Components

```javascript
// Connect all call-related components
const call = signalWire.dial({ address: targetAddress });

const callMedia = document.querySelector('sw-call-media');
const callStatus = document.querySelector('sw-call-status');
const callControls = document.querySelector('sw-call-controls');
const selfMedia = document.querySelector('sw-self-media');
const participants = document.querySelector('sw-participants');

callMedia.call = call;
callStatus.call = call;
callControls.call = call;
selfMedia.call = call;
participants.call = call;

// Handle hangup event
callControls.addEventListener('sw-hangup', () => {
  call.hangup();
});
```

### 7. Participant Controls

```javascript
// Show controls for a specific participant
const participantControls = document.querySelector('sw-participant-controls');
participantControls.participant = selectedParticipant;
participantControls.capabilities = ['memberMuteAudio', 'memberMuteVideo', 'memberRemove'];
participantControls.showVolume = true;
participantControls.showPin = false;
```

### 8. Inbound Call Handling

```javascript
// Listen for incoming calls
client.session.incomingCalls$.subscribe((calls) => {
  if (calls && calls.length > 0) {
    const incomingCall = calls[0];

    // Show UI to accept/reject
    // To accept:
    incomingCall.answer();

    // To reject:
    incomingCall.hangup();
  }
});
```

## Project Structure

```
packages/web-components-demo/
├── src/
│   ├── main.js                    # Entry point
│   ├── components/
│   │   ├── App.js                 # Main app shell
│   │   ├── WelcomeModal.js        # Authentication modal
│   │   ├── TopBar.js              # Header with registration status
│   │   ├── Sidebar.js             # Navigation + directory panel
│   │   ├── MainContent.js         # View router
│   │   ├── InboundCallModal.js    # Incoming call notification
│   │   └── views/
│   │       ├── DevicesView.js     # Device selector + audio level
│   │       ├── DirectoryView.js   # Directory browser
│   │       ├── DialpadView.js     # Manual dialing
│   │       ├── CallView.js        # Active call experience
│   │       └── ClickToCallView.js # Click-to-call widget
│   ├── utils/
│   │   └── state.js               # Observable state management
│   └── styles/
│       └── main.css               # Design system CSS
├── tests/
│   └── e2e/                       # Playwright test files
├── index.html
├── package.json
└── vite.config.js
```

## State Management

The demo uses a simple observable state pattern:

```javascript
class AppState {
  constructor() {
    this._listeners = new Set();
    this._currentView = 'devices';
    this._activeCall = null;
    // ... more state
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }

  // Getters/setters trigger notifications
  get currentView() {
    return this._currentView;
  }
  set currentView(value) {
    this._currentView = value;
    this._notify();
  }
}
```

## Design System

CSS variables used throughout the application:

```css
/* Colors */
--color-primary: #044ef5; /* SignalWire blue */
--color-success: #10b981; /* Green */
--color-danger: #ef4444; /* Red */
--color-warning: #f59e0b; /* Yellow */
--color-text-primary: #111827;
--color-text-secondary: #6b7280;
--color-background: #ffffff;
--color-surface: #f9fafb;
--color-border: #e5e7eb;

/* Typography */
--font-family: system-ui, -apple-system, sans-serif;
--font-family-mono: ui-monospace, 'Cascadia Code', monospace;
--font-size-h1: 24px;
--font-size-h2: 18px;
--font-size-body: 14px;
--font-size-caption: 12px;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;

/* Layout */
--sidebar-expanded: 240px;
--sidebar-collapsed: 64px;
--topbar-height: 56px;
--transition-fast: 100ms;
--transition-normal: 200ms;
```

## Testing

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npx playwright test --ui
```

## License

MIT
