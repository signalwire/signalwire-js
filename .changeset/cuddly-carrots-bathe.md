---
'@signalwire/realtime-api': major
'@signalwire/core': major
---

New interface for Voice APIs

The new interface contains a single SW client with Chat and PubSub namespaces
```javascript
import { SignalWire } from '@signalwire/realtime-api'

(async () => {
  const client = await SignalWire({
    host: process.env.HOST,
    project: process.env.PROJECT,
    token: process.env.TOKEN,
  })

  const unsubVoiceOffice = await client.voice.listen({
    topics: ['office'],
    onCallReceived: async (call) => {
      try {
        await call.answer()

        const unsubCall = await call.listen({
          onStateChanged: (call) => {},
          onPlaybackUpdated: (playback) => {},
          onRecordingStarted: (recording) => {},
          onCollectInputStarted: (collect) => {},
          onDetectStarted: (detect) => {},
          onTapStarted: (tap) => {},
          onPromptEnded: (prompt) => {}
          // ... more call listeners can be attached here
        })

        // ...
        
        await unsubCall()
      } catch (error) {
        console.error('Error answering inbound call', error)
      }
    }
  })

  const call = await client.voice.dialPhone({
    to: process.env.VOICE_DIAL_TO_NUMBER as string,
    from: process.env.VOICE_DIAL_FROM_NUMBER as string,
    timeout: 30,
    listen: {
      onStateChanged: async (call) => {
        // When call ends; unsubscribe all listeners and disconnect the client
        if (call.state === 'ended') {
          await unsubVoiceOffice()

          await unsubVoiceHome()
  
          await unsubPlay()

          client.disconnect()
        }
      },
      onPlaybackStarted: (playback) => {},
    },
  })

  const unsubCall = await call.listen({
    onPlaybackStarted: (playback) => {},
    onPlaybackEnded: (playback) => {
      // This will never run since we unsubscribe this listener before the playback stops
    },
  })

  // Play an audio
  const play = await call.playAudio({
    url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
    listen: {
      onStarted: async (playback) => {
        await unsubCall()

        await play.stop()
      },
    },
  })

  const unsubPlay = await play.listen({
    onStarted: (playback) => {
      // This will never run since this listener is attached after the call.play has started
    },
    onEnded: async (playback) => {
      await call.hangup()
    },
  })

})
```