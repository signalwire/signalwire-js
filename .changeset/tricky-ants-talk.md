---
'@signalwire/realtime-api': major
'@signalwire/core': major
---

Decorated promise for the following APIs:
- call.play()
  - call.playAudio()
  - call.playSilence()
  - call.playRingtone()
  - call.playTTS()
- call.record() 
  - call.recordAudio()
- call.prompt()
  - call.promptAudio()
  - call.promptRingtone()
  - call.promptTTS()
- call.tap()
  - call.tapAudio()
- call.detect()
  - call.amd()
  - call.detectFax()
  - call.detectDigit
- call.collect()

Playback example 1 - **Not resolving promise**
```js
const play = call.playAudio({ url: '...' })
await play.id
```

Playback example 2 - **Resolving promise when playback starts**
```js
const play = await call.playAudio({ url: '...' }).onStarted()
play.id
```

Playback example 3 - **Resolving promise when playback ends**
```js
const play = await call.playAudio({ url: '...' }).onEnded()
play.id
```

Playback example 4 - **Resolving promise when playback ends - Default behavior**
```js
const play = await call.playAudio({ url: '...' })
play.id
```

All the other APIs work in a similar way.
