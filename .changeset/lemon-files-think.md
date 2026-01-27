---
'@signalwire/realtime-api': minor
'@signalwire/core': patch
---

Add session lifecycle listeners and `authStatus` to the SignalWire client.

You can now subscribe to session events (`onConnected`, `onDisconnected`, `onReconnecting`, `onAuthError`) either at construction time via the `listen` option or dynamically via the `listen()` method. The `authStatus` getter exposes the current authentication status.

```js
const client = await SignalWire({
  project: '<project-id>',
  token: '<api-token>',
  listen: {
    onConnected: () => console.log('Connected'),
    onDisconnected: () => console.log('Disconnected'),
    onReconnecting: () => console.log('Reconnecting...'),
    onAuthError: (error) => console.log('Auth error', error),
  },
})

// Or add listeners dynamically:
const unsub = client.listen({
  onConnected: () => console.log('Connected'),
})
// Remove listeners when done:
unsub()

// Check auth status:
console.log(client.authStatus)
```

Also fixes an issue where reconnection events could be dispatched multiple times.
