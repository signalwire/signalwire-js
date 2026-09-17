# SignalWire Typescript

**!important - Work in process**

A TypeScript-based WebRTC communication SDK using RxJS observables for reactive state management. This monorepo implements the Verto signaling protocol for real-time communication with SignalWire's infrastructure.

## Packages

| Package                                                     | Description                               |
| ----------------------------------------------------------- | ----------------------------------------- |
| [`@signalwire/js`](packages/main)                           | Core WebRTC library with RxJS observables |
| [`@signalwire/web-components`](packages/web-components)     | Lit-based web components for call UI      |
| [`@signalwire/kitchen-sink-js`](playground/kitchen-sink-demo) | Demo application                          |

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
# Start all packages in development mode
npm run dev

# Or start individual packages
npm run dev:main       # Core library
npm run dev:web-components      # UI components
npm run dev:kitchen-sink-demo          # Demo app
```

### Building

```bash
npm run build                  # Build all packages
```

## Usage

### Basic Example

```typescript
import { SignalWire } from '@signalwire/js';

// Initialize client with a Subscriber Access Token (SAT)
const client = new SignalWire({ token: 'your-sat-token' });

// Subscribe to connection state
client.isConnected$.subscribe((connected) => {
  console.log('Connected:', connected);
});

// Make an outbound call
const call = await client.dial('sip:destination@example.com');

// Subscribe to call state changes
call.status$.subscribe((status) => {
  console.log('Call status:', status);
});

// Access media streams
call.localStream$.subscribe((stream) => {
  videoElement.srcObject = stream;
});

// Hang up
await call.hangup();
```

### Using UI Components

```html
<script type="module">
  import '@signalwire/web-components';
</script>

<!-- Display remote video -->
<sw-call-media></sw-call-media>

<!-- Display local video (self) -->
<sw-self-media></sw-self-media>

<!-- Display participant list -->
<sw-participants></sw-participants>
```

## Architecture

The library follows a reactive architecture with RxJS observables:

```
SignalWire
├── TransportManager (WebSocket)
├── ClientSessionManager (Auth & RPC)
│   └── VertoManager (Signaling)
│       └── RTCPeerConnectionController (WebRTC)
└── DeviceController (Media devices)
```

### Key Features

- **Observable-First API**: All state exposed as RxJS observables
- **Automatic Cleanup**: `Destroyable` base class manages subscriptions
- **Verto Protocol**: Full implementation for SignalWire communication
- **WebRTC Management**: ICE, SDP negotiation, media stream handling
- **Device Management**: Audio/video input enumeration and selection
- **Reconnection**: Automatic WebSocket reconnection with call reattachment

## Testing

```bash
npm test                       # Run unit tests
npm run test:ui                # Run tests with UI
npm run test:coverage          # Run with coverage
npm run test:integration       # Playwright integration tests
```

## Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run build`      | Build all packages           |
| `npm run build:docs` | Generate API docs + CEM into `dev-docs/` |
| `npm run dev`        | Start development mode       |
| `npm test`           | Run unit tests               |
| `npm run lint`       | Run ESLint                   |
| `npm run lint:fix`   | Auto-fix lint issues         |
| `npm run format`     | Format with Prettier         |
| `npm run type-check` | TypeScript type checking     |
| `npm run clean`      | Remove dist and node_modules |

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets). Every PR that
changes a published package must include one (`npx changeset`); PRs that don't need one
carry the `skip-changeset` label.

Packages are published to npm on four channels:

| Channel | Install | Version format |
| --- | --- | --- |
| Dev snapshot, every merge to `main` | `npm install @signalwire/js@dev` | `X.Y.Z-dev-<datetime>` |
| Beta | `npm install @signalwire/js@beta` | `X.Y.Z-beta.N` |
| Release candidate | `npm install @signalwire/js@rc` | `X.Y.Z-rc.N` |
| Default | `npm install @signalwire/js` | whatever is promoted to `latest` |

`latest` is promoted by hand after a release has soaked, never by automation. While 4.x is
in its release-candidate period, `latest` points at an RC.

Cutting a release, syncing to the public repository, secrets, and the manual fallback are
documented in `docs/RELEASING.md` (internal — private repository only).

## Requirements

- Node.js 18+
- npm 9+
- RxJS 7.8+ (peer dependency)

## License

MIT
