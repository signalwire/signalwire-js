# Guest Call Example

A minimal example demonstrating how to make a video call using a SignalWire embed token (guest token). No user account required - just an embed token from your SignalWire dashboard.

## What This Example Shows

- Using `embeddableCall()` for simple one-liner call setup
- Guest authentication with embed tokens
- Subscribing to call status, local/remote video streams
- Basic call controls (start/hangup)

## Setup

### 1. Build the SDK

From the repository root:

```bash
npm install
npm run build:main
```

### 2. Get an Embed Token

1. Log into your SignalWire Dashboard
2. Navigate to your Fabric application
3. Generate an embed token for guest access

### 3. Run the Example

From the repository root:

```bash
npx serve examples/guest-call
```

Then open `http://localhost:3000` in your browser.

### 4. Make a Call

1. Enter your SignalWire host (e.g., `yourspace.signalwire.com`)
2. Paste your embed token
3. Enter a destination (e.g., `/public/test-room`)
4. Click **Start Call**

## Code Explanation

The example uses `SignalWire.embeddableCall()` which handles:

1. Creating a credential provider from the embed token
2. Authenticating with SignalWire
3. Creating a `SignalWire`
4. Dialing the destination

```javascript
const call = await SignalWire.embeddableCall({
  host: 'yourspace.signalwire.com',
  embedToken: 'your-embed-token',
  to: '/public/test-room'
});

// Subscribe to call events
call.status$.subscribe((status) => console.log('Status:', status));
call.localStream$.subscribe((stream) => {
  localVideo.srcObject = stream;
});
call.remoteStream$.subscribe((stream) => {
  remoteVideo.srcObject = stream;
});
```

## Using CDN

Once the SDK is published, you can load it directly from a CDN:

```html
<script src="https://unpkg.com/@signalwire/js@latest/dist/browser.umd.js"></script>
```

Or with explicit version:

```html
<script src="https://unpkg.com/@signalwire/js@10.0.0/dist/browser.umd.js"></script>
```
