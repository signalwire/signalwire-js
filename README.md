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

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing. There are three release channels: **dev** (snapshots), **beta** (pre-release), and **production** (stable).

### Adding a Changeset

Every PR that affects published packages must include a changeset (enforced by CI):

```bash
npx changeset
```

Follow the prompts to select affected packages and describe the change. To skip this requirement for docs-only or CI changes, add the `skip-changeset` label to the PR.

### Dev Releases (Automatic)

Every push to `main` that is **not** a release or beta commit automatically publishes a dev snapshot to npm under the `dev` tag.

- **Trigger:** Push to `main` (commit message does NOT start with `"Version Packages"` or `"Ready for beta"`)
- **npm tag:** `dev`
- **Version format:** `X.Y.Z-dev-{datetime}`
- **Install:** `npm install @signalwire/js@dev`

No manual action is required — dev releases happen on every merge to `main`.

### Beta Releases

Beta releases are triggered by a commit with a message starting with `"Ready for beta"`.

1. Prepare and commit your changes on `main`
2. Create a commit with the message:

   ```bash
   git commit --allow-empty -m "Ready for beta"
   git push origin main
   ```

3. The workflow will:
   - Calculate the next beta version based on existing npm beta tags (e.g., `4.0.0-beta.0`, `4.0.0-beta.1`, ...)
   - Publish all workspace packages to npm under the `beta` tag

- **npm tag:** `beta`
- **Version format:** `X.Y.Z-beta.N`
- **Install:** `npm install @signalwire/js@beta`

### Production Releases

Production releases follow a two-stage process: an RC (release candidate) is published to the private repo, then synced to the public repo for the final `@latest` publish.

#### Step 1: Version Packages

```bash
npx changeset version
```

This consumes all pending changesets, updates `CHANGELOG.md` files, and bumps package versions. Review the changes, then commit:

```bash
git add .
git commit -m "Version Packages"
git push origin main
```

#### Step 2: Automated RC Publish & Sync

When the `"Version Packages"` commit is pushed to `main`, the release workflow automatically:

1. Builds all packages
2. Creates a git tag (e.g., `v4.1.0-rc.0`)
3. Creates a GitHub pre-release with changelog notes
4. Publishes to npm under the `rc` tag
5. Triggers the **Sync to Public Repository** workflow

#### Step 3: Public Repository Sync

The sync workflow (also available as a manual `workflow_dispatch`):

1. Checks out the RC tag
2. Removes private content using `.gitignore-private`
3. Strips `-rc.N` suffixes from package versions to produce clean versions
4. Creates a PR on the public repository (`signalwire/typescript-web`)
5. When the PR is merged, the `@latest` npm publish is triggered

### CI Workflows Summary

| Workflow               | Trigger                                         | Purpose                                                              |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| **CI**                 | PR to `main`, push to `main`                    | Build, type-check, lint, and test                                    |
| **Validate Changeset** | PR to `main`                                    | Ensures a changeset is included (skip with `skip-changeset` label)   |
| **Dev Release**        | Push to `main` (non-release commits)            | Publishes `@dev` snapshot to npm                                     |
| **Beta Release**       | Push to `main` (`"Ready for beta"` commit)      | Publishes `@beta` to npm                                             |
| **Release**            | Push to `main` (`"Version Packages"` commit)    | Publishes `@rc` to npm, creates GitHub release, triggers public sync |
| **Sync to Public**     | Called by Release workflow or manual dispatch    | Syncs sanitized code to public repo via PR                           |

### Required Secrets

| Secret | Purpose |
|---|---|
| `NPM_TOKEN` | npm authentication for publishing packages |
| `PUBLIC_REPO_PAT` | GitHub PAT with access to the public repository |

## Requirements

- Node.js 18+
- npm 9+
- RxJS 7.8+ (peer dependency)

## License

MIT
