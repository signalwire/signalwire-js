# @signalwire/core

## 4.2.0 - 2025-01-21

### Added

- [#1130](https://github.com/signalwire/signalwire-js/pull/1130) [`fca4c09ac531ab88dec9d94f3a73d5cd06060d36`](https://github.com/signalwire/signalwire-js/commit/fca4c09ac531ab88dec9d94f3a73d5cd06060d36) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Introduce the set member position API

- [#1149](https://github.com/signalwire/signalwire-js/pull/1149) [`5e4539144f31ff154e3e295e57d939e86dee0840`](https://github.com/signalwire/signalwire-js/commit/5e4539144f31ff154e3e295e57d939e86dee0840) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Browser SDKs: Expose the `withAudio` and `withVideo` flags to indicate the receiving media.

- [#1069](https://github.com/signalwire/signalwire-js/pull/1069) [`fe5c4cca5c3dd14f0dc3af0579231973e57717f6`](https://github.com/signalwire/signalwire-js/commit/fe5c4cca5c3dd14f0dc3af0579231973e57717f6) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Remove implicit reauthentication

- [#1121](https://github.com/signalwire/signalwire-js/pull/1121) [`ed8d713ab9c399bcc335a147d499248d44c72468`](https://github.com/signalwire/signalwire-js/commit/ed8d713ab9c399bcc335a147d499248d44c72468) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Allow user to raise/lower thier hand

- [#1123](https://github.com/signalwire/signalwire-js/pull/1123) [`76e573f46553337990c397693985e5004eeecae1`](https://github.com/signalwire/signalwire-js/commit/76e573f46553337990c397693985e5004eeecae1) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Expose room layout on the `CallFabriRoomSession` object

### Modified

- [#1096](https://github.com/signalwire/signalwire-js/pull/1096) [`7130138f9dcd750bc2d9f9bee0d644a2e02425c6`](https://github.com/signalwire/signalwire-js/commit/7130138f9dcd750bc2d9f9bee0d644a2e02425c6) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix type interface in Message event

- [#1129](https://github.com/signalwire/signalwire-js/pull/1129) [`df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4`](https://github.com/signalwire/signalwire-js/commit/df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF & Video SDKs: Fix layout event parameter type

- [#1159](https://github.com/signalwire/signalwire-js/pull/1159) [`461943a395d9a40a10658c906447398bff7ec160`](https://github.com/signalwire/signalwire-js/commit/461943a395d9a40a10658c906447398bff7ec160) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Maintain the session connection state

- [#1089](https://github.com/signalwire/signalwire-js/pull/1089) [`d34f3360163292aedb3474ffc9f7e2017b9d0002`](https://github.com/signalwire/signalwire-js/commit/d34f3360163292aedb3474ffc9f7e2017b9d0002) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - ADD lock and unlock methods to CallFabricRoomSession

- [#1082](https://github.com/signalwire/signalwire-js/pull/1082) [`fcb722a9f831359d3a05f9d53282c825dc749fa2`](https://github.com/signalwire/signalwire-js/commit/fcb722a9f831359d3a05f9d53282c825dc749fa2) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Added chat namespace with convenience methods to to handle chat messages

- [#1145](https://github.com/signalwire/signalwire-js/pull/1145) [`84aaad9b4837739f87b3dd1de99a14eb1123653f`](https://github.com/signalwire/signalwire-js/commit/84aaad9b4837739f87b3dd1de99a14eb1123653f) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - added capabilities property to CallFabricRoomSession and `call.joined` event

- [#1095](https://github.com/signalwire/signalwire-js/pull/1095) [`db072e479d9b30ae7aa952c819220eda60f329bb`](https://github.com/signalwire/signalwire-js/commit/db072e479d9b30ae7aa952c819220eda60f329bb) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix message event type

- [#1092](https://github.com/signalwire/signalwire-js/pull/1092) [`a2682371fc53c2526f40530b9c9e706397da1a8d`](https://github.com/signalwire/signalwire-js/commit/a2682371fc53c2526f40530b9c9e706397da1a8d) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix Conversation API types

- [#1160](https://github.com/signalwire/signalwire-js/pull/1160) [`fd39f12ca49f9257933b59490c64563e3391a93a`](https://github.com/signalwire/signalwire-js/commit/fd39f12ca49f9257933b59490c64563e3391a93a) Thanks [@iAmmar7](https://github.com/iAmmar7)! - - Fix session emitter

  - Make SignalWire a singelton for Call Fabric SDK
  - Fix memory leak

- [#1143](https://github.com/signalwire/signalwire-js/pull/1143) [`f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc`](https://github.com/signalwire/signalwire-js/commit/f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Updated ConversationMessage GetAddressResponse ConversationMessage GetSubscriberInfoResponse with new properties

- [#1124](https://github.com/signalwire/signalwire-js/pull/1124) [`ada6c49538862f466dea659286ea8eb405f4f636`](https://github.com/signalwire/signalwire-js/commit/ada6c49538862f466dea659286ea8eb405f4f636) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce dedicated types for Video and Fabric SDKs

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.0] - 2024-06-03

### Added

- [#956](https://github.com/signalwire/signalwire-js/pull/956) [`e16ec479`](https://github.com/signalwire/signalwire-js/commit/e16ec479be85b40f989aba2e3bae932fd9eb59d9) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce Conversation API with Conversation Subscriber

- [#1001](https://github.com/signalwire/signalwire-js/pull/1001) [`968d226b`](https://github.com/signalwire/signalwire-js/commit/968d226ba2791f44dea4bd1b0d173aefaf103bda) Thanks [@ayeminag](https://github.com/ayeminag)! - - API to fetch address by id and tests

- [#995](https://github.com/signalwire/signalwire-js/pull/995) [`c370fec8`](https://github.com/signalwire/signalwire-js/commit/c370fec84e86701d8baf8910aebf1e959dcedc85) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Fetch subscriber info function

- [#973](https://github.com/signalwire/signalwire-js/pull/973) [`c8deacef`](https://github.com/signalwire/signalwire-js/commit/c8deacef19176b7f744b61b9fe454556f0eccd52) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Online/offline registeration for WebRTC endpoint

- [#999](https://github.com/signalwire/signalwire-js/pull/999) [`6d71362b`](https://github.com/signalwire/signalwire-js/commit/6d71362b589439fe3b4f234f4ff98871f8d98a20) Thanks [@ayeminag](https://github.com/ayeminag)! - - `client.conversations.sendMessage()`
  - `conversation.sendMessage()` API for conversation object returned from `getConversations()` API
  - `conversation.getMessages()` API for conversation object returned from `getConversations()`
  - added e2e tests for conversation (room)

### Changed

- [#1012](https://github.com/signalwire/signalwire-js/pull/1012) [`45991e4c`](https://github.com/signalwire/signalwire-js/commit/45991e4c23065028b8e55af3c61faaf7661a8baf) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Cleanup unified eventing

- [#982](https://github.com/signalwire/signalwire-js/pull/982) [`ded3dc7a`](https://github.com/signalwire/signalwire-js/commit/ded3dc7a71977460d19fc623c3f2745f5365fb7b) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: OAuth refresh token

- [#978](https://github.com/signalwire/signalwire-js/pull/978) [`0f4f2b3c`](https://github.com/signalwire/signalwire-js/commit/0f4f2b3cbf788a259baf5543fe82bbfc8b2540b7) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce pageSize param for Conversation APIs

- [#1030](https://github.com/signalwire/signalwire-js/pull/1030) [`254016f3`](https://github.com/signalwire/signalwire-js/commit/254016f396ce89cda82585b6ef9bb3f0e5b9135c) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Destroy the workers after a successful verto.bye

- [#992](https://github.com/signalwire/signalwire-js/pull/992) [`3d20672b`](https://github.com/signalwire/signalwire-js/commit/3d20672bbf2247b35e7d3ee8524a904fae1e6b2a) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix room session id usage in room worker

- [#983](https://github.com/signalwire/signalwire-js/pull/983) [`3d6a4fbe`](https://github.com/signalwire/signalwire-js/commit/3d6a4fbe4364a5795233d2aac87ba309d9d34bdd) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce CallSegment and CallFabric worker

- [#960](https://github.com/signalwire/signalwire-js/pull/960) [`184c8777`](https://github.com/signalwire/signalwire-js/commit/184c8777d1891985ab6bccbf417938e0dae5041f) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce member instance in CF SDK

- [#1050](https://github.com/signalwire/signalwire-js/pull/1050) [`229320b3`](https://github.com/signalwire/signalwire-js/commit/229320b3a105690bcb5c7271bc516d6269a1ca76) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introducing Call Fabric client

- [#1017](https://github.com/signalwire/signalwire-js/pull/1017) [`d215ef5d`](https://github.com/signalwire/signalwire-js/commit/d215ef5d1501f5f3df4e5d3837ac740f42649c2e) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Improve the action invoke strategy

- [#965](https://github.com/signalwire/signalwire-js/pull/965) [`a08512a3`](https://github.com/signalwire/signalwire-js/commit/a08512a3a4f3a6fd1d0faf643f3c481ca668abc4) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Page size for Address API

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

### Changed

- [#921](https://github.com/signalwire/signalwire-js/pull/921) [`03f01c36`](https://github.com/signalwire/signalwire-js/commit/03f01c36b3f1244e4eed4188610e67955c7ba9ce) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - support for eventing acknowledge

- [#948](https://github.com/signalwire/signalwire-js/pull/948) [`6cb639bf`](https://github.com/signalwire/signalwire-js/commit/6cb639bf6dcbacefd71615ec99c4911cbbd120c4) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Allow user to pass filters to `getAddress` function

  ```js
  const addressData = await client.getAddresses({
    type: 'room',
    displayName: 'domain app',
  })
  ```

## [3.21.0] - 2023-11-23

### Added

- [#909](https://github.com/signalwire/signalwire-js/pull/909) [`4ee7b6f8`](https://github.com/signalwire/signalwire-js/commit/4ee7b6f852e650c1828decda2429ebec79576085) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Expose the `sendDigits` function for Video RoomSession object

- [#873](https://github.com/signalwire/signalwire-js/pull/873) [`6c9d2aa5`](https://github.com/signalwire/signalwire-js/commit/6c9d2aa5f5c8d7b07d955a2c6e2ab647a62bd702) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce the hand raise API for the Video SDKs (browser and realtime-api)

### Fixed

- [#892](https://github.com/signalwire/signalwire-js/pull/892) [`d564c379`](https://github.com/signalwire/signalwire-js/commit/d564c379e10d23c21abb56b3e740aff70fc451b9) Thanks [@ayeminag](https://github.com/ayeminag)! - - Added `state` param to `CallingCallCollectEventParams`
  - Made sure `voiceCallCollectWorker` doesn't clean up `CallCollect` instance and emit `ended`/`failed` event if the `state` is `"collecting"`
  - Resolve `CallCollect.ended()` promise only when `state` is NOT `"collecting"` AND `final` is either `undefined`/`true` AND `result.type` is one of `ENDED_STATES`
  - Added more test cases for `Call.collect()` in `@sw-internal/e2e-realtime-api`

## [3.20.0] - 2023-11-07

### Added

- [#884](https://github.com/signalwire/signalwire-js/pull/884) [`e5db7cab`](https://github.com/signalwire/signalwire-js/commit/e5db7cabc2e532a19fad45753e47f7d612d6e248) Thanks [@edolix](https://github.com/edolix)! - Add support for `lock` and `unlock` RoomSessions.

### Fixed

- [#885](https://github.com/signalwire/signalwire-js/pull/885) [`bcced8ae`](https://github.com/signalwire/signalwire-js/commit/bcced8ae774de5483331c4d3146299d5ffffd7e7) Thanks [@edolix](https://github.com/edolix)! - Bugfix: remove video prefix from member.updated events to emit them properly

### Added

- [#901](https://github.com/signalwire/signalwire-js/pull/901) [`2131bb41`](https://github.com/signalwire/signalwire-js/commit/2131bb418afeb75081fb2bfaee3b00a24df4614f) Thanks [@giavac](https://github.com/giavac)! - Add an optional nodeId to call.dial

## [3.19.0] - 2023-09-14

### Added

- [#866](https://github.com/signalwire/signalwire-js/pull/866) [`1086a1b0`](https://github.com/signalwire/signalwire-js/commit/1086a1b0dae256bb44858f16c24494aba8cdfc3e) - Expose `detectInterruptions` params for detect methods and handle `beep` in the detect events

- [#864](https://github.com/signalwire/signalwire-js/pull/864) [`be17e614`](https://github.com/signalwire/signalwire-js/commit/be17e614edd560a8578daf380dff1205e0032db3) - Add alias 'topics' for 'contexts'

- [#863](https://github.com/signalwire/signalwire-js/pull/863) [`fb45dce7`](https://github.com/signalwire/signalwire-js/commit/fb45dce7f57a99533df445b4e1cda9587a1f3eb4) - Add support for CallRecording `pause()` and `resume()`

### Changed

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Enhance shared function between realtime and browser SDK

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Introduce the session emitter and eliminate the global emitter

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Eliminate the multicast pubsub channel

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the SDK by removing eventsPrefix from the namespaces

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Attach listeners without the namespace prefix

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the SDK by removing applyEmitterTransform

- [#862](https://github.com/signalwire/signalwire-js/pull/862) [`2a9b88d9`](https://github.com/signalwire/signalwire-js/commit/2a9b88d92c61fbf9e317234e860c34081c49c235) - Update contract types for CallDetect adding a `result` getter.

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the global emitter

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Remove event emitter transform pipeline from browser SDK

- [#876](https://github.com/signalwire/signalwire-js/pull/876) [`e5db0ef9`](https://github.com/signalwire/signalwire-js/commit/e5db0ef95325d3578b8729c15e8bfca5b7a4cb3a) - Bump supported node version to at least 16

## [3.18.3] - 2023-08-17

### Fixed

- [#858](https://github.com/signalwire/signalwire-js/pull/858) [`bb50b2fb`](https://github.com/signalwire/signalwire-js/commit/bb50b2fb31c6bb016e355b6884d2c2cb11260170) - Fix custom CloseEvent implementation to avoid crash on WS close.

## [3.18.2] - 2023-08-08

### Changed

- [#844](https://github.com/signalwire/signalwire-js/pull/844) [`af7072b7`](https://github.com/signalwire/signalwire-js/commit/af7072b7415940b9ef00bb2d35b3ed6b6ba979a5) - Set peerDependencies for TS build

## [3.18.1] - 2023-07-26

### Changed

- [#834](https://github.com/signalwire/signalwire-js/pull/834) [`81beb29a`](https://github.com/signalwire/signalwire-js/commit/81beb29a9bc3c6135df37223fae44445967c1a84) - Update internal interfaces contracts to have better type checking.

## [3.18.0] - 2023-07-19

### Added

- [#827](https://github.com/signalwire/signalwire-js/pull/827) [`6a35f0a3`](https://github.com/signalwire/signalwire-js/commit/6a35f0a38071160a82f766bd8b73b4718f04108f) - Introduce `await call.pass()` function to pass the call to another consumer

- [#822](https://github.com/signalwire/signalwire-js/pull/822) [`65b0eea5`](https://github.com/signalwire/signalwire-js/commit/65b0eea54346b177e94fd3960e8cc21579c8a9ce) - Initial changes to setup a `SignalWire` client for CF.

### Changed

- [#825](https://github.com/signalwire/signalwire-js/pull/825) [`b44bd6fb`](https://github.com/signalwire/signalwire-js/commit/b44bd6fbd69acd206e43b5b1fefbe7989dc16298) - Added support for user-defined refresh token function to update SAT (_internal_).

## [3.17.0] - 2023-07-07

### Added

- [#805](https://github.com/signalwire/signalwire-js/pull/805) [`e8141c0e`](https://github.com/signalwire/signalwire-js/commit/e8141c0e85e11477e2911e6eccb1e96cff860d58) - Events to keep track of the connected devices status

- [#821](https://github.com/signalwire/signalwire-js/pull/821) [`4e1116b6`](https://github.com/signalwire/signalwire-js/commit/4e1116b606ad41dc649c44eccf4f8b28d0dfa7d8) - Add support for `callStateUrl` and `callStateEvents` when dialing and connecting Voice Call.

### Changed

- [#819](https://github.com/signalwire/signalwire-js/pull/819) [`f814685b`](https://github.com/signalwire/signalwire-js/commit/f814685b24964c89510aad687d10f172265c0424) - Improve support for React Native.

## [3.16.0] - 2023-06-21

### Minor Changes

- [#798](https://github.com/signalwire/signalwire-js/pull/798) [`aaa07479`](https://github.com/signalwire/signalwire-js/commit/aaa07479db10685e72d96ea43927d759dbac076e) - Allow user to set the local media stream

### Changed

- [#776](https://github.com/signalwire/signalwire-js/pull/776) [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431) - Internal changes to opt-out from EmitterTransforms.

- [#776](https://github.com/signalwire/signalwire-js/pull/776) [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431) - Use instance map for Voice APIs instance creation.

### Fixed

- [#808](https://github.com/signalwire/signalwire-js/pull/808) [`9fd8f9cb`](https://github.com/signalwire/signalwire-js/commit/9fd8f9cbff5fc03347248795f09e169166aba0f3) - Fix Collect and Prompt APIs' speech

- [#811](https://github.com/signalwire/signalwire-js/pull/811) [`f3711f17`](https://github.com/signalwire/signalwire-js/commit/f3711f1726a9001a4204527b34b452de80e9a0e6) - Improve reconnection under bad network conditions.

- [#776](https://github.com/signalwire/signalwire-js/pull/776) [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431) - Handle failed state for `call.connect` events.

## [3.15.0] - 2023-05-22

### Added

- [#778](https://github.com/signalwire/signalwire-js/pull/778) [`aa31e1a0`](https://github.com/signalwire/signalwire-js/commit/aa31e1a0307e7c1f3927d985ecd48ec06b9a1312) - Add support for maxPricePerMinute in `dial` and `connect` for the Voice Call object.

- [#793](https://github.com/signalwire/signalwire-js/pull/793) [`4e8e5b0d`](https://github.com/signalwire/signalwire-js/commit/4e8e5b0d859733b9c7455150cd837e42e851ef29) - Update speech interface for Collect and Prompt to set `model`.

### Changed

- [#786](https://github.com/signalwire/signalwire-js/pull/786) [`9fb4e5f4`](https://github.com/signalwire/signalwire-js/commit/9fb4e5f43640b3e5a3978634e6465562a20ac4a5) - Internal change to exclude internal events into the initial subscribe request.

## [3.14.1] - 2023-03-24

### Fixed

- [#766](https://github.com/signalwire/signalwire-js/pull/766) [`e299b048`](https://github.com/signalwire/signalwire-js/commit/e299b048fbcf876f2409335a98de1295fba70480) - Wait for the pending requests before closing the WebSocket connection.

## [3.14.0] - 2023-03-22

### Added

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Add `promote`/`demote` methods to RoomSession.

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Add optional arguments on `promote` to pass meta, joinAudioMuted and joinVideoMuted. Add optional `meta` argument for `demote`.

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Expose the `room.audience_count` event on the RoomSession.

### Changed

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Remove `permissions` from the valid arguments of the `demote()` method on RoomSession.

- [#738](https://github.com/signalwire/signalwire-js/pull/738) [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a) - Session channel introduced for BaseSession

- [#738](https://github.com/signalwire/signalwire-js/pull/738) [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a) - Make base session accessible to custom saga workers

- [#758](https://github.com/signalwire/signalwire-js/pull/758) [`688306f4`](https://github.com/signalwire/signalwire-js/commit/688306f4a5bd157dee40c13ce757001cfa30e832) - Deprecate `currentTimecode` in the params of `RoomSession.play()` and replace with `seekPosition`.

- [#738](https://github.com/signalwire/signalwire-js/pull/738) [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a) - Remove executeActionWatcher and related functions

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Remove `meta` from the allowed parameters of `demote`.

- [#738](https://github.com/signalwire/signalwire-js/pull/738) [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a) - Introduce a new worker to decouple `executeAction` requests from Redux store

## [3.13.0] - 2023-03-07

### Changed

- [#747](https://github.com/signalwire/signalwire-js/pull/747) [`95325ec9`](https://github.com/signalwire/signalwire-js/commit/95325ec9d1f3c98bd478eb799abefb1dabbd7759) - Changes to support connecting using SAT and join a video room.

- [#722](https://github.com/signalwire/signalwire-js/pull/722) [`bbb9544c`](https://github.com/signalwire/signalwire-js/commit/bbb9544cf41d9825a84cff825e8c1c0ceda4920b) - Consider all 2xx codes as a success response

- [#727](https://github.com/signalwire/signalwire-js/pull/727) [`bb216980`](https://github.com/signalwire/signalwire-js/commit/bb21698019ef5db7e4cd0376f1cd6bfec66fea98) - Valid typescript interface for `call.collect` method.

- [#569](https://github.com/signalwire/signalwire-js/pull/569) [`0bdda948`](https://github.com/signalwire/signalwire-js/commit/0bdda94824e9ffefa5830b951488899e0dbd8d85) - Internal changes to persist and use `authorization.state` events.

### Fixed

- [#732](https://github.com/signalwire/signalwire-js/pull/732) [`9ad158b9`](https://github.com/signalwire/signalwire-js/commit/9ad158b90f73bed038d18f7f8b745931c266c3cf) - Emit `playback.failed` event on playback failure
  Resolve the playback `.ended()` promise in case of Playback failure
  Resolve the playback `.ended()` promise in case of Prompt failure
  Resolve the playback `.ended()` promise in case of Recording failure
  Resolve the playback `.ended()` promise in case of Detect failure
  Resolve the playback `.ended()` promise in case of Collect failure
  Resolve the playback `.ended()` promise in case of Tap failure

- [#711](https://github.com/signalwire/signalwire-js/pull/711) [`45536d5f`](https://github.com/signalwire/signalwire-js/commit/45536d5fb6a8e474a2f5b511ddf12fb474566b19) - Fix error on exposing the `state` property on the Voice Call object.

- [#745](https://github.com/signalwire/signalwire-js/pull/745) [`55a309f8`](https://github.com/signalwire/signalwire-js/commit/55a309f8d6189c97941a55d8396bfe0e0e588fc8) - Use `reject` instead of throw within Promise for Video methods.

### Added

- [#729](https://github.com/signalwire/signalwire-js/pull/729) [`41482813`](https://github.com/signalwire/signalwire-js/commit/414828131a81f5bf2e57d786d8002d96e25f7597) - Allow WebRTC connection to reconnect after a network change or temporary blip.

- [#706](https://github.com/signalwire/signalwire-js/pull/706) [`a937768a`](https://github.com/signalwire/signalwire-js/commit/a937768a0b965d35b8468324a5d85273fc46e638) - Add types for `calling.collect` API

- [#713](https://github.com/signalwire/signalwire-js/pull/713) [`e1e1e336`](https://github.com/signalwire/signalwire-js/commit/e1e1e336df952429126eea2c2b8aaea8e55d29d7) - Accept 202 as valid response code

- [#723](https://github.com/signalwire/signalwire-js/pull/723) [`e2c475a7`](https://github.com/signalwire/signalwire-js/commit/e2c475a7ceb4e9eea6438b1d3dbb8457b7ad3e70) - Accept sessionTimeout as a SIP call parameter

## [3.12.2] - 2022-11-23

### Changed

- [#671](https://github.com/signalwire/signalwire-js/pull/671) [`583ef730`](https://github.com/signalwire/signalwire-js/commit/583ef730675884b51045784980a12d80fc573b3b) - Add `inputSensitivity` _type_ for Call recordAudio and record methods.

* [#623](https://github.com/signalwire/signalwire-js/pull/623) [`3e7ce646`](https://github.com/signalwire/signalwire-js/commit/3e7ce6461a423e5b1014f16bf69b53793dfe1024) - Internal review: stop using \_proxyFactoryCache.

- [#686](https://github.com/signalwire/signalwire-js/pull/686) [`c82e6576`](https://github.com/signalwire/signalwire-js/commit/c82e65765555eecf0fd82b5e981ea928d133607e) - Review internals to always reconnect the SDKs expect for when the user disconnects the clients.

* [#571](https://github.com/signalwire/signalwire-js/pull/571) [`a32413d8`](https://github.com/signalwire/signalwire-js/commit/a32413d89f9dc155be91aa148c4c56edec7e8413) - Add `detectAnsweringMachine(params)` as an alias to `amd(params)` in Voice Call.

- [#663](https://github.com/signalwire/signalwire-js/pull/663) [`aa5a469c`](https://github.com/signalwire/signalwire-js/commit/aa5a469ca1e33ca7bca6edb68f45f9edc3faf361) - Improve reconnect logic.

## [3.12.1] - 2022-10-06

### Changed

- [#658](https://github.com/signalwire/signalwire-js/pull/658) [`b765449b`](https://github.com/signalwire/signalwire-js/commit/b765449bb22604b7f116a365027e17b10984d0af) - Change log level of an internal message.

* [#653](https://github.com/signalwire/signalwire-js/pull/653) [`be8b8dea`](https://github.com/signalwire/signalwire-js/commit/be8b8deadb8652d4ea54bd2b4c3cfd29d2f94662) - Internal review of `rootSaga` logic.

### Fixed

- [`021d9b83`](https://github.com/signalwire/signalwire-js/commit/021d9b8364777e493aa8d320d5b03a4275f640bb) - Fix `toSnakeCaseKeys` util and fix `language` type in the Prompt params.

* [#660](https://github.com/signalwire/signalwire-js/pull/660) [`e3453977`](https://github.com/signalwire/signalwire-js/commit/e3453977b7df3cd34939ee8e6f15c6d83fb08134) - Fix how Chat/PubSub client can be reused after a `.disconnect()`.

## [3.12.0] - 2022-09-21

### Added

- [#627](https://github.com/signalwire/signalwire-js/pull/627) [`6cf01e1c`](https://github.com/signalwire/signalwire-js/commit/6cf01e1cecfc30395691aae68b6be15de140bd41) - Expose `getMeta` and `getMemberMeta` methods on the RoomSession.

* [#633](https://github.com/signalwire/signalwire-js/pull/633) [`f1102bb6`](https://github.com/signalwire/signalwire-js/commit/f1102bb6817f119b2f7b063c7e1e5ab2be4e8ec5) - Add methods, interfaces and utils to support the Stream APIs.

### Changed

- [#641](https://github.com/signalwire/signalwire-js/pull/641) [`569213c8`](https://github.com/signalwire/signalwire-js/commit/569213c874b30d7c1452eb56775ee5aa9d370252) - Move debounce implementation from `realtime-api` to `core`.

- [#630](https://github.com/signalwire/signalwire-js/pull/630) [`577e81d3`](https://github.com/signalwire/signalwire-js/commit/577e81d31cd237e87518a61532148c8c8563c3f6) - Restore timestamps on browser logs.

- [#630](https://github.com/signalwire/signalwire-js/pull/630) [`577e81d3`](https://github.com/signalwire/signalwire-js/commit/577e81d31cd237e87518a61532148c8c8563c3f6) - [internal] Export ReduxComponent from core and use it on webrtc to make explicit.

- [#631](https://github.com/signalwire/signalwire-js/pull/631) [`c00b343e`](https://github.com/signalwire/signalwire-js/commit/c00b343ed48305c12fcc599e46e76f2116ab2706) - [internal] Update interfaces for the Authorization block.

### Fixed

- [#640](https://github.com/signalwire/signalwire-js/pull/640) [`0e7bffdd`](https://github.com/signalwire/signalwire-js/commit/0e7bffdd8ace2233c90c48fde925215e8753d53b) - Dispatch `member.updated` event in case of the local cache is empty.

* [#637](https://github.com/signalwire/signalwire-js/pull/637) [`5c3abab6`](https://github.com/signalwire/signalwire-js/commit/5c3abab6f2b9e47b17417f4378898cf240d12dba) - Fix `getMeta`/`getMemberMeta` return values.

## [3.11.0] - 2022-08-17

### Added

- [#601](https://github.com/signalwire/signalwire-js/pull/601) [`d8cf078c`](https://github.com/signalwire/signalwire-js/commit/d8cf078ca113286b77ee978ae6c9c891a5b9d634) - Add `getAllowedChannels()` method to PubSub and Chat namespaces.

* [#619](https://github.com/signalwire/signalwire-js/pull/619) [`d7ce34d3`](https://github.com/signalwire/signalwire-js/commit/d7ce34d3e0a54952321b3186abcbad3cd97b7f81) - Add methods to manage a RoomSession and Member `meta`: `updateMeta`, `deleteMeta`, `setMemberMeta`, `updateMemberMeta`, `deleteMemberMeta`.

- [#608](https://github.com/signalwire/signalwire-js/pull/608) [`3d202275`](https://github.com/signalwire/signalwire-js/commit/3d20227590f224cc1364171702ad3bffc83ff7be) - Add `room.left` type.

* [#620](https://github.com/signalwire/signalwire-js/pull/620) [`9a6936e6`](https://github.com/signalwire/signalwire-js/commit/9a6936e68d9578bd8f0b1810a6a9bc1863338b90) - Add missing `voice` param to `VoiceCallPlayTTSParams`.

### Changed

- [#610](https://github.com/signalwire/signalwire-js/pull/610) [`eb1c3fe9`](https://github.com/signalwire/signalwire-js/commit/eb1c3fe985767f747747ca0525b1c0710af862cb) - Updated interfaces to match the spec, update `RoomSession.getRecordings` and `RoomSession.getPlaybacks` to return stateful objects, deprecated `RoomSession.members` and `RoomSession.recordings` in favour of their corresponding getters.

- [#589](https://github.com/signalwire/signalwire-js/pull/589) [`fa62d67f`](https://github.com/signalwire/signalwire-js/commit/fa62d67ff13398f1a29f10ac8d6d6299a42e7554) - Internal changes to update media_allowed, video_allowed and audio_allowed values for joinAudience.

* [#611](https://github.com/signalwire/signalwire-js/pull/611) [`5402ffcf`](https://github.com/signalwire/signalwire-js/commit/5402ffcf2169bfc05f490ead9b6ae9351a7968bc) - Do not print timestamps in logs on browsers.

- [#605](https://github.com/signalwire/signalwire-js/pull/605) [`2f909c9e`](https://github.com/signalwire/signalwire-js/commit/2f909c9ef670eeaed7b3444b9d4bf703bfbc3a1b) - Change how the SDK agent is defined.

* [#615](https://github.com/signalwire/signalwire-js/pull/615) [`7b196107`](https://github.com/signalwire/signalwire-js/commit/7b196107f120db410c5f85a3fd20682bacbf7576) - hotfix: wait for other sagas to complete before destroy.

- [#612](https://github.com/signalwire/signalwire-js/pull/612) [`7bdd7ab0`](https://github.com/signalwire/signalwire-js/commit/7bdd7ab03414a4b9aa337e9d6b339891c8feda36) - Review socket closed event handling and make sure it always tries to reconnect.

* [#616](https://github.com/signalwire/signalwire-js/pull/616) [`81503784`](https://github.com/signalwire/signalwire-js/commit/815037849bbca0359b47e27de8979121623e4101) - Change internal implementation of `Chat.getAllowedChannels` to wait for the session to be authorized.

- [#594](https://github.com/signalwire/signalwire-js/pull/594) [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120) - Internal: migrate `roomSubscribed` event handling to a custom worker.

* [#614](https://github.com/signalwire/signalwire-js/pull/614) [`4e2284d6`](https://github.com/signalwire/signalwire-js/commit/4e2284d6b328f023a06e2e4b924182093fc9eb5f) - Disable saga to cleanup stale components.

## [3.10.1]- 2022-07-27

### Changed

- [#596](https://github.com/signalwire/signalwire-js/pull/596) [`6bc89d81`](https://github.com/signalwire/signalwire-js/commit/6bc89d81fe6ffa7530f60ed90482db1e7a39d6ac) - Improve auto-subscribe logic in `Video` and `PubSub` namespaces.

## [3.10.0]- 2022-07-14

### Added

- [#560](https://github.com/signalwire/signalwire-js/pull/560) [`d308daf8`](https://github.com/signalwire/signalwire-js/commit/d308daf88b99d69465f03c240ecd6d1806a379a9) - Expose methods to `seek` to a specific video position during playback.

### Fixed

- [#583](https://github.com/signalwire/signalwire-js/pull/583) [`8ec914b6`](https://github.com/signalwire/signalwire-js/commit/8ec914b6c5f446ecc4b9fae7587b89da360dddf8) - Fix issue with missing `member.update` events in Realtime-API SDK.

### Changed

- [#577](https://github.com/signalwire/signalwire-js/pull/577) [`9e1bf9d8`](https://github.com/signalwire/signalwire-js/commit/9e1bf9d841be864064fd78bfd36915cfb52cff21) - Remove all the internal docs.ts files and overall intellisense improvements.

* [#584](https://github.com/signalwire/signalwire-js/pull/584) [`9eb9851f`](https://github.com/signalwire/signalwire-js/commit/9eb9851f0bb048b7ed24d2c1bcfc23915a11c7c7) - Remove option to pass `volume` from methods of Voice.Playlist typings.

- [#588](https://github.com/signalwire/signalwire-js/pull/588) [`bbc21e43`](https://github.com/signalwire/signalwire-js/commit/bbc21e43aadcff7fec6d8416ef1eb101f5ed49d0) - Internal changes on how `BaseConnection` retrieves and handle local state properties.

## [3.9.1] - 2022-06-24

### Patch Changes

- [#580](https://github.com/signalwire/signalwire-js/pull/580) [`e8a54a63`](https://github.com/signalwire/signalwire-js/commit/e8a54a63003ddd1f07302b2fae140296135ad666) - Add `video.rooms.get` and `video.room.get` as possible RPC methods

* [#557](https://github.com/signalwire/signalwire-js/pull/557) [`f15032f1`](https://github.com/signalwire/signalwire-js/commit/f15032f180503453c49d10cbf2a8ef5e24e27dc3) - Add ability to track the Authorization state.

* [#552](https://github.com/signalwire/signalwire-js/pull/552) [`b168fc4f`](https://github.com/signalwire/signalwire-js/commit/b168fc4f92411bff70c50009f4a326171c886a55) - Add support for _internal_ ping/pong at the signaling level.

## [3.9.0] - 2022-06-10

### Added

- [#562](https://github.com/signalwire/signalwire-js/pull/562) [`02d97ded`](https://github.com/signalwire/signalwire-js/commit/02d97ded0295fa6cf75dd154eabd64871a17f7d6) - Add `layout` property to RoomSession.play().

## [3.8.1] - 2022-06-01

### Added

- [#542](https://github.com/signalwire/signalwire-js/pull/542) [`875b2bb8`](https://github.com/signalwire/signalwire-js/commit/875b2bb844cc34d0b173b8544a5c34f0d39fc9c3) - Add `layoutName` to the RoomSession interface

### Changed

- [#546](https://github.com/signalwire/signalwire-js/pull/546) [`fc4689df`](https://github.com/signalwire/signalwire-js/commit/fc4689dfd1955f03d59fb8a0ae8e530d4ef8f79d) - Internal change to migrate from `setWorker`/`attachWorker` to `runWorkers` and from `payload` to `initialState`.

### Fixed

- [#554](https://github.com/signalwire/signalwire-js/pull/554) [`1b95b93b`](https://github.com/signalwire/signalwire-js/commit/1b95b93ba30f7c226d99c6c667604bcce8349d26) - Fix issue with local streams for when the user joined with audio/video muted. Update typings to match the BE

## [3.8.0] - 2022-05-19

### Added

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Expose the `Voice.createPlaylist()` method to simplify playing media on a Voice Call.

* [#524](https://github.com/signalwire/signalwire-js/pull/524) [`a0b7b4d0`](https://github.com/signalwire/signalwire-js/commit/a0b7b4d0f5eb95c7ccbf752c43c8abd53e8a4de7) - Add `Call.waitFor()` method

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to record audio in `Voice` Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to prompt for digits or speech using `prompt()` in `Voice` Call.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Expose the `Voice.createDialer()` method to simplify dialing devices on a Voice Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to play media in `Voice` Call.

- [#471](https://github.com/signalwire/signalwire-js/pull/471) [`cf845603`](https://github.com/signalwire/signalwire-js/commit/cf8456031c4ba3adea0b8369d1fac7e2fed407b8) - Add playground and e2e tests for Task namespace.

* [#460](https://github.com/signalwire/signalwire-js/pull/460) [`7e64fb28`](https://github.com/signalwire/signalwire-js/commit/7e64fb28db2f21394b8c44789db603c7253dacc2) - Iinitial implementation of the `Voice` namespace. Adds ability to make outbound calls.

- [#472](https://github.com/signalwire/signalwire-js/pull/472) [`76e92dd9`](https://github.com/signalwire/signalwire-js/commit/76e92dd95abc32dee4e4add8ad6397b8d3216293) - Add `Messaging` namespace in realtime-api SDK.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to connect and disconnect legs in `Voice` namespace.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to tap audio in `Voice` Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to start detectors for machine/digit/fax in `Voice` Call.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add `waitForEnded()` method to the CallPlayback component to easily wait for playbacks to end.

* [#533](https://github.com/signalwire/signalwire-js/pull/533) [`b6d5bb3b`](https://github.com/signalwire/signalwire-js/commit/b6d5bb3bf4576961aff6b9c8b1397a5085b02056) - Introduce `PubSub` namespace.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to receive inbound Calls in the `Voice` namespace.

* [#535](https://github.com/signalwire/signalwire-js/pull/535) [`f89b8848`](https://github.com/signalwire/signalwire-js/commit/f89b884860451e010c1c76df5d73f81e2f722fe7) - Expose `connectPhone()` and `connectSip()` helper methods on the Voice Call.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add `sendDigits` method to Voice.Call.

* [#491](https://github.com/signalwire/signalwire-js/pull/491) [`0b98a9e4`](https://github.com/signalwire/signalwire-js/commit/0b98a9e48b751d244abea92fea4cd79e92dfc0b7) - Expose `disconnect()` from Messaging and Task Client objects.

### Changed

- [#539](https://github.com/signalwire/signalwire-js/pull/539) [`4c0909dd`](https://github.com/signalwire/signalwire-js/commit/4c0909ddb57b86bb0216af0c83d37f11a0e54754) - Rename Call method `waitUntilConnected` to `waitForDisconnected` and expose `disconnect` on the VoiceClient.

* [#532](https://github.com/signalwire/signalwire-js/pull/532) [`12c64580`](https://github.com/signalwire/signalwire-js/commit/12c6458088fe5d2e560095f0d4ba0b5bbbc65b5c) - Improve typings of the public interface for the `Chat` namespace.

- [#504](https://github.com/signalwire/signalwire-js/pull/504) [`24ef812a`](https://github.com/signalwire/signalwire-js/commit/24ef812a392eb1b46cf638a373638a34cdb20a96) - Improve WS reconnect logic.

* [#530](https://github.com/signalwire/signalwire-js/pull/530) [`61838b07`](https://github.com/signalwire/signalwire-js/commit/61838b07f8a1e217c1d7367f5f3774698ec97c56) - Change `connect` to accept builder objects

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Migrate `createDialer` and `createPlaylist` to Dialer and Playlist constructors

- [#529](https://github.com/signalwire/signalwire-js/pull/529) [`e09afd5b`](https://github.com/signalwire/signalwire-js/commit/e09afd5bf1ff72469aea65532c08064966c38115) - Renamed Dialer to DeviceBuilder, added ability to pass `region` to `dialPhone` and `dialSip`

## [3.7.1] - 2022-04-01

### Fixed

- [#484](https://github.com/signalwire/signalwire-js/pull/484) [`a9abe1d5`](https://github.com/signalwire/signalwire-js/commit/a9abe1d5f2267513f0765fd47a2cf9334463b445) - Keep internal memberList data up to date to generate synthetic events with the correct values.

## [3.7.0] - 2022-03-25

### Added

- [#456](https://github.com/signalwire/signalwire-js/pull/456) [`c487d29b`](https://github.com/signalwire/signalwire-js/commit/c487d29ba47be5cb5a47861b10145f6c6ef9ebe4) - Add ability to handle member's `currentPosition`.

- [#401](https://github.com/signalwire/signalwire-js/pull/401) [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592) - Add `layout` and `positions` when starting a screenShare.

- [#468](https://github.com/signalwire/signalwire-js/pull/468) [`058e9a0c`](https://github.com/signalwire/signalwire-js/commit/058e9a0cee9fe5b2148d8c6bae3e8524ef180f98) - Re-exported `ChatMember` and `ChatMessage` from the top-level namespace

- [#452](https://github.com/signalwire/signalwire-js/pull/452) [`563a31e5`](https://github.com/signalwire/signalwire-js/commit/563a31e554aec607f939d25dc45c9a1aefb7fe40) - Expose `setMeta` and `setMemberMeta` methods on the `RoomSession`.

### Changed

- [#464](https://github.com/signalwire/signalwire-js/pull/464) [`2c8fc597`](https://github.com/signalwire/signalwire-js/commit/2c8fc59719e7f40c1d9b01ebf67190d358dcea46) - Upgrade all dependencies.

### Fixed

- [#466](https://github.com/signalwire/signalwire-js/pull/466) [`1944348f`](https://github.com/signalwire/signalwire-js/commit/1944348f3d3f4f5c2a538bb100747b8faf2dae1b) - Fix to avoid issues when invoking `.destroy()` on cleanup.

* [#469](https://github.com/signalwire/signalwire-js/pull/469) [`4d7bcc30`](https://github.com/signalwire/signalwire-js/commit/4d7bcc30775ea6428be1ca0e6fda349653db808b) - Fix Chat methods that required the underlay client to be connected.

## [3.6.0] - 2022-03-02

### Added

- [#426](https://github.com/signalwire/signalwire-js/pull/426) [`edc573f2`](https://github.com/signalwire/signalwire-js/commit/edc573f2cb7f3c82430b833117f537b7dcc462c8) - Expose the `removeAllListeners` method for all the components.

### Changed

- [#427](https://github.com/signalwire/signalwire-js/pull/427) [`d168a035`](https://github.com/signalwire/signalwire-js/commit/d168a035c6f56f5002935269a2f379ef796355df) - Improve logging capabilities of Proxy's

## [3.5.0] - 2022-02-04

### Added

- [#400](https://github.com/signalwire/signalwire-js/pull/400) [`3f851e2a`](https://github.com/signalwire/signalwire-js/commit/3f851e2a83e5f62919ff689efb5adb2084654ad9) - Expose chat member events: `member.joined`, `member.updated` and `member.left`.

- [#407](https://github.com/signalwire/signalwire-js/pull/407) [`7c688bb5`](https://github.com/signalwire/signalwire-js/commit/7c688bb575fa737c468e5cc330ef145dfe480812) - Add encode/decode protected methods to BaseSession to allow override.

- [#415](https://github.com/signalwire/signalwire-js/pull/415) [`6d94624b`](https://github.com/signalwire/signalwire-js/commit/6d94624b943a653393e66ef4c1aeb72ac7ef2864) - Add transformParams to ExecuteExtendedOptions.

- [#424](https://github.com/signalwire/signalwire-js/pull/424) [`743168df`](https://github.com/signalwire/signalwire-js/commit/743168df0abef04960e18bba70474f489e1d36ce) - Add support for `updateToken` to the Chat.Client to allow renew tokens for a chat session.

## [3.4.1] - 2022-01-11

### Changed

- [#394](https://github.com/signalwire/signalwire-js/pull/394) [`03e5d42`](https://github.com/signalwire/signalwire-js/commit/03e5d4253cbcc93d39479aac8f5bcf419ce1f837) - [internal] Update interfaces to pass through `preview_url`

## [3.4.0] - 2021-12-16

### Added

- [#360](https://github.com/signalwire/signalwire-js/pull/360) [`b7bdfcb`](https://github.com/signalwire/signalwire-js/commit/b7bdfcb807f711af640c0a2c32376e5b619ad108) - Allow to set a custom logger via `UserOptions`.

* [#348](https://github.com/signalwire/signalwire-js/pull/348) [`f1ae2c9`](https://github.com/signalwire/signalwire-js/commit/f1ae2c94fce75efd1d30932bfa8f504c71c008f5) - Expose a way to set a custom logger.

- [#361](https://github.com/signalwire/signalwire-js/pull/361) [`4606f19`](https://github.com/signalwire/signalwire-js/commit/4606f19fe72270d6d84b4e19fbf8cc51345df98c) - [wip] Initial changes for the Chat namespace.

### Changed

- [#365](https://github.com/signalwire/signalwire-js/pull/365) [`64997a0`](https://github.com/signalwire/signalwire-js/commit/64997a088c6771fa39213c3df0e58e8afb8ffaae) - Improve internal watcher/workers to be more resilient in case of errors.

- [#376](https://github.com/signalwire/signalwire-js/pull/376) [`d2e51b8`](https://github.com/signalwire/signalwire-js/commit/d2e51b82bbc8307e0baa948c6a34d07dd1deb812) - Improve logic for connecting the client.

### Fixed

- [#362](https://github.com/signalwire/signalwire-js/pull/362) [`f494e05`](https://github.com/signalwire/signalwire-js/commit/f494e05a28e013d29431c93690d2382db8df96e8) - Fix definition types.

## [3.3.0] - 2021-11-02

### Added

- [#338](https://github.com/signalwire/signalwire-js/pull/338) [`bae6985`](https://github.com/signalwire/signalwire-js/commit/bae69856f67aa339c02e074fc936048f2cc7bc7b) - Add `displayName` to VideoRoomSessionContract.

### Changed

- [#327](https://github.com/signalwire/signalwire-js/pull/327) [`fa40510`](https://github.com/signalwire/signalwire-js/commit/fa4051009213028955a043fedcfb7109da2e6f4b) - Improved internal typings for the Video namespace.

## [3.2.0] - 2021-10-12

### Added

- [#297](https://github.com/signalwire/signalwire-js/pull/297) [`2675e5e`](https://github.com/signalwire/signalwire-js/commit/2675e5ea1ce9247a9e9b525cacf365cb8e4374ca) - Add support for the Playback APIs: `roomSession.play()` and the `RoomSessionPlayback` object to control it.

### Changed

- [#325](https://github.com/signalwire/signalwire-js/pull/325) [`7d183de`](https://github.com/signalwire/signalwire-js/commit/7d183de47bae0e1f436609ab63704ec1888134a8) - Upgrade dependency for handling WebSocket connections.

## [3.1.4] - 2021-10-06

### Fixed

- [#299](https://github.com/signalwire/signalwire-js/pull/299) [`72eb91b`](https://github.com/signalwire/signalwire-js/commit/72eb91bd74a046fa720868a4b43e6154d7a076f0) - Fixed signature of the `setLayout` method of a VideoRoomSession.

### Changed

- [#310](https://github.com/signalwire/signalwire-js/pull/310) [`3af0ea6`](https://github.com/signalwire/signalwire-js/commit/3af0ea6ee53ea9e5009e5e36c7e7418833730159) - Improve typings for the PubSub channel and when finding the namespace from the payload. Fix usages of `room` for `room_session`.

- [#305](https://github.com/signalwire/signalwire-js/pull/305) [`cec54bd`](https://github.com/signalwire/signalwire-js/commit/cec54bd208801f42a719a7777da802ae2c51a79a) - Convert timestamp properties to `Date` objects.

- [#302](https://github.com/signalwire/signalwire-js/pull/302) [`2ac7f6d`](https://github.com/signalwire/signalwire-js/commit/2ac7f6defeb9a1a2a4254c300a15c258f8a57cd7) - Added `setInputVolume`/`setOutputVolume` and marked `setMicrophoneVolume`/`setSpeakerVolume` as deprecated.

- [#311](https://github.com/signalwire/signalwire-js/pull/311) [`febb842`](https://github.com/signalwire/signalwire-js/commit/febb84202568fde1b94558c8b470ba9e348f1aa4) - Update `ConsumerContract` interface and add array-keys to the toExternalJSON whitelist.

- [#300](https://github.com/signalwire/signalwire-js/pull/300) [`b60e9fc`](https://github.com/signalwire/signalwire-js/commit/b60e9fcea7f1f308efcc78081cb3fb61c60ae522) - Improve the logic for applying local and remote emitter transforms.

- [#304](https://github.com/signalwire/signalwire-js/pull/304) [`4d21716`](https://github.com/signalwire/signalwire-js/commit/4d2171661dcf2a9ebd5bb6b6daa5c32a78dfa21f) - Internal refactoring for subscribe events.

- [#298](https://github.com/signalwire/signalwire-js/pull/298) [`49b4aa9`](https://github.com/signalwire/signalwire-js/commit/49b4aa9d127df0d52512b6c44359fc7b7b88caae) - Refactoring: Normalize usage of events to always use our "internal" version for registering, transforms, caching, etc.

## [3.1.3] - 2021-09-15

### Changed

- [#278](https://github.com/signalwire/signalwire-js/pull/278) [`f35a8e0`](https://github.com/signalwire/signalwire-js/commit/f35a8e00a1c38a15d87c7bc3dd6afddc7e77da68) - Improve way of creating strictly typed EventEmitter instances.

- [#287](https://github.com/signalwire/signalwire-js/pull/287) [`820c6d1`](https://github.com/signalwire/signalwire-js/commit/820c6d1b6472486fefdb64d81997a09d966dda23) - Extend interface for VideoMemberContract

* [#283](https://github.com/signalwire/signalwire-js/pull/283) [`968bda7`](https://github.com/signalwire/signalwire-js/commit/968bda73d119183b8af5b7692504050db339d85a) - Review internal usage of interfaces to control what the SDKs are going to expose.

## [3.1.2] - 2021-09-09

### Added

- [#261](https://github.com/signalwire/signalwire-js/pull/261) [`9dd7dbb`](https://github.com/signalwire/signalwire-js/commit/9dd7dbb890b92b5f69c3c9bb615083367d8113bb) - Add classes and typings to support the Recording APIs.

* [#273](https://github.com/signalwire/signalwire-js/pull/273) [`249facf`](https://github.com/signalwire/signalwire-js/commit/249facf92698be19f9567caea0283535b51a3ae7) - Added `member.talking.started`, `member.talking.ended` and deprecated `member.talking.start` and `member.talking.stop` for consistency.

### Fixed

- [#271](https://github.com/signalwire/signalwire-js/pull/271) [`e6233cc`](https://github.com/signalwire/signalwire-js/commit/e6233cc74fb3ad5fc3e042ac36f717be5e6988b8) - Bugfix on the internal EventEmitter where, in a specific case, the `.off()` method did not remove the listener. Improved test coverage.

- [#277](https://github.com/signalwire/signalwire-js/pull/277) [`5b4e57d`](https://github.com/signalwire/signalwire-js/commit/5b4e57d12fed829b15cf28a77ba0082f582e35f3) - Fix `validateEventsToSubscribe` method to check the prefixed-event.

## [3.1.1] - 2021-08-27

### Changed

- [#246](https://github.com/signalwire/signalwire-js/pull/246) [`97dacbb`](https://github.com/signalwire/signalwire-js/commit/97dacbb3aaf9029a6781ac2356591f928ae40580) - Add typings for the RealTime video and room event listeners.

- [#243](https://github.com/signalwire/signalwire-js/pull/243) [`e45c52c`](https://github.com/signalwire/signalwire-js/commit/e45c52cc7d3c684efd2a080e0a138d3bb82ea8f0) - Allow to set the logger level via `logLevel` argument on the `UserOptions` interface.

### Fixed

- [#258](https://github.com/signalwire/signalwire-js/pull/258) [`b7299f0`](https://github.com/signalwire/signalwire-js/commit/b7299f07c3583082b7d5c289fd1e1dca7936d6a4) - Fix a race condition within `connect`.

## [3.1.0] - 2021-08-13

### Added

- [#236](https://github.com/signalwire/signalwire-js/pull/236) [`b967c89`](https://github.com/signalwire/signalwire-js/commit/b967c892d99ad7fa96ebc5a31a871bde1eecb0d0) - Apply `audio` and `video` constraints sent from the backend consuming the `mediaParams` event.

## [3.0.0] - 2021-08-09

### Added

- [#170](https://github.com/signalwire/signalwire-js/pull/170) [`6995825`](https://github.com/signalwire/signalwire-js/commit/699582576f67f12cea37c98d52fb08af01fd6c01) - Standardize naming for store actions

* [#195](https://github.com/signalwire/signalwire-js/pull/195) [`ef1964c`](https://github.com/signalwire/signalwire-js/commit/ef1964cfbfbd5febcfe76dca73d5e11b7268941f) - Export types/interfaces for Room events

- [#153](https://github.com/signalwire/signalwire-js/pull/153) [`8e08e73`](https://github.com/signalwire/signalwire-js/commit/8e08e73a6d72583b4af125f9854838f8a268fdeb) - Bump @reduxjs/toolkit to latest

* [#158](https://github.com/signalwire/signalwire-js/pull/158) [`4524780`](https://github.com/signalwire/signalwire-js/commit/4524780025944ded9497fbe9fbdb8f9e6fddb3b5) - Updated connect to support component and session listeners

* [#167](https://github.com/signalwire/signalwire-js/pull/167) [`f6b8b10`](https://github.com/signalwire/signalwire-js/commit/f6b8b10d155047bb8bfaf251c9559eafeba287ad) - Encapsulate each EventEmitter using a unique id as the namespace.

* [#152](https://github.com/signalwire/signalwire-js/pull/152) [`a5ef49a`](https://github.com/signalwire/signalwire-js/commit/a5ef49a7b5b39f69fda92bbe3016d0d1ee8e376a) - Expose "member.talking" event

- [#171](https://github.com/signalwire/signalwire-js/pull/171) [`12178ce`](https://github.com/signalwire/signalwire-js/commit/12178ce493fd5cfd735cf5dde5467f9440f0e35e) - Internal refactor for creating destroyable slices without repetition.

* [#161](https://github.com/signalwire/signalwire-js/pull/161) [`22b61d3`](https://github.com/signalwire/signalwire-js/commit/22b61d33c7f944b0ceb2b7edf35e0ad5369d3293) - Rename some internal objects and review the public exports.

- [#154](https://github.com/signalwire/signalwire-js/pull/154) [`5820540`](https://github.com/signalwire/signalwire-js/commit/5820540054ef1a7a095bcf2ff934982d0608aa85) - Change package "exports" definition

* [#163](https://github.com/signalwire/signalwire-js/pull/163) [`b1f3d45`](https://github.com/signalwire/signalwire-js/commit/b1f3d45e9245c228ecc2b5587e09ad0d406f2f93) - Add ability to queue execute actions based on the user's auth status.
  Add ability to track how many times the user has been reconnected.
  Improve reconnecting logic.

- [#214](https://github.com/signalwire/signalwire-js/pull/214) [`ec49478`](https://github.com/signalwire/signalwire-js/commit/ec49478d3a8fb2384e57951ec13d859b83baa7dc) - Included `commonjs` versions into `js` and `webrtc` packages

- [#155](https://github.com/signalwire/signalwire-js/pull/155) [`45e6159`](https://github.com/signalwire/signalwire-js/commit/45e6159dc78a33eb7c44f40f30a11cd73194d650) - Emit "member.talking.start" and "member.talking.stop" in addition of "member.talking"

* [#144](https://github.com/signalwire/signalwire-js/pull/144) [`95df411`](https://github.com/signalwire/signalwire-js/commit/95df411b5105eaa0eeb3c3907c8cca6f2688a730) - Renamed internal sessions classes, Bundled core dependencies.

- [#156](https://github.com/signalwire/signalwire-js/pull/156) [`703ee44`](https://github.com/signalwire/signalwire-js/commit/703ee445dfce00c926213b8aa4d5da2e4ec79886) - Update RoomLayout interfaces and events payloads.

### Fixed

- [#146](https://github.com/signalwire/signalwire-js/pull/146) [`d84f142`](https://github.com/signalwire/signalwire-js/commit/d84f14258d2fcade88f6296c32fc8d630faef2a0) - Fix session reconnect logic

## 3.0.0-beta.4

### Patch Changes

- ec49478: Included `commonjs` versions into `js` and `webrtc` packages

## 3.0.0-beta.3

### Patch Changes

- ef1964c: Export types/interfaces for Room events
- 2c89dfb: Deprecated `getLayoutList` and `getMemberList` in favour of `getLayouts` and `getMembers` respectively. Other methods (`audioMute`, `audioUnmute`, `deaf`, `hideVideoMuted`, `removeMember`, `setInputSensitivity`, `setLayout`, `setMicrophoneVolume`, `setSpeakerVolume`, `showVideoMuted`, `undeaf`, `videoMute`, `videoUnmute`) that were previously returning `{ code: string, message: string }` also went through a signature change and are now returning `Promise<void>`

## 3.0.0-beta.2

### Patch Changes

- 6995825: Standardize naming for store actions
- 8bb4e76: Split Room objects into Room, RoomDevice and RoomScreenShare with specific methods for each use case
- f6b8b10: Encapsulate each EventEmitter using a unique id as the namespace.
- 12178ce: Internal refactor for creating destroyable slices without repetition.
- b1f3d45: Add ability to queue execute actions based on the user's auth status.
  Add ability to track how many times the user has been reconnected.
  Improve reconnecting logic.

## 3.0.0-beta.1

### Patch Changes

- 8e08e73: Bump @reduxjs/toolkit to latest
- 4524780: Updated connect to support component and session listeners
- 399d213: Expose createScreenShareObject() method to share the screen in a room
- d84f142: Fix session reconnect logic
- a5ef49a: Expose "member.talking" event
- 22b61d3: Rename some internal objects and review the public exports
- 5820540: Change package "exports" definition
- 45e6159: Emit "member.talking.start" and "member.talking.stop" in addition of "member.talking"
- 95df411: Renamed internal sessions classes, Bundled core dependencies
- 703ee44: Update RoomLayout interfaces and events payloads

## 3.0.0-beta.0

### Major Changes

- fe0fe0a: Initial beta release of SignalWire JS SDK
