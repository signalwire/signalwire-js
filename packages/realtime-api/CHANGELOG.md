# @signalwire/realtime-api

## 4.1.2 - 2025-07-04

### Changed

- [#1187](https://github.com/signalwire/signalwire-js/pull/1187) [`3c389671b35d1a57fd6be3f8c793be36f8294795`](https://github.com/signalwire/signalwire-js/commit/3c389671b35d1a57fd6be3f8c793be36f8294795) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Realtime-API: Bug Fix - Resubscribe topics/channels after WS reconnection

  Realtime-API Chat: Fix type interfaces for `getMessages` and `getMembers`.

- Updated dependencies [[`bb4b96f96315a9e89ae8df147ca4d1c9650e0944`](https://github.com/signalwire/signalwire-js/commit/bb4b96f96315a9e89ae8df147ca4d1c9650e0944), [`b1d63f14c5dabbf0f26fb894ab0bb474a62c5767`](https://github.com/signalwire/signalwire-js/commit/b1d63f14c5dabbf0f26fb894ab0bb474a62c5767), [`22eba1aee0f30986a041203156cd43e00736d107`](https://github.com/signalwire/signalwire-js/commit/22eba1aee0f30986a041203156cd43e00736d107), [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06), [`3c389671b35d1a57fd6be3f8c793be36f8294795`](https://github.com/signalwire/signalwire-js/commit/3c389671b35d1a57fd6be3f8c793be36f8294795), [`b999b0bf8502b3e72ef2412a7f5d435f2791dc45`](https://github.com/signalwire/signalwire-js/commit/b999b0bf8502b3e72ef2412a7f5d435f2791dc45), [`3d01d9663a4994c8cf42b2a1fac3bd2ca5371687`](https://github.com/signalwire/signalwire-js/commit/3d01d9663a4994c8cf42b2a1fac3bd2ca5371687), [`42ebbf935141f3a306f4d1993ab41ada69b932d9`](https://github.com/signalwire/signalwire-js/commit/42ebbf935141f3a306f4d1993ab41ada69b932d9)]:
  - @signalwire/core@4.3.0

## [4.1.1] - 2025-03-04

### Changed

- [#1085](https://github.com/signalwire/signalwire-js/pull/1085) [`16510322d18280d535da7f10e05e6e768e57a328`](https://github.com/signalwire/signalwire-js/commit/16510322d18280d535da7f10e05e6e768e57a328) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Bump "ws" package to 8.17.1

- [#1161](https://github.com/signalwire/signalwire-js/pull/1161) [`3d0fe342a5dfb34814b376bf62b370f0bf57bfac`](https://github.com/signalwire/signalwire-js/commit/3d0fe342a5dfb34814b376bf62b370f0bf57bfac) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Refactor types for the Voice calling APIs

- [#1124](https://github.com/signalwire/signalwire-js/pull/1124) [`ada6c49538862f466dea659286ea8eb405f4f636`](https://github.com/signalwire/signalwire-js/commit/ada6c49538862f466dea659286ea8eb405f4f636) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce dedicated types for Video and Fabric SDKs

### Fixed

- [#1139](https://github.com/signalwire/signalwire-js/pull/1139) [`8fa40cc5a9ddca975825e6fa7719105900e64356`](https://github.com/signalwire/signalwire-js/commit/8fa40cc5a9ddca975825e6fa7719105900e64356) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Fixed chat suscription after a websocket reconnection

- [#1100](https://github.com/signalwire/signalwire-js/pull/1100) [`96066d60caf9512e1d5658b09c441d9c55b06c23`](https://github.com/signalwire/signalwire-js/commit/96066d60caf9512e1d5658b09c441d9c55b06c23) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix types name typo

- [#1160](https://github.com/signalwire/signalwire-js/pull/1160) [`fd39f12ca49f9257933b59490c64563e3391a93a`](https://github.com/signalwire/signalwire-js/commit/fd39f12ca49f9257933b59490c64563e3391a93a) Thanks [@iAmmar7](https://github.com/iAmmar7)! - - Fix session emitter

  - Make SignalWire a singelton for Call Fabric SDK
  - Fix memory leak

### Dependencies

- Updated dependencies [[`7130138f9dcd750bc2d9f9bee0d644a2e02425c6`](https://github.com/signalwire/signalwire-js/commit/7130138f9dcd750bc2d9f9bee0d644a2e02425c6), [`df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4`](https://github.com/signalwire/signalwire-js/commit/df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4), [`461943a395d9a40a10658c906447398bff7ec160`](https://github.com/signalwire/signalwire-js/commit/461943a395d9a40a10658c906447398bff7ec160), [`d34f3360163292aedb3474ffc9f7e2017b9d0002`](https://github.com/signalwire/signalwire-js/commit/d34f3360163292aedb3474ffc9f7e2017b9d0002), [`fca4c09ac531ab88dec9d94f3a73d5cd06060d36`](https://github.com/signalwire/signalwire-js/commit/fca4c09ac531ab88dec9d94f3a73d5cd06060d36), [`5e4539144f31ff154e3e295e57d939e86dee0840`](https://github.com/signalwire/signalwire-js/commit/5e4539144f31ff154e3e295e57d939e86dee0840), [`fe5c4cca5c3dd14f0dc3af0579231973e57717f6`](https://github.com/signalwire/signalwire-js/commit/fe5c4cca5c3dd14f0dc3af0579231973e57717f6), [`ed8d713ab9c399bcc335a147d499248d44c72468`](https://github.com/signalwire/signalwire-js/commit/ed8d713ab9c399bcc335a147d499248d44c72468), [`fcb722a9f831359d3a05f9d53282c825dc749fa2`](https://github.com/signalwire/signalwire-js/commit/fcb722a9f831359d3a05f9d53282c825dc749fa2), [`84aaad9b4837739f87b3dd1de99a14eb1123653f`](https://github.com/signalwire/signalwire-js/commit/84aaad9b4837739f87b3dd1de99a14eb1123653f), [`76e573f46553337990c397693985e5004eeecae1`](https://github.com/signalwire/signalwire-js/commit/76e573f46553337990c397693985e5004eeecae1), [`db072e479d9b30ae7aa952c819220eda60f329bb`](https://github.com/signalwire/signalwire-js/commit/db072e479d9b30ae7aa952c819220eda60f329bb), [`16499a4d075d893ad432a5bdbafac950a08edc26`](https://github.com/signalwire/signalwire-js/commit/16499a4d075d893ad432a5bdbafac950a08edc26), [`a2682371fc53c2526f40530b9c9e706397da1a8d`](https://github.com/signalwire/signalwire-js/commit/a2682371fc53c2526f40530b9c9e706397da1a8d), [`32ae8cb6391c91e8d9e8aa38524c6a188ea9d747`](https://github.com/signalwire/signalwire-js/commit/32ae8cb6391c91e8d9e8aa38524c6a188ea9d747), [`3d0fe342a5dfb34814b376bf62b370f0bf57bfac`](https://github.com/signalwire/signalwire-js/commit/3d0fe342a5dfb34814b376bf62b370f0bf57bfac), [`fd39f12ca49f9257933b59490c64563e3391a93a`](https://github.com/signalwire/signalwire-js/commit/fd39f12ca49f9257933b59490c64563e3391a93a), [`f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc`](https://github.com/signalwire/signalwire-js/commit/f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc), [`2dc5db84d40b7224c641371727881c0319c002d1`](https://github.com/signalwire/signalwire-js/commit/2dc5db84d40b7224c641371727881c0319c002d1), [`ada6c49538862f466dea659286ea8eb405f4f636`](https://github.com/signalwire/signalwire-js/commit/ada6c49538862f466dea659286ea8eb405f4f636)]:
  - @signalwire/core@4.2.1

## [4.1.0] - 2025-01-21 (Accidental Release — DO NOT USE)

> **Note:** This version was published by mistake and should not be used.
> Please upgrade directly to `4.1.1` or higher.

## [4.0.1] - 2024-06-03

### Fixed

- [#1024](https://github.com/signalwire/signalwire-js/pull/1024) [`a0f88129`](https://github.com/signalwire/signalwire-js/commit/a0f8812990fee72230bc50f93ee12bb0803f60f5) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix types export for module NodeNext

### Dependencies

- Updated dependencies [[`45991e4c`](https://github.com/signalwire/signalwire-js/commit/45991e4c23065028b8e55af3c61faaf7661a8baf), [`e16ec479`](https://github.com/signalwire/signalwire-js/commit/e16ec479be85b40f989aba2e3bae932fd9eb59d9), [`968d226b`](https://github.com/signalwire/signalwire-js/commit/968d226ba2791f44dea4bd1b0d173aefaf103bda), [`ded3dc7a`](https://github.com/signalwire/signalwire-js/commit/ded3dc7a71977460d19fc623c3f2745f5365fb7b), [`0f4f2b3c`](https://github.com/signalwire/signalwire-js/commit/0f4f2b3cbf788a259baf5543fe82bbfc8b2540b7), [`254016f3`](https://github.com/signalwire/signalwire-js/commit/254016f396ce89cda82585b6ef9bb3f0e5b9135c), [`c370fec8`](https://github.com/signalwire/signalwire-js/commit/c370fec84e86701d8baf8910aebf1e959dcedc85), [`3d20672b`](https://github.com/signalwire/signalwire-js/commit/3d20672bbf2247b35e7d3ee8524a904fae1e6b2a), [`3d6a4fbe`](https://github.com/signalwire/signalwire-js/commit/3d6a4fbe4364a5795233d2aac87ba309d9d34bdd), [`184c8777`](https://github.com/signalwire/signalwire-js/commit/184c8777d1891985ab6bccbf417938e0dae5041f), [`c8deacef`](https://github.com/signalwire/signalwire-js/commit/c8deacef19176b7f744b61b9fe454556f0eccd52), [`229320b3`](https://github.com/signalwire/signalwire-js/commit/229320b3a105690bcb5c7271bc516d6269a1ca76), [`d215ef5d`](https://github.com/signalwire/signalwire-js/commit/d215ef5d1501f5f3df4e5d3837ac740f42649c2e), [`a08512a3`](https://github.com/signalwire/signalwire-js/commit/a08512a3a4f3a6fd1d0faf643f3c481ca668abc4), [`6d71362b`](https://github.com/signalwire/signalwire-js/commit/6d71362b589439fe3b4f234f4ff98871f8d98a20)]:
  - @signalwire/core@4.1.0

## [4.0.0] - 2024-04-17

### Added

- [#881](https://github.com/signalwire/signalwire-js/pull/881) [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99) Thanks [@iAmmar7](https://github.com/iAmmar7)! - New interface for Voice APIs

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

- [#881](https://github.com/signalwire/signalwire-js/pull/881) [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99) Thanks [@iAmmar7](https://github.com/iAmmar7)! - - New interface for the realtime-api Video SDK.

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
        },
      })

      // Promise resolves when playback ends.
      await roomSession.play({
        url: 'http://.....',
        listen: { onEnded: () => {} },
      })
    },
    onRoomEnded: (roomSession) => {
      console.log('room session ended', roomSession)
    },
  })
  ```

- [#881](https://github.com/signalwire/signalwire-js/pull/881) [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99) Thanks [@iAmmar7](https://github.com/iAmmar7)! - New interface for PubSub and Chat APIs

  The new interface contains a single SW client with Chat and PubSub namespaces

  ```javascript
  import { SignalWire } from '@signalwire/realtime-api'
  ;(async () => {
    const client = await SignalWire({
      host: process.env.HOST,
      project: process.env.PROJECT,
      token: process.env.TOKEN,
    })

    // Attach pubSub listeners
    const unsubHomePubSubListener = await client.pubSub.listen({
      channels: ['home'],
      onMessageReceived: (message) => {
        console.log('Message received under the "home" channel', message)
      },
    })

    // Publish on home channel
    await client.pubSub.publish({
      content: 'Hello There',
      channel: 'home',
      meta: {
        fooId: 'randomValue',
      },
    })

    // Attach chat listeners
    const unsubOfficeChatListener = await client.chat.listen({
      channels: ['office'],
      onMessageReceived: (message) => {
        console.log('Message received on "office" channel', message)
      },
      onMemberJoined: (member) => {
        console.log('Member joined on "office" channel', member)
      },
      onMemberUpdated: (member) => {
        console.log('Member updated on "office" channel', member)
      },
      onMemberLeft: (member) => {
        console.log('Member left on "office" channel', member)
      },
    })

    // Publish a chat message on the office channel
    const pubRes = await client.chat.publish({
      content: 'Hello There',
      channel: 'office',
    })

    // Get channel messages
    const messagesResult = await client.chat.getMessages({
      channel: 'office',
    })

    // Get channel members
    const getMembersResult = await client.chat.getMembers({ channel: 'office' })

    // Unsubscribe pubSub listener
    await unsubHomePubSubListener()

    // Unsubscribe chat listener
    await unsubOfficeChatListener()

    // Disconnect the client
    client.disconnect()
  })()
  ```

- [#881](https://github.com/signalwire/signalwire-js/pull/881) [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99) Thanks [@iAmmar7](https://github.com/iAmmar7)! - New interface for the Messaging API

  The new interface contains a single SW client with Messaging namespace

  ```javascript
    const client = await SignalWire({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    const unsubOfficeListener = await client.messaging.listen({
      topics: ['office'],
      onMessageReceived: (payload) => {
        console.log('Message received under "office" context', payload)
      },
      onMessageUpdated: (payload) => {
        console.log('Message updated under "office" context', payload)
      },
    })

    try {
      const response = await client.messaging.send({
        from: process.env.FROM_NUMBER_MSG as string,
        to: process.env.TO_NUMBER_MSG as string,
        body: 'Hello World!',
        context: 'office',
      })

      await client.messaging.send({
        from: process.env.FROM_NUMBER_MSG as string,
        to: process.env.TO_NUMBER_MSG as string,
        body: 'Hello John Doe!',
      })
    } catch (error) {
      console.log('>> send error', error)
    }
  ```

- [#881](https://github.com/signalwire/signalwire-js/pull/881) [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Decorated promise for the following APIs:

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

- [#881](https://github.com/signalwire/signalwire-js/pull/881) [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Task namespace with new interface

### Fixed

- [#954](https://github.com/signalwire/signalwire-js/pull/954) [`c401cba0`](https://github.com/signalwire/signalwire-js/commit/c401cba058f261696d8fb6f90deb523def9f4094) Thanks [@giavac](https://github.com/giavac)! - Fix collect e2e tests

- [#881](https://github.com/signalwire/signalwire-js/pull/881) [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix `onStarted` function in decorated promises

- [#945](https://github.com/signalwire/signalwire-js/pull/945) [`300f242e`](https://github.com/signalwire/signalwire-js/commit/300f242e3ee1f08595addd06b49d3eb62bd18b89) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix tap.started event on Tap instance

- [#943](https://github.com/signalwire/signalwire-js/pull/943) [`8335cdf3`](https://github.com/signalwire/signalwire-js/commit/8335cdf387e088c00926c0d05f624f944e85d574) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Add missing getter for member current position

- [#942](https://github.com/signalwire/signalwire-js/pull/942) [`cdb4b202`](https://github.com/signalwire/signalwire-js/commit/cdb4b202f612c34b35325da7c7652f6c3204b0fd) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Bug fix for playback/recording/stream listeners

- Updated dependencies [[`03f01c36`](https://github.com/signalwire/signalwire-js/commit/03f01c36b3f1244e4eed4188610e67955c7ba9ce), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`6cb639bf`](https://github.com/signalwire/signalwire-js/commit/6cb639bf6dcbacefd71615ec99c4911cbbd120c4), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99)]:
  - @signalwire/core@4.0.0

## [3.13.0] - 2023-11-23

### Added

- [#873](https://github.com/signalwire/signalwire-js/pull/873) [`6c9d2aa5`](https://github.com/signalwire/signalwire-js/commit/6c9d2aa5f5c8d7b07d955a2c6e2ab647a62bd702) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce the hand raise API for the Video SDKs (browser and realtime-api)

### Fixed

- [#892](https://github.com/signalwire/signalwire-js/pull/892) [`d564c379`](https://github.com/signalwire/signalwire-js/commit/d564c379e10d23c21abb56b3e740aff70fc451b9) Thanks [@ayeminag](https://github.com/ayeminag)! - - Added `state` param to `CallingCallCollectEventParams`
  - Made sure `voiceCallCollectWorker` doesn't clean up `CallCollect` instance and emit `ended`/`failed` event if the `state` is `"collecting"`
  - Resolve `CallCollect.ended()` promise only when `state` is NOT `"collecting"` AND `final` is either `undefined`/`true` AND `result.type` is one of `ENDED_STATES`
  - Added more test cases for `Call.collect()` in `@sw-internal/e2e-realtime-api`
- Updated dependencies [[`d564c379`](https://github.com/signalwire/signalwire-js/commit/d564c379e10d23c21abb56b3e740aff70fc451b9), [`4ee7b6f8`](https://github.com/signalwire/signalwire-js/commit/4ee7b6f852e650c1828decda2429ebec79576085), [`6c9d2aa5`](https://github.com/signalwire/signalwire-js/commit/6c9d2aa5f5c8d7b07d955a2c6e2ab647a62bd702)]:
  - @signalwire/core@3.21.0

## [3.12.0] - 2023-11-07

### Added

- [#884](https://github.com/signalwire/signalwire-js/pull/884) [`e5db7cab`](https://github.com/signalwire/signalwire-js/commit/e5db7cabc2e532a19fad45753e47f7d612d6e248) Thanks [@edolix](https://github.com/edolix)! - Add support for `lock` and `unlock` RoomSessions.

### Added

- [#901](https://github.com/signalwire/signalwire-js/pull/901) [`2131bb41`](https://github.com/signalwire/signalwire-js/commit/2131bb418afeb75081fb2bfaee3b00a24df4614f) Thanks [@giavac](https://github.com/giavac)! - Add an optional nodeId to call.dial

### Dependencies

- Updated dependencies [[`e5db7cab`](https://github.com/signalwire/signalwire-js/commit/e5db7cabc2e532a19fad45753e47f7d612d6e248), [`bcced8ae`](https://github.com/signalwire/signalwire-js/commit/bcced8ae774de5483331c4d3146299d5ffffd7e7), [`2131bb41`](https://github.com/signalwire/signalwire-js/commit/2131bb418afeb75081fb2bfaee3b00a24df4614f)]:
  - @signalwire/core@3.20.0

## [3.11.0] - 2023-09-14

### Added

- [#866](https://github.com/signalwire/signalwire-js/pull/866) [`1086a1b0`](https://github.com/signalwire/signalwire-js/commit/1086a1b0dae256bb44858f16c24494aba8cdfc3e) - Expose `detectInterruptions` params for detect methods and handle `beep` in the detect events

- [#864](https://github.com/signalwire/signalwire-js/pull/864) [`be17e614`](https://github.com/signalwire/signalwire-js/commit/be17e614edd560a8578daf380dff1205e0032db3) - Add alias 'topics' for 'contexts'

- [#862](https://github.com/signalwire/signalwire-js/pull/862) [`2a9b88d9`](https://github.com/signalwire/signalwire-js/commit/2a9b88d92c61fbf9e317234e860c34081c49c235) - Add a new `result` getter to `CallDetect` to retrieve the result of the detector.

- [#863](https://github.com/signalwire/signalwire-js/pull/863) [`fb45dce7`](https://github.com/signalwire/signalwire-js/commit/fb45dce7f57a99533df445b4e1cda9587a1f3eb4) - Add support for CallRecording `pause()` and `resume()`

### Changed

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Enhance shared function between realtime and browser SDK

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Introduce the session emitter and eliminate the global emitter

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the SDK by removing eventsPrefix from the namespaces

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Attach listeners without the namespace prefix

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the SDK by removing applyEmitterTransform

- [#875](https://github.com/signalwire/signalwire-js/pull/875) [`a3ef96ed`](https://github.com/signalwire/signalwire-js/commit/a3ef96ed681eced58f7e6b3a271d6c7233189ab2) - Catchable voice calling workers saga

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the global emitter

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Remove event emitter transform pipeline from browser SDK

- [#876](https://github.com/signalwire/signalwire-js/pull/876) [`e5db0ef9`](https://github.com/signalwire/signalwire-js/commit/e5db0ef95325d3578b8729c15e8bfca5b7a4cb3a) - Bump supported node version to at least 16

### Dependencies

- Updated dependencies [[`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`1086a1b0`](https://github.com/signalwire/signalwire-js/commit/1086a1b0dae256bb44858f16c24494aba8cdfc3e), [`be17e614`](https://github.com/signalwire/signalwire-js/commit/be17e614edd560a8578daf380dff1205e0032db3), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`fb45dce7`](https://github.com/signalwire/signalwire-js/commit/fb45dce7f57a99533df445b4e1cda9587a1f3eb4), [`2a9b88d9`](https://github.com/signalwire/signalwire-js/commit/2a9b88d92c61fbf9e317234e860c34081c49c235), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`e5db0ef9`](https://github.com/signalwire/signalwire-js/commit/e5db0ef95325d3578b8729c15e8bfca5b7a4cb3a)]:
  - @signalwire/core@3.19.0

## [3.10.3] - 2023-08-17

### Fixed

- [#858](https://github.com/signalwire/signalwire-js/pull/858) [`bb50b2fb`](https://github.com/signalwire/signalwire-js/commit/bb50b2fb31c6bb016e355b6884d2c2cb11260170) - Fix custom CloseEvent implementation to avoid crash on WS close.

### Dependencies

- Updated dependencies [[`bb50b2fb`](https://github.com/signalwire/signalwire-js/commit/bb50b2fb31c6bb016e355b6884d2c2cb11260170)]:
  - @signalwire/core@3.18.3

## [3.10.2] - 2023-08-08

### Dependencies

- Updated dependencies [[`af7072b7`](https://github.com/signalwire/signalwire-js/commit/af7072b7415940b9ef00bb2d35b3ed6b6ba979a5)]:
  - @signalwire/core@3.18.2

## [3.10.1] - 2023-07-26

### Fixed

- [#834](https://github.com/signalwire/signalwire-js/pull/834) [`81beb29a`](https://github.com/signalwire/signalwire-js/commit/81beb29a9bc3c6135df37223fae44445967c1a84) - Add missing `CallRecording` getters.

### Dependencies

- Updated dependencies [[`81beb29a`](https://github.com/signalwire/signalwire-js/commit/81beb29a9bc3c6135df37223fae44445967c1a84)]:
  - @signalwire/core@3.18.1

## [3.10.0] - 2023-07-19

### Added

- [#827](https://github.com/signalwire/signalwire-js/pull/827) [`6a35f0a3`](https://github.com/signalwire/signalwire-js/commit/6a35f0a38071160a82f766bd8b73b4718f04108f) - Introduce `await call.pass()` function to pass the call to another consumer.

### Fixed

- [#828](https://github.com/signalwire/signalwire-js/pull/828) [`a7426731`](https://github.com/signalwire/signalwire-js/commit/a7426731f683b7a631fe0bc591b208fd2c21b5c0) - bugfix: Add `setPayload` on CallTap instance.

### Dependencies

- Updated dependencies [[`b44bd6fb`](https://github.com/signalwire/signalwire-js/commit/b44bd6fbd69acd206e43b5b1fefbe7989dc16298), [`6a35f0a3`](https://github.com/signalwire/signalwire-js/commit/6a35f0a38071160a82f766bd8b73b4718f04108f), [`65b0eea5`](https://github.com/signalwire/signalwire-js/commit/65b0eea54346b177e94fd3960e8cc21579c8a9ce)]:
  - @signalwire/core@3.18.0

## [3.9.2] - 2023-07-07

### Dependencies

- Updated dependencies [[`f814685b`](https://github.com/signalwire/signalwire-js/commit/f814685b24964c89510aad687d10f172265c0424), [`e8141c0e`](https://github.com/signalwire/signalwire-js/commit/e8141c0e85e11477e2911e6eccb1e96cff860d58), [`4e1116b6`](https://github.com/signalwire/signalwire-js/commit/4e1116b606ad41dc649c44eccf4f8b28d0dfa7d8)]:
  - @signalwire/core@3.17.0

## [3.9.1] - 2023-06-21

### Changed

- [#776](https://github.com/signalwire/signalwire-js/pull/776) [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431) - Internal Refactoring.

- [#776](https://github.com/signalwire/signalwire-js/pull/776) [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431) - Use instance map for Voice APIs instance creation

### Fixed

- [#808](https://github.com/signalwire/signalwire-js/pull/808) [`9fd8f9cb`](https://github.com/signalwire/signalwire-js/commit/9fd8f9cbff5fc03347248795f09e169166aba0f3) - Fix Collect and Prompt APIs' speech

- [#776](https://github.com/signalwire/signalwire-js/pull/776) [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431) - Handle failed state for `call.connect` events.

- [#776](https://github.com/signalwire/signalwire-js/pull/776) [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431) - Return RoomSessionMember object instead of plain Member object.

### Dependencies

- Updated dependencies [[`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`9fd8f9cb`](https://github.com/signalwire/signalwire-js/commit/9fd8f9cbff5fc03347248795f09e169166aba0f3), [`aaa07479`](https://github.com/signalwire/signalwire-js/commit/aaa07479db10685e72d96ea43927d759dbac076e), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`f3711f17`](https://github.com/signalwire/signalwire-js/commit/f3711f1726a9001a4204527b34b452de80e9a0e6), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431)]:
  - @signalwire/core@3.16.0

## [3.9.0] - 2023-05-22

### Added

- [#778](https://github.com/signalwire/signalwire-js/pull/778) [`aa31e1a0`](https://github.com/signalwire/signalwire-js/commit/aa31e1a0307e7c1f3927d985ecd48ec06b9a1312) - Add support for `maxPricePerMinute` in `dial` and `connect` for the Voice Call object.

### Dependencies

- Updated dependencies [[`aa31e1a0`](https://github.com/signalwire/signalwire-js/commit/aa31e1a0307e7c1f3927d985ecd48ec06b9a1312), [`4e8e5b0d`](https://github.com/signalwire/signalwire-js/commit/4e8e5b0d859733b9c7455150cd837e42e851ef29), [`9fb4e5f4`](https://github.com/signalwire/signalwire-js/commit/9fb4e5f43640b3e5a3978634e6465562a20ac4a5)]:
  - @signalwire/core@3.15.0

## [3.8.2] - 2023-03-30

### Fixed

- [#774](https://github.com/signalwire/signalwire-js/pull/774) [`09af75aa`](https://github.com/signalwire/signalwire-js/commit/09af75aaa7b4f02b1d372bb6a225dadce9ab50ef) - Fix issue with simultaneous `CallPlayback` and `CallRecording`.

## [3.8.1] - 2023-03-24

### Dependencies

- Updated dependencies [[`e299b048`](https://github.com/signalwire/signalwire-js/commit/e299b048fbcf876f2409335a98de1295fba70480)]:
  - @signalwire/core@3.14.1

## [3.8.0] - 2023-03-22

### Added

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Add `promote`/`demote` methods to RoomSession.

### Changed

- [#738](https://github.com/signalwire/signalwire-js/pull/738) [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a) - Remove executeActionWatcher and related functions.

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Expose the `room.audience_count` event on the RoomSession.

### Dependencies

- Updated dependencies [[`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`688306f4`](https://github.com/signalwire/signalwire-js/commit/688306f4a5bd157dee40c13ce757001cfa30e832), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a)]:
  - @signalwire/core@3.14.0

## [3.7.0] - 2023-03-07

### Added

- [#706](https://github.com/signalwire/signalwire-js/pull/706) [`a937768a`](https://github.com/signalwire/signalwire-js/commit/a937768a0b965d35b8468324a5d85273fc46e638) - Expose `calling.collect` API.

### Fixed

- [#732](https://github.com/signalwire/signalwire-js/pull/732) [`9ad158b9`](https://github.com/signalwire/signalwire-js/commit/9ad158b90f73bed038d18f7f8b745931c266c3cf) - Emit `playback.failed` event on playback failure
  Resolve the playback `.ended()` promise in case of Playback failure
  Resolve the playback `.ended()` promise in case of Prompt failure
  Resolve the playback `.ended()` promise in case of Recording failure
  Resolve the playback `.ended()` promise in case of Detect failure
  Resolve the playback `.ended()` promise in case of Collect failure
  Resolve the playback `.ended()` promise in case of Tap failure

- [#750](https://github.com/signalwire/signalwire-js/pull/750) [`fe3b0e29`](https://github.com/signalwire/signalwire-js/commit/fe3b0e29880bfd6259e9a05acb2a40fbc3fda02b) - Fix bug between getRoomSessions and nested objects in the Video client.

- [#711](https://github.com/signalwire/signalwire-js/pull/711) [`45536d5f`](https://github.com/signalwire/signalwire-js/commit/45536d5fb6a8e474a2f5b511ddf12fb474566b19) - Fix error on exposing the `state` property on the Voice Call object.

### Dependencies

- Updated dependencies [[`41482813`](https://github.com/signalwire/signalwire-js/commit/414828131a81f5bf2e57d786d8002d96e25f7597), [`a937768a`](https://github.com/signalwire/signalwire-js/commit/a937768a0b965d35b8468324a5d85273fc46e638), [`5b002eab`](https://github.com/signalwire/signalwire-js/commit/5b002eab500142c97777c16e7aab846282eca656), [`bbb9544c`](https://github.com/signalwire/signalwire-js/commit/bbb9544cf41d9825a84cff825e8c1c0ceda4920b), [`45536d5f`](https://github.com/signalwire/signalwire-js/commit/45536d5fb6a8e474a2f5b511ddf12fb474566b19), [`95325ec9`](https://github.com/signalwire/signalwire-js/commit/95325ec9d1f3c98bd478eb799abefb1dabbd7759), [`bb216980`](https://github.com/signalwire/signalwire-js/commit/bb21698019ef5db7e4cd0376f1cd6bfec66fea98), [`9ad158b9`](https://github.com/signalwire/signalwire-js/commit/9ad158b90f73bed038d18f7f8b745931c266c3cf), [`0bdda948`](https://github.com/signalwire/signalwire-js/commit/0bdda94824e9ffefa5830b951488899e0dbd8d85), [`e1e1e336`](https://github.com/signalwire/signalwire-js/commit/e1e1e336df952429126eea2c2b8aaea8e55d29d7), [`55a309f8`](https://github.com/signalwire/signalwire-js/commit/55a309f8d6189c97941a55d8396bfe0e0e588fc8), [`e2c475a7`](https://github.com/signalwire/signalwire-js/commit/e2c475a7ceb4e9eea6438b1d3dbb8457b7ad3e70)]:
  - @signalwire/core@3.13.0

## [3.6.0] - 2022-11-23

### Added

- [#571](https://github.com/signalwire/signalwire-js/pull/571) [`a32413d8`](https://github.com/signalwire/signalwire-js/commit/a32413d89f9dc155be91aa148c4c56edec7e8413) - Add `detectAnsweringMachine(params)` as an alias to `amd(params)` in Voice Call.

### Changed

- [#623](https://github.com/signalwire/signalwire-js/pull/623) [`3e7ce646`](https://github.com/signalwire/signalwire-js/commit/3e7ce6461a423e5b1014f16bf69b53793dfe1024) - Review the Voice namespace interface: deprecate `waitForEnded` and add `ended`.

### Fixed

- [#666](https://github.com/signalwire/signalwire-js/pull/666) [`f4c340a3`](https://github.com/signalwire/signalwire-js/commit/f4c340a3afb23f7a135275cc19f30c4fcad5759a) - Correct promptTTS description.

- [#676](https://github.com/signalwire/signalwire-js/pull/676) [`45248ff2`](https://github.com/signalwire/signalwire-js/commit/45248ff253894b7b208d39f17cd24b68e1f1f0b5) - Fix `disconnected` method on Voice Call.

### Dependencies

- Updated dependencies [[`583ef730`](https://github.com/signalwire/signalwire-js/commit/583ef730675884b51045784980a12d80fc573b3b), [`3e7ce646`](https://github.com/signalwire/signalwire-js/commit/3e7ce6461a423e5b1014f16bf69b53793dfe1024), [`c82e6576`](https://github.com/signalwire/signalwire-js/commit/c82e65765555eecf0fd82b5e981ea928d133607e), [`a32413d8`](https://github.com/signalwire/signalwire-js/commit/a32413d89f9dc155be91aa148c4c56edec7e8413), [`aa5a469c`](https://github.com/signalwire/signalwire-js/commit/aa5a469ca1e33ca7bca6edb68f45f9edc3faf361)]:
  - @signalwire/core@3.12.2

## [3.5.1] - 2022-10-06

### Fixed

- [#658](https://github.com/signalwire/signalwire-js/pull/658) [`b765449b`](https://github.com/signalwire/signalwire-js/commit/b765449bb22604b7f116a365027e17b10984d0af) - Skip auto-subscribe logic for a RoomSession without valid subscriptions.

* [#657](https://github.com/signalwire/signalwire-js/pull/657) [`50f2e07f`](https://github.com/signalwire/signalwire-js/commit/50f2e07f2e51a11b202d30b38cd37bc0d2270dc6) - Hotfix for `getRecordings`, `getPlaybacks` and `getStreams` return objects without room_session_id.

- [#655](https://github.com/signalwire/signalwire-js/pull/655) [`31af8209`](https://github.com/signalwire/signalwire-js/commit/31af820961f6c1cdc810b3b42a4dcf543610fcb4) - Fix race condition on auto-connect Clients.

### Dependencies

- Updated dependencies [[`b765449b`](https://github.com/signalwire/signalwire-js/commit/b765449bb22604b7f116a365027e17b10984d0af), [`021d9b83`](https://github.com/signalwire/signalwire-js/commit/021d9b8364777e493aa8d320d5b03a4275f640bb), [`e3453977`](https://github.com/signalwire/signalwire-js/commit/e3453977b7df3cd34939ee8e6f15c6d83fb08134), [`be8b8dea`](https://github.com/signalwire/signalwire-js/commit/be8b8deadb8652d4ea54bd2b4c3cfd29d2f94662)]:
  - @signalwire/core@3.12.1

## [3.5.0] - 2022-09-21

### Added

- [#633](https://github.com/signalwire/signalwire-js/pull/633) [`f1102bb6`](https://github.com/signalwire/signalwire-js/commit/f1102bb6817f119b2f7b063c7e1e5ab2be4e8ec5) - Expose `getStreams` and `startStream` on the `RoomSession` object.

* [#627](https://github.com/signalwire/signalwire-js/pull/627) [`6cf01e1c`](https://github.com/signalwire/signalwire-js/commit/6cf01e1cecfc30395691aae68b6be15de140bd41) - Expose `getMeta` and `getMemberMeta` methods on the RoomSession.

### Changed

- [#641](https://github.com/signalwire/signalwire-js/pull/641) [`569213c8`](https://github.com/signalwire/signalwire-js/commit/569213c874b30d7c1452eb56775ee5aa9d370252) - Move debounce implementation from `realtime-api` to `core`.

### Fixed

- [#634](https://github.com/signalwire/signalwire-js/pull/634) [`c09d7649`](https://github.com/signalwire/signalwire-js/commit/c09d7649f2f52cee2cd5c3e95c3e7e547450dae3) - Stop caching `realtime-api` clients to avoid race on disconnect/reconnect.

### Dependencies

- Updated dependencies [[`569213c8`](https://github.com/signalwire/signalwire-js/commit/569213c874b30d7c1452eb56775ee5aa9d370252), [`6cf01e1c`](https://github.com/signalwire/signalwire-js/commit/6cf01e1cecfc30395691aae68b6be15de140bd41), [`577e81d3`](https://github.com/signalwire/signalwire-js/commit/577e81d31cd237e87518a61532148c8c8563c3f6), [`0e7bffdd`](https://github.com/signalwire/signalwire-js/commit/0e7bffdd8ace2233c90c48fde925215e8753d53b), [`f1102bb6`](https://github.com/signalwire/signalwire-js/commit/f1102bb6817f119b2f7b063c7e1e5ab2be4e8ec5), [`5c3abab6`](https://github.com/signalwire/signalwire-js/commit/5c3abab6f2b9e47b17417f4378898cf240d12dba), [`577e81d3`](https://github.com/signalwire/signalwire-js/commit/577e81d31cd237e87518a61532148c8c8563c3f6), [`c00b343e`](https://github.com/signalwire/signalwire-js/commit/c00b343ed48305c12fcc599e46e76f2116ab2706)]:
  - @signalwire/core@3.12.0

## [3.4.0] - 2022-08-17

### Added

- [#615](https://github.com/signalwire/signalwire-js/pull/615) [`7b196107`](https://github.com/signalwire/signalwire-js/commit/7b196107f120db410c5f85a3fd20682bacbf7576) - Expose `.disconnect()` method on all the client namespaces: Video, Chat, PubSub, Task, Voice and Messaging.

* [#619](https://github.com/signalwire/signalwire-js/pull/619) [`d7ce34d3`](https://github.com/signalwire/signalwire-js/commit/d7ce34d3e0a54952321b3186abcbad3cd97b7f81) - Add methods to manage a RoomSession and Member `meta`: `updateMeta`, `deleteMeta`, `setMemberMeta`, `updateMemberMeta`, `deleteMemberMeta`.

### Fixed

- [#621](https://github.com/signalwire/signalwire-js/pull/621) [`eff4736c`](https://github.com/signalwire/signalwire-js/commit/eff4736c3753e275cee30920b36eb6d205a4a00f) - Fix comment for `waitForDisconnected` on Voice Call.

* [#615](https://github.com/signalwire/signalwire-js/pull/615) [`7b196107`](https://github.com/signalwire/signalwire-js/commit/7b196107f120db410c5f85a3fd20682bacbf7576) - hotfix: always connect the lower level client.

### Changed

- [#610](https://github.com/signalwire/signalwire-js/pull/610) [`eb1c3fe9`](https://github.com/signalwire/signalwire-js/commit/eb1c3fe985767f747747ca0525b1c0710af862cb) - Updated interfaces to match the spec, update `RoomSession.getRecordings` and `RoomSession.getPlaybacks` to return stateful objects, deprecated `RoomSession.members` and `RoomSession.recordings` in favour of their corresponding getters.

- [#601](https://github.com/signalwire/signalwire-js/pull/601) [`d8cf078c`](https://github.com/signalwire/signalwire-js/commit/d8cf078ca113286b77ee978ae6c9c891a5b9d634) - [internal] Updated internals to support ignoring methods coming from `core`.

* [#605](https://github.com/signalwire/signalwire-js/pull/605) [`2f909c9e`](https://github.com/signalwire/signalwire-js/commit/2f909c9ef670eeaed7b3444b9d4bf703bfbc3a1b) - Change how the SDK agent is defined.

- [#607](https://github.com/signalwire/signalwire-js/pull/607) [`f421f92a`](https://github.com/signalwire/signalwire-js/commit/f421f92a05287b1d8da21e8fc428e42c61afffdf) - remove `updateToken` and `session.expiring` event from realtime-api Chat and PubSub namespaces.

### Dependencies

- Updated dependencies [[`3d202275`](https://github.com/signalwire/signalwire-js/commit/3d20227590f224cc1364171702ad3bffc83ff7be), [`9a6936e6`](https://github.com/signalwire/signalwire-js/commit/9a6936e68d9578bd8f0b1810a6a9bc1863338b90), [`fa62d67f`](https://github.com/signalwire/signalwire-js/commit/fa62d67ff13398f1a29f10ac8d6d6299a42e7554), [`d8cf078c`](https://github.com/signalwire/signalwire-js/commit/d8cf078ca113286b77ee978ae6c9c891a5b9d634), [`d7ce34d3`](https://github.com/signalwire/signalwire-js/commit/d7ce34d3e0a54952321b3186abcbad3cd97b7f81), [`5402ffcf`](https://github.com/signalwire/signalwire-js/commit/5402ffcf2169bfc05f490ead9b6ae9351a7968bc), [`2f909c9e`](https://github.com/signalwire/signalwire-js/commit/2f909c9ef670eeaed7b3444b9d4bf703bfbc3a1b), [`eb1c3fe9`](https://github.com/signalwire/signalwire-js/commit/eb1c3fe985767f747747ca0525b1c0710af862cb), [`7b196107`](https://github.com/signalwire/signalwire-js/commit/7b196107f120db410c5f85a3fd20682bacbf7576), [`7bdd7ab0`](https://github.com/signalwire/signalwire-js/commit/7bdd7ab03414a4b9aa337e9d6b339891c8feda36), [`81503784`](https://github.com/signalwire/signalwire-js/commit/815037849bbca0359b47e27de8979121623e4101), [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120), [`4e2284d6`](https://github.com/signalwire/signalwire-js/commit/4e2284d6b328f023a06e2e4b924182093fc9eb5f)]:
  - @signalwire/core@3.11.0

## [3.3.1]- 2022-07-27

### Changed

- [#596](https://github.com/signalwire/signalwire-js/pull/596) [`6bc89d81`](https://github.com/signalwire/signalwire-js/commit/6bc89d81fe6ffa7530f60ed90482db1e7a39d6ac) - Improve auto-subscribe logic in `Video` and `PubSub` namespaces.

### Fixed

- [#597](https://github.com/signalwire/signalwire-js/pull/597) [`b2abd7ac`](https://github.com/signalwire/signalwire-js/commit/b2abd7ac3a21b058beba0689ddbe8af3b83a6b40) - Fix missing export for `DeviceBuilder`

### Dependencies

- Updated dependencies [[`6bc89d81`](https://github.com/signalwire/signalwire-js/commit/6bc89d81fe6ffa7530f60ed90482db1e7a39d6ac)]:
  - @signalwire/core@3.10.1

## [3.3.0]- 2022-07-14

### Added

- [#560](https://github.com/signalwire/signalwire-js/pull/560) [`d308daf8`](https://github.com/signalwire/signalwire-js/commit/d308daf88b99d69465f03c240ecd6d1806a379a9) - Expose methods to `seek` to a specific video position during playback.

### Fixed

- [#583](https://github.com/signalwire/signalwire-js/pull/583) [`8ec914b6`](https://github.com/signalwire/signalwire-js/commit/8ec914b6c5f446ecc4b9fae7587b89da360dddf8) - Fix issue with missing `member.update` events in Realtime-API SDK.

### Changed

- [#577](https://github.com/signalwire/signalwire-js/pull/577) [`9e1bf9d8`](https://github.com/signalwire/signalwire-js/commit/9e1bf9d841be864064fd78bfd36915cfb52cff21) - Remove all the internal docs.ts files and overall intellisense improvements.

* [#584](https://github.com/signalwire/signalwire-js/pull/584) [`9eb9851f`](https://github.com/signalwire/signalwire-js/commit/9eb9851f0bb048b7ed24d2c1bcfc23915a11c7c7) - Remove option to pass `volume` from methods of Voice.Playlist typings.

### Dependencies

- Updated dependencies [[`8ec914b6`](https://github.com/signalwire/signalwire-js/commit/8ec914b6c5f446ecc4b9fae7587b89da360dddf8), [`9e1bf9d8`](https://github.com/signalwire/signalwire-js/commit/9e1bf9d841be864064fd78bfd36915cfb52cff21), [`9eb9851f`](https://github.com/signalwire/signalwire-js/commit/9eb9851f0bb048b7ed24d2c1bcfc23915a11c7c7), [`bbc21e43`](https://github.com/signalwire/signalwire-js/commit/bbc21e43aadcff7fec6d8416ef1eb101f5ed49d0), [`d308daf8`](https://github.com/signalwire/signalwire-js/commit/d308daf88b99d69465f03c240ecd6d1806a379a9)]:
  - @signalwire/core@3.10.0

## [3.2.0] - 2022-06-24

### Added

- [#581](https://github.com/signalwire/signalwire-js/pull/581) [`14c08b89`](https://github.com/signalwire/signalwire-js/commit/14c08b899bfd763be87a63580ee94a00ed514856) - Expose `removeAllMembers()` on RoomSession.

* [#580](https://github.com/signalwire/signalwire-js/pull/580) [`e8a54a63`](https://github.com/signalwire/signalwire-js/commit/e8a54a63003ddd1f07302b2fae140296135ad666) - Expose `getRoomSessions()` and `getRoomSessionById()` on the VideoClient to retrieve in-progress RoomSession objects.

### Dependencies

- Updated dependencies [[`e8a54a63`](https://github.com/signalwire/signalwire-js/commit/e8a54a63003ddd1f07302b2fae140296135ad666), [`f15032f1`](https://github.com/signalwire/signalwire-js/commit/f15032f180503453c49d10cbf2a8ef5e24e27dc3), [`14c08b89`](https://github.com/signalwire/signalwire-js/commit/14c08b899bfd763be87a63580ee94a00ed514856), [`b168fc4f`](https://github.com/signalwire/signalwire-js/commit/b168fc4f92411bff70c50009f4a326171c886a55)]:
  - @signalwire/core@3.9.1

## [3.1.1] - 2022-06-15

### Fixed

- [#570](https://github.com/signalwire/signalwire-js/pull/570) [`b97ffcbe`](https://github.com/signalwire/signalwire-js/commit/b97ffcbef266bef91158c3553a81832e5790e240) - Fix internal bundling to allow the usage of the `esm` output.

## [3.1.0] - 2022-06-10

### Added

- [#562](https://github.com/signalwire/signalwire-js/pull/562) [`02d97ded`](https://github.com/signalwire/signalwire-js/commit/02d97ded0295fa6cf75dd154eabd64871a17f7d6) - Add `layout` property to RoomSession.play().

### Dependencies

- Updated dependencies [[`02d97ded`](https://github.com/signalwire/signalwire-js/commit/02d97ded0295fa6cf75dd154eabd64871a17f7d6)]:
  - @signalwire/core@3.9.0

## [3.0.2] - 2022-06-06

### Changed

- [#558](https://github.com/signalwire/signalwire-js/pull/558) [`3a2b7883`](https://github.com/signalwire/signalwire-js/commit/3a2b7883f7e85aea9a38727b793085fc16a0885b) - Remove under development warnings for `Chat` and `PubSub` namespaces.

## [3.0.1] - 2022-06-01

### Changed

- [#542](https://github.com/signalwire/signalwire-js/pull/542) [`875b2bb8`](https://github.com/signalwire/signalwire-js/commit/875b2bb844cc34d0b173b8544a5c34f0d39fc9c3) - Add `layoutName` to the RoomSession interface.

- [#546](https://github.com/signalwire/signalwire-js/pull/546) [`fc4689df`](https://github.com/signalwire/signalwire-js/commit/fc4689dfd1955f03d59fb8a0ae8e530d4ef8f79d) - Internal changes to migrate from `setWorker`/`attachWorker` to `runWorkers` and from `payload` to `initialState`.

* [#554](https://github.com/signalwire/signalwire-js/pull/554) [`1b95b93b`](https://github.com/signalwire/signalwire-js/commit/1b95b93ba30f7c226d99c6c667604bcce8349d26) - Update typings.

### Fixed

- [#553](https://github.com/signalwire/signalwire-js/pull/553) [`47ed1712`](https://github.com/signalwire/signalwire-js/commit/47ed17129422201edd4782137b0e7017f26dda00) - Fix `task.received` handler on the Task namespace.

### Dependencies

- Updated dependencies [[`875b2bb8`](https://github.com/signalwire/signalwire-js/commit/875b2bb844cc34d0b173b8544a5c34f0d39fc9c3), [`fc4689df`](https://github.com/signalwire/signalwire-js/commit/fc4689dfd1955f03d59fb8a0ae8e530d4ef8f79d), [`1b95b93b`](https://github.com/signalwire/signalwire-js/commit/1b95b93ba30f7c226d99c6c667604bcce8349d26)]:
  - @signalwire/core@3.8.1

## [3.1.0] - 2022-05-19

### Added

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Expose the `Voice.createPlaylist()` method to simplify playing media on a Voice Call.

* [#524](https://github.com/signalwire/signalwire-js/pull/524) [`a0b7b4d0`](https://github.com/signalwire/signalwire-js/commit/a0b7b4d0f5eb95c7ccbf752c43c8abd53e8a4de7) - Add `Call.waitFor()` method

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to record audio in `Voice` Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to prompt for digits or speech using `prompt()` in `Voice` Call.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Expose the `Voice.createDialer()` method to simplify dialing devices on a Voice Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to play media in `Voice` Call.

- [#460](https://github.com/signalwire/signalwire-js/pull/460) [`7e64fb28`](https://github.com/signalwire/signalwire-js/commit/7e64fb28db2f21394b8c44789db603c7253dacc2) - Initial implementation of the `Voice` namespace. Adds ability to make outbound calls.

* [#472](https://github.com/signalwire/signalwire-js/pull/472) [`76e92dd9`](https://github.com/signalwire/signalwire-js/commit/76e92dd95abc32dee4e4add8ad6397b8d3216293) - Add `Messaging` namespace in realtime-api SDK.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to connect and disconnect legs in `Voice` namespace.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to tap audio in `Voice` Call.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to start detectors for machine/digit/fax in `Voice` Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add `waitForEnded()` method to the CallPlayback component to easily wait for playbacks to end.

- [#533](https://github.com/signalwire/signalwire-js/pull/533) [`b6d5bb3b`](https://github.com/signalwire/signalwire-js/commit/b6d5bb3bf4576961aff6b9c8b1397a5085b02056) - Introduce `PubSub` namespace.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to receive inbound Calls in the `Voice` namespace.

- [#471](https://github.com/signalwire/signalwire-js/pull/471) [`cf845603`](https://github.com/signalwire/signalwire-js/commit/cf8456031c4ba3adea0b8369d1fac7e2fed407b8) - Add `Task` namespace

* [#539](https://github.com/signalwire/signalwire-js/pull/539) [`4c0909dd`](https://github.com/signalwire/signalwire-js/commit/4c0909ddb57b86bb0216af0c83d37f11a0e54754) - Rename Call method `waitUntilConnected` to `waitForDisconnected` and expose `disconnect` on the VoiceClient

- [#535](https://github.com/signalwire/signalwire-js/pull/535) [`f89b8848`](https://github.com/signalwire/signalwire-js/commit/f89b884860451e010c1c76df5d73f81e2f722fe7) - Expose `connectPhone()` and `connectSip()` helper methods on the Voice Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add sendDigits method to Voice.Call

- [#491](https://github.com/signalwire/signalwire-js/pull/491) [`0b98a9e4`](https://github.com/signalwire/signalwire-js/commit/0b98a9e48b751d244abea92fea4cd79e92dfc0b7) - Expose `disconnect()` from Messaging and Task Client objects.

- [#536](https://github.com/signalwire/signalwire-js/pull/536) [`a6e27d88`](https://github.com/signalwire/signalwire-js/commit/a6e27d883527c987b9c5945232e62fcc17762ee0) - Fix calling.call.received event handler

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to return the payload when the dial fails.

* [#531](https://github.com/signalwire/signalwire-js/pull/531) [`9e6ad45f`](https://github.com/signalwire/signalwire-js/commit/9e6ad45f0721f72fd8c2f4320b10c0a71757d6a9) - Fix issue with `Call.connect` and inbound calls.

- [#530](https://github.com/signalwire/signalwire-js/pull/530) [`61838b07`](https://github.com/signalwire/signalwire-js/commit/61838b07f8a1e217c1d7367f5f3774698ec97c56) - Change `connect` to accept builder objects.

* [#516](https://github.com/signalwire/signalwire-js/pull/516) [`484d7fc8`](https://github.com/signalwire/signalwire-js/commit/484d7fc802fe21eb71be7aa5f091f1db05d5229d) - Add `Messaging.send()` return types.

- [#499](https://github.com/signalwire/signalwire-js/pull/499) [`19ffe276`](https://github.com/signalwire/signalwire-js/commit/19ffe2766c682131c9153a57d7998c51005f8b6d) - Make `context` optional in Messaging `send()` method.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Migrate `createDialer` and `createPlaylist` to Dialer and Playlist constructors

- [#529](https://github.com/signalwire/signalwire-js/pull/529) [`e09afd5b`](https://github.com/signalwire/signalwire-js/commit/e09afd5bf1ff72469aea65532c08064966c38115) - Renamed Dialer to DeviceBuilder, added ability to pass `region` to `dialPhone` and `dialSip`.

### Changed

- [#532](https://github.com/signalwire/signalwire-js/pull/532) [`12c64580`](https://github.com/signalwire/signalwire-js/commit/12c6458088fe5d2e560095f0d4ba0b5bbbc65b5c) - Improve typings of the public interface for the `Chat` namespace.

### Dependencies

- Updated dependencies [[`f89b8848`](https://github.com/signalwire/signalwire-js/commit/f89b884860451e010c1c76df5d73f81e2f722fe7), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`a0b7b4d0`](https://github.com/signalwire/signalwire-js/commit/a0b7b4d0f5eb95c7ccbf752c43c8abd53e8a4de7), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`0b98a9e4`](https://github.com/signalwire/signalwire-js/commit/0b98a9e48b751d244abea92fea4cd79e92dfc0b7), [`f69ef584`](https://github.com/signalwire/signalwire-js/commit/f69ef5848eebf8c4c1901fda5ea1d3c8a92b6a84), [`c02b694e`](https://github.com/signalwire/signalwire-js/commit/c02b694e43132b37a162ba6dc93feeb0dfbeae65), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`5c96bf85`](https://github.com/signalwire/signalwire-js/commit/5c96bf85a0d584d8467450144b0bbe97c863a571), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`05bb3c31`](https://github.com/signalwire/signalwire-js/commit/05bb3c31fc7527c17814535b59e926db09d34f43), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`12c64580`](https://github.com/signalwire/signalwire-js/commit/12c6458088fe5d2e560095f0d4ba0b5bbbc65b5c), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`24ef812a`](https://github.com/signalwire/signalwire-js/commit/24ef812a392eb1b46cf638a373638a34cdb20a96), [`cf845603`](https://github.com/signalwire/signalwire-js/commit/cf8456031c4ba3adea0b8369d1fac7e2fed407b8), [`7e64fb28`](https://github.com/signalwire/signalwire-js/commit/7e64fb28db2f21394b8c44789db603c7253dacc2), [`76e92dd9`](https://github.com/signalwire/signalwire-js/commit/76e92dd95abc32dee4e4add8ad6397b8d3216293), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`b36970ac`](https://github.com/signalwire/signalwire-js/commit/b36970ac5f9993fe1fd7db94910cc6aba7c1a204), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`b6d5bb3b`](https://github.com/signalwire/signalwire-js/commit/b6d5bb3bf4576961aff6b9c8b1397a5085b02056), [`61838b07`](https://github.com/signalwire/signalwire-js/commit/61838b07f8a1e217c1d7367f5f3774698ec97c56), [`6ebf3f64`](https://github.com/signalwire/signalwire-js/commit/6ebf3f64f580bbcc91863b330082fc0ef9ac806a), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`e09afd5b`](https://github.com/signalwire/signalwire-js/commit/e09afd5bf1ff72469aea65532c08064966c38115), [`4c0909dd`](https://github.com/signalwire/signalwire-js/commit/4c0909ddb57b86bb0216af0c83d37f11a0e54754)]:
  - @signalwire/core@3.8.0

## [3.0.0-beta.9] - 2022-04-01

### Dependencies

- Updated dependencies [[`a9abe1d5`](https://github.com/signalwire/signalwire-js/commit/a9abe1d5f2267513f0765fd47a2cf9334463b445)]:
  - @signalwire/core@3.7.1

## [3.0.0-beta.8] - 2022-03-25

### Added

- [#456](https://github.com/signalwire/signalwire-js/pull/456) [`c487d29b`](https://github.com/signalwire/signalwire-js/commit/c487d29ba47be5cb5a47861b10145f6c6ef9ebe4) - Add ability to handle member's `currentPosition`.

* [#416](https://github.com/signalwire/signalwire-js/pull/416) [`8f6e6819`](https://github.com/signalwire/signalwire-js/commit/8f6e6819310096d8ca104615a3236611e167c361) - Initial implementation of the `Chat` namespace, Updated version of getClient to also cache the internals, Added utility for creating session clients (setupClient) to simplify and abstract all the required steps for creating (or getting from the cache) a client based on the passed credentials.

### Changed

- [#464](https://github.com/signalwire/signalwire-js/pull/464) [`2c8fc597`](https://github.com/signalwire/signalwire-js/commit/2c8fc59719e7f40c1d9b01ebf67190d358dcea46) - Upgrade all dependencies.

* [#452](https://github.com/signalwire/signalwire-js/pull/452) [`563a31e5`](https://github.com/signalwire/signalwire-js/commit/563a31e554aec607f939d25dc45c9a1aefb7fe40) - Expose `setMeta` and `setMemberMeta` methods on the `RoomSession`.

### Fixed

- [#469](https://github.com/signalwire/signalwire-js/pull/469) [`4d7bcc30`](https://github.com/signalwire/signalwire-js/commit/4d7bcc30775ea6428be1ca0e6fda349653db808b) - Fix Chat methods that required the underlay client to be connected.

### Dependencies

- Updated dependencies [[`8f203450`](https://github.com/signalwire/signalwire-js/commit/8f20345085b9dde85f93c0b2bbdcb0c5d3060d8e), [`c487d29b`](https://github.com/signalwire/signalwire-js/commit/c487d29ba47be5cb5a47861b10145f6c6ef9ebe4), [`b1b022a4`](https://github.com/signalwire/signalwire-js/commit/b1b022a43bc030d65e287d43244025ba9ab32cf9), [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592), [`4a918d56`](https://github.com/signalwire/signalwire-js/commit/4a918d5605518750a00ccf079f2312c51f4c05ea), [`058e9a0c`](https://github.com/signalwire/signalwire-js/commit/058e9a0cee9fe5b2148d8c6bae3e8524ef180f98), [`2c8fc597`](https://github.com/signalwire/signalwire-js/commit/2c8fc59719e7f40c1d9b01ebf67190d358dcea46), [`563a31e5`](https://github.com/signalwire/signalwire-js/commit/563a31e554aec607f939d25dc45c9a1aefb7fe40), [`1944348f`](https://github.com/signalwire/signalwire-js/commit/1944348f3d3f4f5c2a538bb100747b8faf2dae1b), [`4d7bcc30`](https://github.com/signalwire/signalwire-js/commit/4d7bcc30775ea6428be1ca0e6fda349653db808b)]:
  - @signalwire/core@3.7.0

## [3.0.0-beta.7] - 2022-03-02

### Added

- [#426](https://github.com/signalwire/signalwire-js/pull/426) [`edc573f2`](https://github.com/signalwire/signalwire-js/commit/edc573f2cb7f3c82430b833117f537b7dcc462c8) - Expose the `removeAllListeners` method for all the components.

### Patch Changes

- [#435](https://github.com/signalwire/signalwire-js/pull/435) [`cc457600`](https://github.com/signalwire/signalwire-js/commit/cc45760040abefa0d95865a61d037e878d50737d) - Calls to `RoomSession.subscribe()` are now optional.

### Dependencies

- Updated dependencies [[`bc0134e9`](https://github.com/signalwire/signalwire-js/commit/bc0134e939c654f5e2d78188b041f31c611724c1), [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592), [`d168a035`](https://github.com/signalwire/signalwire-js/commit/d168a035c6f56f5002935269a2f379ef796355df), [`edc573f2`](https://github.com/signalwire/signalwire-js/commit/edc573f2cb7f3c82430b833117f537b7dcc462c8)]:
  - @signalwire/core@3.6.0

## [3.0.0-beta.6] - 2022-02-04

### Dependencies

- Updated dependencies [[`da526347`](https://github.com/signalwire/signalwire-js/commit/da526347cdd0503635ff9ae8cab6a7eaef334da4), [`3f851e2a`](https://github.com/signalwire/signalwire-js/commit/3f851e2a83e5f62919ff689efb5adb2084654ad9), [`6d234ccc`](https://github.com/signalwire/signalwire-js/commit/6d234ccc34eec4f12ae22ce67a4461ac2cebb9f2), [`bbbff2c6`](https://github.com/signalwire/signalwire-js/commit/bbbff2c6bf8ea886163f13768a953f5d19e6a7ab), [`1bda6272`](https://github.com/signalwire/signalwire-js/commit/1bda62721d837f59eb8cf50981e0b25bbe8d07f8), [`c557e4e5`](https://github.com/signalwire/signalwire-js/commit/c557e4e54c790c4b003af855dfb0807209d478c1), [`f6290de0`](https://github.com/signalwire/signalwire-js/commit/f6290de05c32debef71482e61a27e5385ff81253), [`603d4497`](https://github.com/signalwire/signalwire-js/commit/603d4497ac777c063167ce6481b0ddf5c715ae3c), [`7c688bb5`](https://github.com/signalwire/signalwire-js/commit/7c688bb575fa737c468e5cc330ef145dfe480812), [`6d94624b`](https://github.com/signalwire/signalwire-js/commit/6d94624b943a653393e66ef4c1aeb72ac7ef2864), [`743168df`](https://github.com/signalwire/signalwire-js/commit/743168df0abef04960e18bba70474f489e1d36ce), [`c33a4565`](https://github.com/signalwire/signalwire-js/commit/c33a4565535fcdf96a751c29e6f040608fc8b777), [`d1174ec8`](https://github.com/signalwire/signalwire-js/commit/d1174ec8e81789d26314cb13665bb10fd2822d32)]:
  - @signalwire/core@3.5.0

## [3.0.0-beta.5] - 2022-01-11

### Added

- [#394](https://github.com/signalwire/signalwire-js/pull/394) [`03e5d42`](https://github.com/signalwire/signalwire-js/commit/03e5d4253cbcc93d39479aac8f5bcf419ce1f837) - Add `previewUrl` property to the RoomSession object.

### Dependencies

- Updated dependencies [[`03e5d42`](https://github.com/signalwire/signalwire-js/commit/03e5d4253cbcc93d39479aac8f5bcf419ce1f837), [`da52634`](https://github.com/signalwire/signalwire-js/commit/da526347cdd0503635ff9ae8cab6a7eaef334da4), [`3f851e2`](https://github.com/signalwire/signalwire-js/commit/3f851e2a83e5f62919ff689efb5adb2084654ad9), [`62c25d8`](https://github.com/signalwire/signalwire-js/commit/62c25d8468c37711f37c6674c24251755a4ada39), [`ed04e25`](https://github.com/signalwire/signalwire-js/commit/ed04e2586710bc06dc758cdc3fa9f1d580565efd), [`576b667`](https://github.com/signalwire/signalwire-js/commit/576b66799c41bfd2853d7edb822d8413a928854e)]:
  - @signalwire/core@3.4.1

## [3.0.0-beta.4] - 2021-11-02

### Dependencies

- Updated dependencies [[`bae6985`](https://github.com/signalwire/signalwire-js/commit/bae69856f67aa339c02e074fc936048f2cc7bc7b), [`fa40510`](https://github.com/signalwire/signalwire-js/commit/fa4051009213028955a043fedcfb7109da2e6f4b)]:
  - @signalwire/core@3.3.0

## [3.0.0-beta.2] - 2021-10-12

### Added

- [#297](https://github.com/signalwire/signalwire-js/pull/297) [`2675e5e`](https://github.com/signalwire/signalwire-js/commit/2675e5ea1ce9247a9e9b525cacf365cb8e4374ca) - Add support for the Playback APIs: `roomSession.play()` and the `RoomSessionPlayback` object to control it.

### Changed

- [#325](https://github.com/signalwire/signalwire-js/pull/325) [`7d183de`](https://github.com/signalwire/signalwire-js/commit/7d183de47bae0e1f436609ab63704ec1888134a8) - Upgrade dependency for handling WebSocket connections.

### Dependencies

- Updated dependencies [[`7d183de`](https://github.com/signalwire/signalwire-js/commit/7d183de47bae0e1f436609ab63704ec1888134a8), [`2675e5e`](https://github.com/signalwire/signalwire-js/commit/2675e5ea1ce9247a9e9b525cacf365cb8e4374ca)]:
  - @signalwire/core@3.2.0

## [3.0.0-beta.1] - 2021-10-06

### Changed

- [#302](https://github.com/signalwire/signalwire-js/pull/302) [`2ac7f6d`](https://github.com/signalwire/signalwire-js/commit/2ac7f6defeb9a1a2a4254c300a15c258f8a57cd7) - Added `setInputVolume`/`setOutputVolume` and marked `setMicrophoneVolume`/`setSpeakerVolume` as deprecated.

* [#305](https://github.com/signalwire/signalwire-js/pull/305) [`cec54bd`](https://github.com/signalwire/signalwire-js/commit/cec54bd208801f42a719a7777da802ae2c51a79a) - Convert timestamp properties to `Date` objects.

- [#311](https://github.com/signalwire/signalwire-js/pull/311) [`febb842`](https://github.com/signalwire/signalwire-js/commit/febb84202568fde1b94558c8b470ba9e348f1aa4) - Allow users to listen the `room.subscribed` event and change the `roomSession.subscribe()` to return a `Promise<RoomSessionFullState>`.

### Dependencies

- Updated dependencies [[`3af0ea6`](https://github.com/signalwire/signalwire-js/commit/3af0ea6ee53ea9e5009e5e36c7e7418833730159), [`72eb91b`](https://github.com/signalwire/signalwire-js/commit/72eb91bd74a046fa720868a4b43e6154d7a076f0), [`2ac7f6d`](https://github.com/signalwire/signalwire-js/commit/2ac7f6defeb9a1a2a4254c300a15c258f8a57cd7), [`cec54bd`](https://github.com/signalwire/signalwire-js/commit/cec54bd208801f42a719a7777da802ae2c51a79a), [`febb842`](https://github.com/signalwire/signalwire-js/commit/febb84202568fde1b94558c8b470ba9e348f1aa4), [`b60e9fc`](https://github.com/signalwire/signalwire-js/commit/b60e9fcea7f1f308efcc78081cb3fb61c60ae522), [`4d21716`](https://github.com/signalwire/signalwire-js/commit/4d2171661dcf2a9ebd5bb6b6daa5c32a78dfa21f), [`49b4aa9`](https://github.com/signalwire/signalwire-js/commit/49b4aa9d127df0d52512b6c44359fc7b7b88caae), [`685e0a2`](https://github.com/signalwire/signalwire-js/commit/685e0a240bec5ee065f8fde91879c476768e4c1f)]:
  - @signalwire/core@3.1.4

## [3.0.0-beta.0] - 2021-09-15

This is the initial release of `@signalwire/realtime-api`. Read the [Release Notes](https://github.com/signalwire/signalwire-js/releases/tag/%40signalwire%2Frealtime-api%403.0.0-beta.0) on GitHub!
