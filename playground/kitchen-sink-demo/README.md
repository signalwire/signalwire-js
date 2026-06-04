# SignalWire Outbound Calling Demo

A simple demo web application built with TypeScript and Vite that demonstrates how to use the `signalwire-typescript` package with the SignalWire client.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update the Subscriber Access Token (SAT) in [src/main.ts](src/main.ts):
```typescript
const SAT = 'your-access-token-here';
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at [http://localhost:5173/](http://localhost:5173/)

## Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

Preview the production build:
```bash
npm run preview
```

## How It Works

The demo app:
1. Initializes a `SignalWire` client with a hard-coded Subscriber Access Token (SAT)
2. Automatically connects to SignalWire on startup
3. Displays the connection status
4. Shows user information (ID and email) once connected

## Dependencies

- **signalwire-typescript**: The local SignalWire Typescript package (via file reference)
- **rxjs**: Required peer dependency for observables
- **@signalwire/js**: Required peer dependency for SignalWire SDK

## Next Steps

This is a basic demo showing SignalWire client initialization. You can extend it to:
- Make outbound calls
- Handle incoming calls
- Manage call controls (mute, hold, transfer, etc.)
- Display call history
- And more...
