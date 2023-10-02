---
'@signalwire/realtime-api': major
'@signalwire/core': major
---

- New interface for the realtime-api Video SDK.
- Listen function with _video_, _room_, _playback_, _recording_, and _stream_ objects.
- Listen param with `room.play`, `room.startRecording`, and `room.startStream` functions.
- Decorated promise for `room.play`, `room.startRecording`, and `room.startStream` functions.

```js
import { SignalWire } from '@signalwire/realtime-api'

const client = await SignalWire({ project, token })

const unsub = await client.video.listen({
  onRoomStarted: async (roomSession) => {
    console.log('room session started', roomSession)

    await roomSession.listen({
      onPlaybackStarted: (playback) => {
        console.log('plyaback started', playback)
      }
    })

    // Promise resolves when playback ends.
    await roomSession.play({ url: "http://.....", listen: { onEnded: () => {} } })
  }, 
  onRoomEnded: (roomSession) => {
    console.log('room session ended', roomSession)
  }
})
```