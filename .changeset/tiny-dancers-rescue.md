---
'@signalwire/webrtc': minor
'@signalwire/js': minor
---

Allow users to pass the optional `disableUdpIceServers` boolean flag with a value of `true` to remove the URLs of UDP transport ICE servers.

Default value for `disableUdpIceServers` is `false`

Call Fabric SDK:

```js
import { SignalWire } from '@signalwire/js'

const client = await SignalWire({
   host: ...,
   token: ...,
   rootElement: ...,
   disableUdpIceServers: true|false, // default is false
})
```

Video SDK:

```js
import { Video } from '@signalwire/js'

const roomSession = new Video.RoomSession({
   host: ...,
   token: ...,
   rootElement: ...,
   disableUdpIceServers: true|false, // default is false
})
```
