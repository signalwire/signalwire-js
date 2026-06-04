# SignalWire Browser SDK Examples

Minimal, single-concept examples demonstrating the SignalWire Browser SDK.

## Running the Examples

1. Build the SDK:
   ```bash
   npm install
   npm run build
   ```

2. Serve the examples:
   ```bash
   npx serve examples
   ```

3. Open http://localhost:3000 and navigate to an example.

## Examples

| Example | Description |
|---------|-------------|
| [01-inbound-calls](./01-inbound-calls/) | Receive and answer incoming calls |
| [02-video-room](./02-video-room/) | Join a multi-participant video room |
| [03-audio-only](./03-audio-only/) | Make phone-style audio calls |
| [04-device-selection](./04-device-selection/) | Choose camera/mic before and during calls |
| [05-screen-sharing](./05-screen-sharing/) | Share your screen |
| [06-call-controls](./06-call-controls/) | Mute, hold, and DTMF tones |
| [07-participant-events](./07-participant-events/) | React to join/leave/talking events |
| [08-web-components](./08-web-components/) | Use pre-built UI components |
| [guest-call](./guest-call/) | Simple call using embed token |

## Structure

Each example follows this pattern:

```
example-name/
└── index.html    # Self-contained example
```

Examples import shared utilities from `_shared/`:
- `setup.js` - Token input, client connection, error handling
- `styles.css` - Minimal styling

## Code Organization

Examples separate the **concept being demonstrated** from boilerplate:

```javascript
// =========================================================================
// EXAMPLE: [Concept Name]
// =========================================================================

/**
 * The key function(s) demonstrating this concept.
 * Read these first.
 */
function exampleFunction(call) {
  // This is what you're here to learn
}

// =========================================================================
// UI Helpers (not the focus of this example)
// =========================================================================

// Boring DOM manipulation lives down here
```

## Authentication

Examples prompt for a Subscriber Access Token (SAT) on first run. The token is saved to localStorage for convenience.

To get a SAT:
1. Use your backend to call the SignalWire API
2. Or use the `scripts/issue-sat.js` script (development only)

To reset the saved token, clear localStorage or use browser DevTools.

## Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- HTTPS (or localhost for development)
- Camera/microphone permissions
