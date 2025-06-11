# @signalwire/webrtc

## 3.14.0-dev.202506111650.ad2f5be.0

### Minor Changes

- [#1216](https://github.com/signalwire/signalwire-js/pull/1216) [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - CHANGED improved the handling of WebSockets reconnections.

### Patch Changes

- [#1201](https://github.com/signalwire/signalwire-js/pull/1201) [`b1d63f14c5dabbf0f26fb894ab0bb474a62c5767`](https://github.com/signalwire/signalwire-js/commit/b1d63f14c5dabbf0f26fb894ab0bb474a62c5767) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Video & CF SDK:

  - Exposes a `cameraConstraints` and `microphoneConstraints` on the room/call object.

  CF SDK:

  - Introduces a validation proxy for the `FabricRoomSession` class.
  - Introduces a `CapabilityError` for the errors based on the missing capability.
  - Fixes the `setOutputVolume` API for Call Fabric.
  - Fixes the `setInputSensitivity` API param for Call Fabric.

- [#1217](https://github.com/signalwire/signalwire-js/pull/1217) [`b999b0bf8502b3e72ef2412a7f5d435f2791dc45`](https://github.com/signalwire/signalwire-js/commit/b999b0bf8502b3e72ef2412a7f5d435f2791dc45) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Allow users to pass the `fromFabricAddressId` while dialing

  ```ts
  const call = await client.dial({
    .....,
    to: .....,
    fromFabricAddressId: 'valid_subscriber_id', // Optional
    ...
  })
  ```

- [#1200](https://github.com/signalwire/signalwire-js/pull/1200) [`3d01d9663a4994c8cf42b2a1fac3bd2ca5371687`](https://github.com/signalwire/signalwire-js/commit/3d01d9663a4994c8cf42b2a1fac3bd2ca5371687) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Fix the `getAddresses` TS contract with internal refactoring

- [#1216](https://github.com/signalwire/signalwire-js/pull/1216) [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Fix CF network re-connections

- Updated dependencies [[`bb4b96f96315a9e89ae8df147ca4d1c9650e0944`](https://github.com/signalwire/signalwire-js/commit/bb4b96f96315a9e89ae8df147ca4d1c9650e0944), [`b1d63f14c5dabbf0f26fb894ab0bb474a62c5767`](https://github.com/signalwire/signalwire-js/commit/b1d63f14c5dabbf0f26fb894ab0bb474a62c5767), [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06), [`3c389671b35d1a57fd6be3f8c793be36f8294795`](https://github.com/signalwire/signalwire-js/commit/3c389671b35d1a57fd6be3f8c793be36f8294795), [`b999b0bf8502b3e72ef2412a7f5d435f2791dc45`](https://github.com/signalwire/signalwire-js/commit/b999b0bf8502b3e72ef2412a7f5d435f2791dc45), [`3d01d9663a4994c8cf42b2a1fac3bd2ca5371687`](https://github.com/signalwire/signalwire-js/commit/3d01d9663a4994c8cf42b2a1fac3bd2ca5371687), [`42ebbf935141f3a306f4d1993ab41ada69b932d9`](https://github.com/signalwire/signalwire-js/commit/42ebbf935141f3a306f4d1993ab41ada69b932d9)]:
  - @signalwire/core@4.3.0-dev.202506111650.ad2f5be.0

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.13.1] - 2025-03-04

### Added

- [#1149](https://github.com/signalwire/signalwire-js/pull/1149) [`5e4539144f31ff154e3e295e57d939e86dee0840`](https://github.com/signalwire/signalwire-js/commit/5e4539144f31ff154e3e295e57d939e86dee0840) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Browser SDKs: Expose the `withAudio` and `withVideo` flags to indicate the receiving media.

- [#1183](https://github.com/signalwire/signalwire-js/pull/1183) [`16499a4d075d893ad432a5bdbafac950a08edc26`](https://github.com/signalwire/signalwire-js/commit/16499a4d075d893ad432a5bdbafac950a08edc26) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF & Video SDK: Introduce the hold/unhold API

  ```ts
  // To hold the call
  await call.hold()

  // To unhold the call
  await call.unhold()
  ```

- [#1137](https://github.com/signalwire/signalwire-js/pull/1137) [`2dc5db84d40b7224c641371727881c0319c002d1`](https://github.com/signalwire/signalwire-js/commit/2dc5db84d40b7224c641371727881c0319c002d1) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Call Fabric and Video SDK: Introduce update media APIs with renegotiation

  ```ts
  await updateMedia({
    audio: {
      direction: 'sendonly' | 'sendrecv',
      constraints?: MediaTrackConstraints
    },
    video: {
      direction: 'recvonly' | 'inactive'
      constraints?: MediaTrackConstraints
    }
  })

  // Either "audio" or "video" is required with "direction" property.
  // The "constraints" can only be passed if the "direction" is either "sendrecv" or "sendonly".

  await setVideoDirection('sendonly' | 'sendrecv' | 'recvonly' | 'inactive')

  await setAudioDirection('sendonly' | 'sendrecv' | 'recvonly' | 'inactive')
  ```

### Changed

- [#1059](https://github.com/signalwire/signalwire-js/pull/1059) [`616f84048c52e1f5e9f38e6f2d2f8d90196a1b4a`](https://github.com/signalwire/signalwire-js/commit/616f84048c52e1f5e9f38e6f2d2f8d90196a1b4a) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - ADDED reattach method to Call Fabric client

- [#1124](https://github.com/signalwire/signalwire-js/pull/1124) [`ada6c49538862f466dea659286ea8eb405f4f636`](https://github.com/signalwire/signalwire-js/commit/ada6c49538862f466dea659286ea8eb405f4f636) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce dedicated types for Video and Fabric SDKs

### Fixed

- [#1066](https://github.com/signalwire/signalwire-js/pull/1066) [`d88cb49838b3dfd90046afdeb6900b8be0c2bd36`](https://github.com/signalwire/signalwire-js/commit/d88cb49838b3dfd90046afdeb6900b8be0c2bd36) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix media receiver property

- [#1131](https://github.com/signalwire/signalwire-js/pull/1131) [`aca483d46cfdc4e7bcef288c804a6bbe86b02611`](https://github.com/signalwire/signalwire-js/commit/aca483d46cfdc4e7bcef288c804a6bbe86b02611) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - FIX getMediaConstraints

### Dependencies

- Updated dependencies [[`7130138f9dcd750bc2d9f9bee0d644a2e02425c6`](https://github.com/signalwire/signalwire-js/commit/7130138f9dcd750bc2d9f9bee0d644a2e02425c6), [`df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4`](https://github.com/signalwire/signalwire-js/commit/df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4), [`461943a395d9a40a10658c906447398bff7ec160`](https://github.com/signalwire/signalwire-js/commit/461943a395d9a40a10658c906447398bff7ec160), [`d34f3360163292aedb3474ffc9f7e2017b9d0002`](https://github.com/signalwire/signalwire-js/commit/d34f3360163292aedb3474ffc9f7e2017b9d0002), [`fca4c09ac531ab88dec9d94f3a73d5cd06060d36`](https://github.com/signalwire/signalwire-js/commit/fca4c09ac531ab88dec9d94f3a73d5cd06060d36), [`5e4539144f31ff154e3e295e57d939e86dee0840`](https://github.com/signalwire/signalwire-js/commit/5e4539144f31ff154e3e295e57d939e86dee0840), [`fe5c4cca5c3dd14f0dc3af0579231973e57717f6`](https://github.com/signalwire/signalwire-js/commit/fe5c4cca5c3dd14f0dc3af0579231973e57717f6), [`ed8d713ab9c399bcc335a147d499248d44c72468`](https://github.com/signalwire/signalwire-js/commit/ed8d713ab9c399bcc335a147d499248d44c72468), [`fcb722a9f831359d3a05f9d53282c825dc749fa2`](https://github.com/signalwire/signalwire-js/commit/fcb722a9f831359d3a05f9d53282c825dc749fa2), [`84aaad9b4837739f87b3dd1de99a14eb1123653f`](https://github.com/signalwire/signalwire-js/commit/84aaad9b4837739f87b3dd1de99a14eb1123653f), [`76e573f46553337990c397693985e5004eeecae1`](https://github.com/signalwire/signalwire-js/commit/76e573f46553337990c397693985e5004eeecae1), [`db072e479d9b30ae7aa952c819220eda60f329bb`](https://github.com/signalwire/signalwire-js/commit/db072e479d9b30ae7aa952c819220eda60f329bb), [`16499a4d075d893ad432a5bdbafac950a08edc26`](https://github.com/signalwire/signalwire-js/commit/16499a4d075d893ad432a5bdbafac950a08edc26), [`a2682371fc53c2526f40530b9c9e706397da1a8d`](https://github.com/signalwire/signalwire-js/commit/a2682371fc53c2526f40530b9c9e706397da1a8d), [`32ae8cb6391c91e8d9e8aa38524c6a188ea9d747`](https://github.com/signalwire/signalwire-js/commit/32ae8cb6391c91e8d9e8aa38524c6a188ea9d747), [`3d0fe342a5dfb34814b376bf62b370f0bf57bfac`](https://github.com/signalwire/signalwire-js/commit/3d0fe342a5dfb34814b376bf62b370f0bf57bfac), [`fd39f12ca49f9257933b59490c64563e3391a93a`](https://github.com/signalwire/signalwire-js/commit/fd39f12ca49f9257933b59490c64563e3391a93a), [`f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc`](https://github.com/signalwire/signalwire-js/commit/f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc), [`2dc5db84d40b7224c641371727881c0319c002d1`](https://github.com/signalwire/signalwire-js/commit/2dc5db84d40b7224c641371727881c0319c002d1), [`ada6c49538862f466dea659286ea8eb405f4f636`](https://github.com/signalwire/signalwire-js/commit/ada6c49538862f466dea659286ea8eb405f4f636)]:
  - @signalwire/core@4.2.1

## [3.13.0] - 2025-01-21 (Accidental Release — DO NOT USE)

> **Note:** This version was published by mistake and should not be used.
> Please upgrade directly to `3.13.1` or higher.

## [3.12.1] - 2024-06-03

### Added

- [#983](https://github.com/signalwire/signalwire-js/pull/983) [`3d6a4fbe`](https://github.com/signalwire/signalwire-js/commit/3d6a4fbe4364a5795233d2aac87ba309d9d34bdd) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce CallSegment and CallFabric worker

### Fixed

- [#1055](https://github.com/signalwire/signalwire-js/pull/1055) [`e76c89c7`](https://github.com/signalwire/signalwire-js/commit/e76c89c73dba33d481212f7785cdf7650dbe4351) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix the outbound audio/video streams

### Dependencies

- Updated dependencies [[`45991e4c`](https://github.com/signalwire/signalwire-js/commit/45991e4c23065028b8e55af3c61faaf7661a8baf), [`e16ec479`](https://github.com/signalwire/signalwire-js/commit/e16ec479be85b40f989aba2e3bae932fd9eb59d9), [`968d226b`](https://github.com/signalwire/signalwire-js/commit/968d226ba2791f44dea4bd1b0d173aefaf103bda), [`ded3dc7a`](https://github.com/signalwire/signalwire-js/commit/ded3dc7a71977460d19fc623c3f2745f5365fb7b), [`0f4f2b3c`](https://github.com/signalwire/signalwire-js/commit/0f4f2b3cbf788a259baf5543fe82bbfc8b2540b7), [`254016f3`](https://github.com/signalwire/signalwire-js/commit/254016f396ce89cda82585b6ef9bb3f0e5b9135c), [`c370fec8`](https://github.com/signalwire/signalwire-js/commit/c370fec84e86701d8baf8910aebf1e959dcedc85), [`3d20672b`](https://github.com/signalwire/signalwire-js/commit/3d20672bbf2247b35e7d3ee8524a904fae1e6b2a), [`3d6a4fbe`](https://github.com/signalwire/signalwire-js/commit/3d6a4fbe4364a5795233d2aac87ba309d9d34bdd), [`184c8777`](https://github.com/signalwire/signalwire-js/commit/184c8777d1891985ab6bccbf417938e0dae5041f), [`c8deacef`](https://github.com/signalwire/signalwire-js/commit/c8deacef19176b7f744b61b9fe454556f0eccd52), [`229320b3`](https://github.com/signalwire/signalwire-js/commit/229320b3a105690bcb5c7271bc516d6269a1ca76), [`d215ef5d`](https://github.com/signalwire/signalwire-js/commit/d215ef5d1501f5f3df4e5d3837ac740f42649c2e), [`a08512a3`](https://github.com/signalwire/signalwire-js/commit/a08512a3a4f3a6fd1d0faf643f3c481ca668abc4), [`6d71362b`](https://github.com/signalwire/signalwire-js/commit/6d71362b589439fe3b4f234f4ff98871f8d98a20)]:
  - @signalwire/core@4.1.0

## [3.12.0] - 2024-04-17

### Added

- [#932](https://github.com/signalwire/signalwire-js/pull/932) [`6b0f8227`](https://github.com/signalwire/signalwire-js/commit/6b0f82271c0029c6f136a20e5b9326bdd9abab48) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Allow users to pass the optional `disableUdpIceServers` boolean flag with a value of `true` to remove the URLs of UDP transport ICE servers.

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

### Fixed

- [#959](https://github.com/signalwire/signalwire-js/pull/959) [`d93c3af4`](https://github.com/signalwire/signalwire-js/commit/d93c3af430db1580de204d8da9906a2220951049) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - FIXED include a media track in a sdp answer only when the peer offer have the same media

- Updated dependencies [[`03f01c36`](https://github.com/signalwire/signalwire-js/commit/03f01c36b3f1244e4eed4188610e67955c7ba9ce), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`6cb639bf`](https://github.com/signalwire/signalwire-js/commit/6cb639bf6dcbacefd71615ec99c4911cbbd120c4), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99)]:
  - @signalwire/core@4.0.0

## [3.11.0] - 2023-11-23

### Added

- [#909](https://github.com/signalwire/signalwire-js/pull/909) [`4ee7b6f8`](https://github.com/signalwire/signalwire-js/commit/4ee7b6f852e650c1828decda2429ebec79576085) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Expose the `sendDigits` function for Video RoomSession object

### Fixed

- Updated dependencies [[`d564c379`](https://github.com/signalwire/signalwire-js/commit/d564c379e10d23c21abb56b3e740aff70fc451b9), [`4ee7b6f8`](https://github.com/signalwire/signalwire-js/commit/4ee7b6f852e650c1828decda2429ebec79576085), [`6c9d2aa5`](https://github.com/signalwire/signalwire-js/commit/6c9d2aa5f5c8d7b07d955a2c6e2ab647a62bd702)]:
  - @signalwire/core@3.21.0

## [3.10.4] - 2023-11-07

### Dependencies

- Updated dependencies [[`e5db7cab`](https://github.com/signalwire/signalwire-js/commit/e5db7cabc2e532a19fad45753e47f7d612d6e248), [`bcced8ae`](https://github.com/signalwire/signalwire-js/commit/bcced8ae774de5483331c4d3146299d5ffffd7e7), [`2131bb41`](https://github.com/signalwire/signalwire-js/commit/2131bb418afeb75081fb2bfaee3b00a24df4614f)]:
  - @signalwire/core@3.20.0

## [3.10.3] - 2023-09-14

### Changed

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Enhance shared function between realtime and browser SDK

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Introduce the session emitter and eliminate the global emitter

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Eliminate the multicast pubsub channel

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the SDK by removing eventsPrefix from the namespaces

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the SDK by removing applyEmitterTransform

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the global emitter

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Remove event emitter transform pipeline from browser SDK

- [#865](https://github.com/signalwire/signalwire-js/pull/865) [`6c435be2`](https://github.com/signalwire/signalwire-js/commit/6c435be2738ec4a70c8acfada282b829b551ec82) - Expose `destroy` event for inbound calls in Call Fabric to handle cases where the caller cancel the dial before the callee answers.

- [#876](https://github.com/signalwire/signalwire-js/pull/876) [`e5db0ef9`](https://github.com/signalwire/signalwire-js/commit/e5db0ef95325d3578b8729c15e8bfca5b7a4cb3a) - Bump supported node version to at least 16

### Dependencies

- Updated dependencies [[`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`1086a1b0`](https://github.com/signalwire/signalwire-js/commit/1086a1b0dae256bb44858f16c24494aba8cdfc3e), [`be17e614`](https://github.com/signalwire/signalwire-js/commit/be17e614edd560a8578daf380dff1205e0032db3), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`fb45dce7`](https://github.com/signalwire/signalwire-js/commit/fb45dce7f57a99533df445b4e1cda9587a1f3eb4), [`2a9b88d9`](https://github.com/signalwire/signalwire-js/commit/2a9b88d92c61fbf9e317234e860c34081c49c235), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`e5db0ef9`](https://github.com/signalwire/signalwire-js/commit/e5db0ef95325d3578b8729c15e8bfca5b7a4cb3a)]:
  - @signalwire/core@3.19.0

## [3.10.2] - 2023-08-17

### Dependencies

- Updated dependencies [[`bb50b2fb`](https://github.com/signalwire/signalwire-js/commit/bb50b2fb31c6bb016e355b6884d2c2cb11260170)]:
  - @signalwire/core@3.18.3

## [3.10.1] - 2023-08-08

### Dependencies

- Updated dependencies [[`af7072b7`](https://github.com/signalwire/signalwire-js/commit/af7072b7415940b9ef00bb2d35b3ed6b6ba979a5)]:
  - @signalwire/core@3.18.2

## [3.10.0] - 2023-07-26

### Added

- [#838](https://github.com/signalwire/signalwire-js/pull/838) [`a7ae5448`](https://github.com/signalwire/signalwire-js/commit/a7ae5448d0327d68bc4f6c158ac2fe8e8417a581) - Allow to reject all the inbound legs

### Changed

- [#837](https://github.com/signalwire/signalwire-js/pull/837) [`2a2049ba`](https://github.com/signalwire/signalwire-js/commit/2a2049ba37ea786395d9552789f55d00172f165f) - Include `subscribe` in the answer for auto-subscribe events.

### Dependencies

- Updated dependencies [[`81beb29a`](https://github.com/signalwire/signalwire-js/commit/81beb29a9bc3c6135df37223fae44445967c1a84)]:
  - @signalwire/core@3.18.1

## [3.9.0] - 2023-07-19

### Added

- [#822](https://github.com/signalwire/signalwire-js/pull/822) [`65b0eea5`](https://github.com/signalwire/signalwire-js/commit/65b0eea54346b177e94fd3960e8cc21579c8a9ce) - Initial changes to setup a `SignalWire` client.

### Fixed

- [#830](https://github.com/signalwire/signalwire-js/pull/830) [`b9283059`](https://github.com/signalwire/signalwire-js/commit/b9283059f7f6633d9b28061efc46dab3bbf31d04) - Make `updateConstraints()` more resilient trying to stop the current MediaStream in case of `NotReadableError`.

- [#831](https://github.com/signalwire/signalwire-js/pull/831) [`f03e60a3`](https://github.com/signalwire/signalwire-js/commit/f03e60a3d2e27403fa14560697bb0ce20918f310) - Bugfix: make sure there is a valid RTCPeerConnection instance before hangup.

### Dependencies

- Updated dependencies [[`b44bd6fb`](https://github.com/signalwire/signalwire-js/commit/b44bd6fbd69acd206e43b5b1fefbe7989dc16298), [`6a35f0a3`](https://github.com/signalwire/signalwire-js/commit/6a35f0a38071160a82f766bd8b73b4718f04108f), [`65b0eea5`](https://github.com/signalwire/signalwire-js/commit/65b0eea54346b177e94fd3960e8cc21579c8a9ce)]:
  - @signalwire/core@3.18.0

## [3.8.0] - 2023-07-07

### Added

- [#805](https://github.com/signalwire/signalwire-js/pull/805) [`e8141c0e`](https://github.com/signalwire/signalwire-js/commit/e8141c0e85e11477e2911e6eccb1e96cff860d58) - Events to keep track of the connected devices status

### Changed

- [#819](https://github.com/signalwire/signalwire-js/pull/819) [`f814685b`](https://github.com/signalwire/signalwire-js/commit/f814685b24964c89510aad687d10f172265c0424) - Improve support for React Native.

- [#757](https://github.com/signalwire/signalwire-js/pull/757) [`c72e7ce4`](https://github.com/signalwire/signalwire-js/commit/c72e7ce4536910a5915000b3a88e2be064fa32a4) - Initial internal changes to support CF calling.

### Dependencies

- Updated dependencies [[`f814685b`](https://github.com/signalwire/signalwire-js/commit/f814685b24964c89510aad687d10f172265c0424), [`e8141c0e`](https://github.com/signalwire/signalwire-js/commit/e8141c0e85e11477e2911e6eccb1e96cff860d58), [`4e1116b6`](https://github.com/signalwire/signalwire-js/commit/4e1116b606ad41dc649c44eccf4f8b28d0dfa7d8)]:
  - @signalwire/core@3.17.0

## [3.7.0] - 2023-06-21

### Added

- [#798](https://github.com/signalwire/signalwire-js/pull/798) [`aaa07479`](https://github.com/signalwire/signalwire-js/commit/aaa07479db10685e72d96ea43927d759dbac076e) - Allow user to set the local media stream.

### Changed

- [#811](https://github.com/signalwire/signalwire-js/pull/811) [`f3711f17`](https://github.com/signalwire/signalwire-js/commit/f3711f1726a9001a4204527b34b452de80e9a0e6) - Improve reconnection under bad network conditions.

### Dependencies

- Updated dependencies [[`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`9fd8f9cb`](https://github.com/signalwire/signalwire-js/commit/9fd8f9cbff5fc03347248795f09e169166aba0f3), [`aaa07479`](https://github.com/signalwire/signalwire-js/commit/aaa07479db10685e72d96ea43927d759dbac076e), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`f3711f17`](https://github.com/signalwire/signalwire-js/commit/f3711f1726a9001a4204527b34b452de80e9a0e6), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431)]:
  - @signalwire/core@3.16.0

## [3.6.3] - 2023-05-22

### Dependencies

- Updated dependencies [[`aa31e1a0`](https://github.com/signalwire/signalwire-js/commit/aa31e1a0307e7c1f3927d985ecd48ec06b9a1312), [`4e8e5b0d`](https://github.com/signalwire/signalwire-js/commit/4e8e5b0d859733b9c7455150cd837e42e851ef29), [`9fb4e5f4`](https://github.com/signalwire/signalwire-js/commit/9fb4e5f43640b3e5a3978634e6465562a20ac4a5)]:
  - @signalwire/core@3.15.0

## [3.6.2] - 2023-03-24

### Fixed

- [#764](https://github.com/signalwire/signalwire-js/pull/764) [`a491dbff`](https://github.com/signalwire/signalwire-js/commit/a491dbffac6540a81ea22054dd97f2139d489651) - Add missing `sdp` dependency.

### Dependencies

- Updated dependencies [[`e299b048`](https://github.com/signalwire/signalwire-js/commit/e299b048fbcf876f2409335a98de1295fba70480)]:
  - @signalwire/core@3.14.1

## [3.6.1] - 2023-03-22

### Changed

- [#661](https://github.com/signalwire/signalwire-js/pull/661) [`ef18e7ef`](https://github.com/signalwire/signalwire-js/commit/ef18e7ef8b2c4121d7693a2683f1f190dd08f112) - Internal changes to keep the member_id stable across promote/demote.

- [#738](https://github.com/signalwire/signalwire-js/pull/738) [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a) - Remove executeActionWatcher and related functions

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Add worker to handle promoted/demoted events and trigger the proper renegotiation.

### Fixed

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Fix check for media to enable on promotion process.

### Dependencies

- Updated dependencies [[`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`688306f4`](https://github.com/signalwire/signalwire-js/commit/688306f4a5bd157dee40c13ce757001cfa30e832), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a)]:
  - @signalwire/core@3.14.0

## [3.6.0] - 2023-03-07

### Changed

- [#747](https://github.com/signalwire/signalwire-js/pull/747) [`95325ec9`](https://github.com/signalwire/signalwire-js/commit/95325ec9d1f3c98bd478eb799abefb1dabbd7759) - Changes to support connecting using SAT and join a video room.

- [#729](https://github.com/signalwire/signalwire-js/pull/729) [`41482813`](https://github.com/signalwire/signalwire-js/commit/414828131a81f5bf2e57d786d8002d96e25f7597) - Allow WebRTC connection to reconnect after a network change or temporary blip.

- [#734](https://github.com/signalwire/signalwire-js/pull/734) [`90d9776a`](https://github.com/signalwire/signalwire-js/commit/90d9776acd2dad58dded5036ec04b073efef2c65) - Ignore a remote SDP if it is the same of the current remoteDescription one.

- [#743](https://github.com/signalwire/signalwire-js/pull/743) [`4728ee55`](https://github.com/signalwire/signalwire-js/commit/4728ee555c6a2400877dccb986cbfc1408c7fb28) - Remove `.local` candidates from SDP Offer.

### Dependencies

- Updated dependencies [[`41482813`](https://github.com/signalwire/signalwire-js/commit/414828131a81f5bf2e57d786d8002d96e25f7597), [`a937768a`](https://github.com/signalwire/signalwire-js/commit/a937768a0b965d35b8468324a5d85273fc46e638), [`5b002eab`](https://github.com/signalwire/signalwire-js/commit/5b002eab500142c97777c16e7aab846282eca656), [`bbb9544c`](https://github.com/signalwire/signalwire-js/commit/bbb9544cf41d9825a84cff825e8c1c0ceda4920b), [`45536d5f`](https://github.com/signalwire/signalwire-js/commit/45536d5fb6a8e474a2f5b511ddf12fb474566b19), [`95325ec9`](https://github.com/signalwire/signalwire-js/commit/95325ec9d1f3c98bd478eb799abefb1dabbd7759), [`bb216980`](https://github.com/signalwire/signalwire-js/commit/bb21698019ef5db7e4cd0376f1cd6bfec66fea98), [`9ad158b9`](https://github.com/signalwire/signalwire-js/commit/9ad158b90f73bed038d18f7f8b745931c266c3cf), [`0bdda948`](https://github.com/signalwire/signalwire-js/commit/0bdda94824e9ffefa5830b951488899e0dbd8d85), [`e1e1e336`](https://github.com/signalwire/signalwire-js/commit/e1e1e336df952429126eea2c2b8aaea8e55d29d7), [`55a309f8`](https://github.com/signalwire/signalwire-js/commit/55a309f8d6189c97941a55d8396bfe0e0e588fc8), [`e2c475a7`](https://github.com/signalwire/signalwire-js/commit/e2c475a7ceb4e9eea6438b1d3dbb8457b7ad3e70)]:
  - @signalwire/core@3.13.0

## [3.5.9] - 2022-11-23

### Changed

- [#667](https://github.com/signalwire/signalwire-js/pull/667) [`bf68ad40`](https://github.com/signalwire/signalwire-js/commit/bf68ad40a090a73b1212eb1c0b2d88b7f9d0cdfd) - Enable `version` in BaseConnection dialogParams.

* [#686](https://github.com/signalwire/signalwire-js/pull/686) [`c82e6576`](https://github.com/signalwire/signalwire-js/commit/c82e65765555eecf0fd82b5e981ea928d133607e) - Review internals to always reconnect the SDKs expect for when the user disconnects the clients.

- [#674](https://github.com/signalwire/signalwire-js/pull/674) [`e26f84e5`](https://github.com/signalwire/signalwire-js/commit/e26f84e503493c7cb79f43bb57fc8b03f5c282f0) - Reduce some verbose logs

### Dependencies

- Updated dependencies [[`583ef730`](https://github.com/signalwire/signalwire-js/commit/583ef730675884b51045784980a12d80fc573b3b), [`3e7ce646`](https://github.com/signalwire/signalwire-js/commit/3e7ce6461a423e5b1014f16bf69b53793dfe1024), [`c82e6576`](https://github.com/signalwire/signalwire-js/commit/c82e65765555eecf0fd82b5e981ea928d133607e), [`a32413d8`](https://github.com/signalwire/signalwire-js/commit/a32413d89f9dc155be91aa148c4c56edec7e8413), [`aa5a469c`](https://github.com/signalwire/signalwire-js/commit/aa5a469ca1e33ca7bca6edb68f45f9edc3faf361)]:
  - @signalwire/core@3.12.2

## [3.5.8] - 2022-10-06

### Fixed

- [#659](https://github.com/signalwire/signalwire-js/pull/659) [`64e13ec6`](https://github.com/signalwire/signalwire-js/commit/64e13ec60a812ba3dbab941ea3d2bfa5f27ad5fe) - Fix `updateCamera` and `updateMicrophone` logic to apply changes on the localStream.

### Dependencies

- Updated dependencies [[`b765449b`](https://github.com/signalwire/signalwire-js/commit/b765449bb22604b7f116a365027e17b10984d0af), [`021d9b83`](https://github.com/signalwire/signalwire-js/commit/021d9b8364777e493aa8d320d5b03a4275f640bb), [`e3453977`](https://github.com/signalwire/signalwire-js/commit/e3453977b7df3cd34939ee8e6f15c6d83fb08134), [`be8b8dea`](https://github.com/signalwire/signalwire-js/commit/be8b8deadb8652d4ea54bd2b4c3cfd29d2f94662)]:
  - @signalwire/core@3.12.1

## [3.5.7] - 2022-09-21

### Changed

- [#643](https://github.com/signalwire/signalwire-js/pull/643) [`1d2fd5f8`](https://github.com/signalwire/signalwire-js/commit/1d2fd5f8836c94df23ee421fffe2fec67d74c57d) - Update `RTCPeer` to support environments where Unified-Plan and all the related RTC apis are not supported yet.

* [#636](https://github.com/signalwire/signalwire-js/pull/636) [`b9fb5deb`](https://github.com/signalwire/signalwire-js/commit/b9fb5deb967ab77f54731cd83a10726cd01f1a40) - Improve WebRTC feature detection.

- [#631](https://github.com/signalwire/signalwire-js/pull/631) [`c00b343e`](https://github.com/signalwire/signalwire-js/commit/c00b343ed48305c12fcc599e46e76f2116ab2706) - Allow RTC connection with sendonly direction.

- [#650](https://github.com/signalwire/signalwire-js/pull/650) [`39ff2060`](https://github.com/signalwire/signalwire-js/commit/39ff2060ef2b13e4e83a8cba2a4433fb552af38e) - Use default audio constraints if `true` is passed.

* [#645](https://github.com/signalwire/signalwire-js/pull/645) [`c76d6387`](https://github.com/signalwire/signalwire-js/commit/c76d638753678421680b183468f3bf2ad5932a41) - Internal changes to run the _roomSubscribed_ worker only for the main connection.

### Dependencies

- Updated dependencies [[`569213c8`](https://github.com/signalwire/signalwire-js/commit/569213c874b30d7c1452eb56775ee5aa9d370252), [`6cf01e1c`](https://github.com/signalwire/signalwire-js/commit/6cf01e1cecfc30395691aae68b6be15de140bd41), [`577e81d3`](https://github.com/signalwire/signalwire-js/commit/577e81d31cd237e87518a61532148c8c8563c3f6), [`0e7bffdd`](https://github.com/signalwire/signalwire-js/commit/0e7bffdd8ace2233c90c48fde925215e8753d53b), [`f1102bb6`](https://github.com/signalwire/signalwire-js/commit/f1102bb6817f119b2f7b063c7e1e5ab2be4e8ec5), [`5c3abab6`](https://github.com/signalwire/signalwire-js/commit/5c3abab6f2b9e47b17417f4378898cf240d12dba), [`577e81d3`](https://github.com/signalwire/signalwire-js/commit/577e81d31cd237e87518a61532148c8c8563c3f6), [`c00b343e`](https://github.com/signalwire/signalwire-js/commit/c00b343ed48305c12fcc599e46e76f2116ab2706)]:
  - @signalwire/core@3.12.0

## [3.5.6] - 2022-08-17

### Changed

- [#594](https://github.com/signalwire/signalwire-js/pull/594) [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120) - Refactoring to allow multiple RTCPeer instances on a BaseConnection.

* [#605](https://github.com/signalwire/signalwire-js/pull/605) [`2f909c9e`](https://github.com/signalwire/signalwire-js/commit/2f909c9ef670eeaed7b3444b9d4bf703bfbc3a1b) - Change how the SDK agent is defined.

- [#606](https://github.com/signalwire/signalwire-js/pull/606) [`999b2526`](https://github.com/signalwire/signalwire-js/commit/999b2526a8126ada05c93e59edc24c7fa1ee2872) - Fix typing issue with internal `Authorization` state.

* [#594](https://github.com/signalwire/signalwire-js/pull/594) [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120) - Internal: migrate `roomSubscribed` event handling to a custom worker.

### Dependencies

- Updated dependencies [[`3d202275`](https://github.com/signalwire/signalwire-js/commit/3d20227590f224cc1364171702ad3bffc83ff7be), [`9a6936e6`](https://github.com/signalwire/signalwire-js/commit/9a6936e68d9578bd8f0b1810a6a9bc1863338b90), [`fa62d67f`](https://github.com/signalwire/signalwire-js/commit/fa62d67ff13398f1a29f10ac8d6d6299a42e7554), [`d8cf078c`](https://github.com/signalwire/signalwire-js/commit/d8cf078ca113286b77ee978ae6c9c891a5b9d634), [`d7ce34d3`](https://github.com/signalwire/signalwire-js/commit/d7ce34d3e0a54952321b3186abcbad3cd97b7f81), [`5402ffcf`](https://github.com/signalwire/signalwire-js/commit/5402ffcf2169bfc05f490ead9b6ae9351a7968bc), [`2f909c9e`](https://github.com/signalwire/signalwire-js/commit/2f909c9ef670eeaed7b3444b9d4bf703bfbc3a1b), [`eb1c3fe9`](https://github.com/signalwire/signalwire-js/commit/eb1c3fe985767f747747ca0525b1c0710af862cb), [`7b196107`](https://github.com/signalwire/signalwire-js/commit/7b196107f120db410c5f85a3fd20682bacbf7576), [`7bdd7ab0`](https://github.com/signalwire/signalwire-js/commit/7bdd7ab03414a4b9aa337e9d6b339891c8feda36), [`81503784`](https://github.com/signalwire/signalwire-js/commit/815037849bbca0359b47e27de8979121623e4101), [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120), [`4e2284d6`](https://github.com/signalwire/signalwire-js/commit/4e2284d6b328f023a06e2e4b924182093fc9eb5f)]:
  - @signalwire/core@3.11.0

## [3.5.5]- 2022-07-27

### Changed

- [#593](https://github.com/signalwire/signalwire-js/pull/593) [`6b4ad46d`](https://github.com/signalwire/signalwire-js/commit/6b4ad46db6eb01e3e13496d65206a87cf09819aa) - Review `webrtc` folder structure and import order to fix a circular dependency between modules.

### Fixed

- [#592](https://github.com/signalwire/signalwire-js/pull/592) [`6d1c26ea`](https://github.com/signalwire/signalwire-js/commit/6d1c26eaaaa6799bde38099218e55e88dbe634ca) - Set a timeout for `getUserMedia` only if the permissions have already been granted.

### Dependencies

- Updated dependencies [[`6bc89d81`](https://github.com/signalwire/signalwire-js/commit/6bc89d81fe6ffa7530f60ed90482db1e7a39d6ac)]:
  - @signalwire/core@3.10.1

## [3.5.4]- 2022-07-14

### Changed

- [#587](https://github.com/signalwire/signalwire-js/pull/587) [`4300716e`](https://github.com/signalwire/signalwire-js/commit/4300716e57c83584dcfdd10ecddb8e1121084269) - Enable `pingSupported` by default for all WebRTC Connections.

* [#588](https://github.com/signalwire/signalwire-js/pull/588) [`bbc21e43`](https://github.com/signalwire/signalwire-js/commit/bbc21e43aadcff7fec6d8416ef1eb101f5ed49d0) - Internal changes on how `BaseConnection` retrieves and handle local state properties.

### Dependencies

- Updated dependencies [[`8ec914b6`](https://github.com/signalwire/signalwire-js/commit/8ec914b6c5f446ecc4b9fae7587b89da360dddf8), [`9e1bf9d8`](https://github.com/signalwire/signalwire-js/commit/9e1bf9d841be864064fd78bfd36915cfb52cff21), [`9eb9851f`](https://github.com/signalwire/signalwire-js/commit/9eb9851f0bb048b7ed24d2c1bcfc23915a11c7c7), [`bbc21e43`](https://github.com/signalwire/signalwire-js/commit/bbc21e43aadcff7fec6d8416ef1eb101f5ed49d0), [`d308daf8`](https://github.com/signalwire/signalwire-js/commit/d308daf88b99d69465f03c240ecd6d1806a379a9)]:
  - @signalwire/core@3.10.0

## [3.5.3]- 2022-06-24

### Patch Changes

- [#574](https://github.com/signalwire/signalwire-js/pull/574) [`4e35e0ac`](https://github.com/signalwire/signalwire-js/commit/4e35e0ac7f93f574c4c62e631c9408fb749e81da) - Fix issue with missing constructors on react-native.

* [#576](https://github.com/signalwire/signalwire-js/pull/576) [`43b29191`](https://github.com/signalwire/signalwire-js/commit/43b2919101564da45ba7f9e1a8a4ef3fd62b6696) - [internal] Read `pingSupported` option to trigger ping/pong for the rtc connection.

- [#552](https://github.com/signalwire/signalwire-js/pull/552) [`b168fc4f`](https://github.com/signalwire/signalwire-js/commit/b168fc4f92411bff70c50009f4a326171c886a55) - Add support for _internal_ ping/pong at the signaling level.

* [#557](https://github.com/signalwire/signalwire-js/pull/557) [`f15032f1`](https://github.com/signalwire/signalwire-js/commit/f15032f180503453c49d10cbf2a8ef5e24e27dc3) - [internal] Add ability to update the media options.

### Dependencies

- Updated dependencies [[`e8a54a63`](https://github.com/signalwire/signalwire-js/commit/e8a54a63003ddd1f07302b2fae140296135ad666), [`f15032f1`](https://github.com/signalwire/signalwire-js/commit/f15032f180503453c49d10cbf2a8ef5e24e27dc3), [`14c08b89`](https://github.com/signalwire/signalwire-js/commit/14c08b899bfd763be87a63580ee94a00ed514856), [`b168fc4f`](https://github.com/signalwire/signalwire-js/commit/b168fc4f92411bff70c50009f4a326171c886a55)]:
  - @signalwire/core@3.9.1

## [3.5.2]- 2022-06-10

### Dependencies

- Updated dependencies [[`02d97ded`](https://github.com/signalwire/signalwire-js/commit/02d97ded0295fa6cf75dd154eabd64871a17f7d6)]:
  - @signalwire/core@3.9.0

## [3.5.1] - 2022-06-01

### Fixed

- [#545](https://github.com/signalwire/signalwire-js/pull/545) [`78d1aea6`](https://github.com/signalwire/signalwire-js/commit/78d1aea6536008f5fd7885e23f0eaed2c431b6e0) - Accept `requesting` as valid state when we need to send again the offer on a different node (redirect destination).

### Dependencies

- Updated dependencies [[`875b2bb8`](https://github.com/signalwire/signalwire-js/commit/875b2bb844cc34d0b173b8544a5c34f0d39fc9c3), [`fc4689df`](https://github.com/signalwire/signalwire-js/commit/fc4689dfd1955f03d59fb8a0ae8e530d4ef8f79d), [`1b95b93b`](https://github.com/signalwire/signalwire-js/commit/1b95b93ba30f7c226d99c6c667604bcce8349d26)]:
  - @signalwire/core@3.8.1

## [3.5.0] - 2022-05-19

### Deprecated

- [#527](https://github.com/signalwire/signalwire-js/pull/527) [`d42824a0`](https://github.com/signalwire/signalwire-js/commit/d42824a05cf9ee6704e3f6c28ec51978ae0d3ed9) - Deprecate `getDevicesWithPermissions` and promote `getDevices` to check for permissions to always return a valid/useful device list with `deviceId` and `label`.

### Changed

- [#526](https://github.com/signalwire/signalwire-js/pull/526) [`01c33de9`](https://github.com/signalwire/signalwire-js/commit/01c33de9d3d077c02261694d88bcc72af93a171b) - Add timeout on `getUserMedia` requests and reject in case of no response from the browser.

### Fixed

- [#510](https://github.com/signalwire/signalwire-js/pull/510) [`ad62b818`](https://github.com/signalwire/signalwire-js/commit/ad62b8189070cba9290644637b5ae6d124fe4037) - Check for `audioContext.state` before closing it.

* [#520](https://github.com/signalwire/signalwire-js/pull/520) [`2c3145b7`](https://github.com/signalwire/signalwire-js/commit/2c3145b70379a5b4f66b362b98e75900fce32a9c) - Fix `getDevicesWithPermissions` for Firefox.

### Dependencies

- Updated dependencies [[`f89b8848`](https://github.com/signalwire/signalwire-js/commit/f89b884860451e010c1c76df5d73f81e2f722fe7), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`a0b7b4d0`](https://github.com/signalwire/signalwire-js/commit/a0b7b4d0f5eb95c7ccbf752c43c8abd53e8a4de7), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`0b98a9e4`](https://github.com/signalwire/signalwire-js/commit/0b98a9e48b751d244abea92fea4cd79e92dfc0b7), [`f69ef584`](https://github.com/signalwire/signalwire-js/commit/f69ef5848eebf8c4c1901fda5ea1d3c8a92b6a84), [`c02b694e`](https://github.com/signalwire/signalwire-js/commit/c02b694e43132b37a162ba6dc93feeb0dfbeae65), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`5c96bf85`](https://github.com/signalwire/signalwire-js/commit/5c96bf85a0d584d8467450144b0bbe97c863a571), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`05bb3c31`](https://github.com/signalwire/signalwire-js/commit/05bb3c31fc7527c17814535b59e926db09d34f43), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`12c64580`](https://github.com/signalwire/signalwire-js/commit/12c6458088fe5d2e560095f0d4ba0b5bbbc65b5c), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`24ef812a`](https://github.com/signalwire/signalwire-js/commit/24ef812a392eb1b46cf638a373638a34cdb20a96), [`cf845603`](https://github.com/signalwire/signalwire-js/commit/cf8456031c4ba3adea0b8369d1fac7e2fed407b8), [`7e64fb28`](https://github.com/signalwire/signalwire-js/commit/7e64fb28db2f21394b8c44789db603c7253dacc2), [`76e92dd9`](https://github.com/signalwire/signalwire-js/commit/76e92dd95abc32dee4e4add8ad6397b8d3216293), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`b36970ac`](https://github.com/signalwire/signalwire-js/commit/b36970ac5f9993fe1fd7db94910cc6aba7c1a204), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`b6d5bb3b`](https://github.com/signalwire/signalwire-js/commit/b6d5bb3bf4576961aff6b9c8b1397a5085b02056), [`61838b07`](https://github.com/signalwire/signalwire-js/commit/61838b07f8a1e217c1d7367f5f3774698ec97c56), [`6ebf3f64`](https://github.com/signalwire/signalwire-js/commit/6ebf3f64f580bbcc91863b330082fc0ef9ac806a), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`e09afd5b`](https://github.com/signalwire/signalwire-js/commit/e09afd5bf1ff72469aea65532c08064966c38115), [`4c0909dd`](https://github.com/signalwire/signalwire-js/commit/4c0909ddb57b86bb0216af0c83d37f11a0e54754)]:
  - @signalwire/core@3.8.0

## [3.4.2] - 2022-04-01

### Dependencies

- Updated dependencies [[`a9abe1d5`](https://github.com/signalwire/signalwire-js/commit/a9abe1d5f2267513f0765fd47a2cf9334463b445)]:
  - @signalwire/core@3.7.1

## [3.4.1] - 2022-03-25

### Added

- [#418](https://github.com/signalwire/signalwire-js/pull/418) [`a8036381`](https://github.com/signalwire/signalwire-js/commit/a803638111de02e5174f47e661477fe5b2f4e092) - Add ability to reinvite media on the BaseConnection.

- [#401](https://github.com/signalwire/signalwire-js/pull/401) [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592) - Add `layout` and `positions` when starting a `screenShare`.

### Fixed

- [#463](https://github.com/signalwire/signalwire-js/pull/463) [`2e4a59cd`](https://github.com/signalwire/signalwire-js/commit/2e4a59cdcbbce252c49f85a83bc22279312963f3) - Fixed getDisplayMedia signature.

- [#461](https://github.com/signalwire/signalwire-js/pull/461) [`da4ef026`](https://github.com/signalwire/signalwire-js/commit/da4ef026d41e0a806b0fddd4662cb96d31920460) - Prevent BaseConnection RPCs without a `node_id`.

### Dependencies

- Updated dependencies [[`8f203450`](https://github.com/signalwire/signalwire-js/commit/8f20345085b9dde85f93c0b2bbdcb0c5d3060d8e), [`c487d29b`](https://github.com/signalwire/signalwire-js/commit/c487d29ba47be5cb5a47861b10145f6c6ef9ebe4), [`b1b022a4`](https://github.com/signalwire/signalwire-js/commit/b1b022a43bc030d65e287d43244025ba9ab32cf9), [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592), [`4a918d56`](https://github.com/signalwire/signalwire-js/commit/4a918d5605518750a00ccf079f2312c51f4c05ea), [`058e9a0c`](https://github.com/signalwire/signalwire-js/commit/058e9a0cee9fe5b2148d8c6bae3e8524ef180f98), [`2c8fc597`](https://github.com/signalwire/signalwire-js/commit/2c8fc59719e7f40c1d9b01ebf67190d358dcea46), [`563a31e5`](https://github.com/signalwire/signalwire-js/commit/563a31e554aec607f939d25dc45c9a1aefb7fe40), [`1944348f`](https://github.com/signalwire/signalwire-js/commit/1944348f3d3f4f5c2a538bb100747b8faf2dae1b), [`4d7bcc30`](https://github.com/signalwire/signalwire-js/commit/4d7bcc30775ea6428be1ca0e6fda349653db808b)]:
  - @signalwire/core@3.7.0

## [3.4.0] - 2022-03-02

### Added

- [#433](https://github.com/signalwire/signalwire-js/pull/433) [`dabaafe9`](https://github.com/signalwire/signalwire-js/commit/dabaafe96a7cce64df5b23d52add51714006fa81) - Add `createMicrophoneAnalyzer` helper for testing the microphone.

### Changed

- [#446](https://github.com/signalwire/signalwire-js/pull/446) [`0edfa63b`](https://github.com/signalwire/signalwire-js/commit/0edfa63bd4a44b3dbf4e5a7d171f62c47330bad9) - Fix typings for `createMicrophoneAnalyzer` to make it return `Promise<MicrophoneAnalyzer>`.

### Fixed

- [#442](https://github.com/signalwire/signalwire-js/pull/442) [`f1fca94d`](https://github.com/signalwire/signalwire-js/commit/f1fca94d21825601e76adb7c5914cf36e8d7f9f3) - Fix to properly handle switching between microphones on Firefox.

### Dependencies

- Updated dependencies [[`bc0134e9`](https://github.com/signalwire/signalwire-js/commit/bc0134e939c654f5e2d78188b041f31c611724c1), [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592), [`d168a035`](https://github.com/signalwire/signalwire-js/commit/d168a035c6f56f5002935269a2f379ef796355df), [`edc573f2`](https://github.com/signalwire/signalwire-js/commit/edc573f2cb7f3c82430b833117f537b7dcc462c8)]:
  - @signalwire/core@3.6.0

## [3.3.1] - 2022-02-04

### Fixed

- [#410](https://github.com/signalwire/signalwire-js/pull/410) [`d2ef4270`](https://github.com/signalwire/signalwire-js/commit/d2ef42703b3406c620816e221179c16ea5729e8b) - Read `iceServers` on RTCPeer setup to avoid race conditions.

### Dependencies

- Updated dependencies [[`da526347`](https://github.com/signalwire/signalwire-js/commit/da526347cdd0503635ff9ae8cab6a7eaef334da4), [`3f851e2a`](https://github.com/signalwire/signalwire-js/commit/3f851e2a83e5f62919ff689efb5adb2084654ad9), [`6d234ccc`](https://github.com/signalwire/signalwire-js/commit/6d234ccc34eec4f12ae22ce67a4461ac2cebb9f2), [`bbbff2c6`](https://github.com/signalwire/signalwire-js/commit/bbbff2c6bf8ea886163f13768a953f5d19e6a7ab), [`1bda6272`](https://github.com/signalwire/signalwire-js/commit/1bda62721d837f59eb8cf50981e0b25bbe8d07f8), [`c557e4e5`](https://github.com/signalwire/signalwire-js/commit/c557e4e54c790c4b003af855dfb0807209d478c1), [`f6290de0`](https://github.com/signalwire/signalwire-js/commit/f6290de05c32debef71482e61a27e5385ff81253), [`603d4497`](https://github.com/signalwire/signalwire-js/commit/603d4497ac777c063167ce6481b0ddf5c715ae3c), [`7c688bb5`](https://github.com/signalwire/signalwire-js/commit/7c688bb575fa737c468e5cc330ef145dfe480812), [`6d94624b`](https://github.com/signalwire/signalwire-js/commit/6d94624b943a653393e66ef4c1aeb72ac7ef2864), [`743168df`](https://github.com/signalwire/signalwire-js/commit/743168df0abef04960e18bba70474f489e1d36ce), [`c33a4565`](https://github.com/signalwire/signalwire-js/commit/c33a4565535fcdf96a751c29e6f040608fc8b777), [`d1174ec8`](https://github.com/signalwire/signalwire-js/commit/d1174ec8e81789d26314cb13665bb10fd2822d32)]:
  - @signalwire/core@3.5.0

## [3.3.0] - 2022-01-11

### Added

- [#394](https://github.com/signalwire/signalwire-js/pull/394) [`03e5d42`](https://github.com/signalwire/signalwire-js/commit/03e5d4253cbcc93d39479aac8f5bcf419ce1f837) - Expose `previewUrl` getter to internal BaseConnection object.

### Dependencies

- Updated dependencies [[`03e5d42`](https://github.com/signalwire/signalwire-js/commit/03e5d4253cbcc93d39479aac8f5bcf419ce1f837), [`da52634`](https://github.com/signalwire/signalwire-js/commit/da526347cdd0503635ff9ae8cab6a7eaef334da4), [`3f851e2`](https://github.com/signalwire/signalwire-js/commit/3f851e2a83e5f62919ff689efb5adb2084654ad9), [`62c25d8`](https://github.com/signalwire/signalwire-js/commit/62c25d8468c37711f37c6674c24251755a4ada39), [`ed04e25`](https://github.com/signalwire/signalwire-js/commit/ed04e2586710bc06dc758cdc3fa9f1d580565efd), [`576b667`](https://github.com/signalwire/signalwire-js/commit/576b66799c41bfd2853d7edb822d8413a928854e)]:
  - @signalwire/core@3.4.1

## [3.2.0] - 2021-12-16

### Added

- [#371](https://github.com/signalwire/signalwire-js/pull/371) [`499f62a`](https://github.com/signalwire/signalwire-js/commit/499f62a7a02fe023a197aa950cbda975ef4509b0) - Handle the `redirectDestination` case where the SDK should resend the invite to a specific node.

### Dependencies

- Updated dependencies [[`64997a0`](https://github.com/signalwire/signalwire-js/commit/64997a088c6771fa39213c3df0e58e8afb8ffaae), [`b7bdfcb`](https://github.com/signalwire/signalwire-js/commit/b7bdfcb807f711af640c0a2c32376e5b619ad108), [`ff82436`](https://github.com/signalwire/signalwire-js/commit/ff82436cb240843e8724b8ab2118d878f0c9dbd9), [`dd41aba`](https://github.com/signalwire/signalwire-js/commit/dd41abaa3ed3c5d93f7e546323fce51f9158ec23), [`f1ae2c9`](https://github.com/signalwire/signalwire-js/commit/f1ae2c94fce75efd1d30932bfa8f504c71c008f5), [`d2e51b8`](https://github.com/signalwire/signalwire-js/commit/d2e51b82bbc8307e0baa948c6a34d07dd1deb812), [`f436d5f`](https://github.com/signalwire/signalwire-js/commit/f436d5f106291f68ad8fb834f90cec0b9acd52bc), [`104256e`](https://github.com/signalwire/signalwire-js/commit/104256e31c8b919eb47bd9f630e8412db4de7f76), [`4606f19`](https://github.com/signalwire/signalwire-js/commit/4606f19fe72270d6d84b4e19fbf8cc51345df98c), [`1fb1440`](https://github.com/signalwire/signalwire-js/commit/1fb144037b34797b52d4515a1e0f632aace630ca), [`ec2ca1d`](https://github.com/signalwire/signalwire-js/commit/ec2ca1d05e2e531d6d46ffccf5e01ecb9def5a1d), [`f494e05`](https://github.com/signalwire/signalwire-js/commit/f494e05a28e013d29431c93690d2382db8df96e8), [`94b7363`](https://github.com/signalwire/signalwire-js/commit/94b7363da35f153dbdcc6d55e37cc81222c5f9fa)]:
  - @signalwire/core@3.4.0

## [3.1.6] - 2021-11-02

### Fixed

- [#347](https://github.com/signalwire/signalwire-js/pull/347) [`2360ef7`](https://github.com/signalwire/signalwire-js/commit/2360ef77915497072d4428aacf0595d9713a614e) - Fix issue with connection not being able to stablish when video/audio permissions were not granted.

- [#349](https://github.com/signalwire/signalwire-js/pull/349) [`a1bc095`](https://github.com/signalwire/signalwire-js/commit/a1bc095c22b9d2823208b6fddfbfd785803430de) - Fix issue when using multiple `createDeviceWatcher` at the same time.

### Dependencies

- Updated dependencies [[`bae6985`](https://github.com/signalwire/signalwire-js/commit/bae69856f67aa339c02e074fc936048f2cc7bc7b), [`fa40510`](https://github.com/signalwire/signalwire-js/commit/fa4051009213028955a043fedcfb7109da2e6f4b)]:
  - @signalwire/core@3.3.0

## [3.1.5] - 2021-10-12

### Dependencies

- Updated dependencies [[`7d183de`](https://github.com/signalwire/signalwire-js/commit/7d183de47bae0e1f436609ab63704ec1888134a8), [`2675e5e`](https://github.com/signalwire/signalwire-js/commit/2675e5ea1ce9247a9e9b525cacf365cb8e4374ca)]:
  - @signalwire/core@3.2.0

## [3.1.4] - 2021-10-06

### Fixed

- [#322](https://github.com/signalwire/signalwire-js/pull/322) [`da9909e`](https://github.com/signalwire/signalwire-js/commit/da9909ec37b470ef5d34c494147bb49bef6a748e) - Fix error handling for the `RoomSession` `.join()` method allowing users to catch the proper error.

### Dependencies

- Updated dependencies [[`3af0ea6`](https://github.com/signalwire/signalwire-js/commit/3af0ea6ee53ea9e5009e5e36c7e7418833730159), [`72eb91b`](https://github.com/signalwire/signalwire-js/commit/72eb91bd74a046fa720868a4b43e6154d7a076f0), [`2ac7f6d`](https://github.com/signalwire/signalwire-js/commit/2ac7f6defeb9a1a2a4254c300a15c258f8a57cd7), [`cec54bd`](https://github.com/signalwire/signalwire-js/commit/cec54bd208801f42a719a7777da802ae2c51a79a), [`febb842`](https://github.com/signalwire/signalwire-js/commit/febb84202568fde1b94558c8b470ba9e348f1aa4), [`b60e9fc`](https://github.com/signalwire/signalwire-js/commit/b60e9fcea7f1f308efcc78081cb3fb61c60ae522), [`4d21716`](https://github.com/signalwire/signalwire-js/commit/4d2171661dcf2a9ebd5bb6b6daa5c32a78dfa21f), [`49b4aa9`](https://github.com/signalwire/signalwire-js/commit/49b4aa9d127df0d52512b6c44359fc7b7b88caae), [`685e0a2`](https://github.com/signalwire/signalwire-js/commit/685e0a240bec5ee065f8fde91879c476768e4c1f)]:
  - @signalwire/core@3.1.4

## [3.1.3] - 2021-09-15

### Dependencies

- Updated dependencies [[`f35a8e0`](https://github.com/signalwire/signalwire-js/commit/f35a8e00a1c38a15d87c7bc3dd6afddc7e77da68), [`a780d6d`](https://github.com/signalwire/signalwire-js/commit/a780d6d2b03a3350aa41dbbe72397b75e9e18b64), [`820c6d1`](https://github.com/signalwire/signalwire-js/commit/820c6d1b6472486fefdb64d81997a09d966dda23), [`968bda7`](https://github.com/signalwire/signalwire-js/commit/968bda73d119183b8af5b7692504050db339d85a)]:
  - @signalwire/core@3.1.3

## [3.1.2] - 2021-09-09

### Added

- [#261](https://github.com/signalwire/signalwire-js/pull/261) [`9dd7dbb`](https://github.com/signalwire/signalwire-js/commit/9dd7dbb890b92b5f69c3c9bb615083367d8113bb) - Include all the `video.recording` events for the BaseConnection subscribe.

* [#257](https://github.com/signalwire/signalwire-js/pull/257) [`7380582`](https://github.com/signalwire/signalwire-js/commit/73805829683a8f4e2389dede2eaef25db4a5ffb7) - Added documentation for the exposed WebRTC methods.

### Dependencies

- Updated dependencies [[`a0f2ac7`](https://github.com/signalwire/signalwire-js/commit/a0f2ac706667c8909e89e8b2bd9429db1d11dc9d), [`6f58367`](https://github.com/signalwire/signalwire-js/commit/6f5836793764d7153850be8de05792664c2859e2), [`f37333a`](https://github.com/signalwire/signalwire-js/commit/f37333a5464d7555822e70668a91221e6489de08), [`e6233cc`](https://github.com/signalwire/signalwire-js/commit/e6233cc74fb3ad5fc3e042ac36f717be5e6988b8), [`9dd7dbb`](https://github.com/signalwire/signalwire-js/commit/9dd7dbb890b92b5f69c3c9bb615083367d8113bb), [`249facf`](https://github.com/signalwire/signalwire-js/commit/249facf92698be19f9567caea0283535b51a3ae7), [`5b4e57d`](https://github.com/signalwire/signalwire-js/commit/5b4e57d12fed829b15cf28a77ba0082f582e35f3)]:
  - @signalwire/core@3.1.2

## [3.1.1] - 2021-08-27

### Fixed

- [#244](https://github.com/signalwire/signalwire-js/pull/244) [`c270247`](https://github.com/signalwire/signalwire-js/commit/c270247769c6ae2584f0372bbb1426c6c994732a) - Validate `targets` passed to the `createDeviceWatcher()` WebRTC helper method.

### Dependencies

- Updated dependencies [[`97dacbb`](https://github.com/signalwire/signalwire-js/commit/97dacbb3aaf9029a6781ac2356591f928ae40580), [`d399bb4`](https://github.com/signalwire/signalwire-js/commit/d399bb4df70b590f3b06ecd81e8a099138187c6c), [`e45c52c`](https://github.com/signalwire/signalwire-js/commit/e45c52cc7d3c684efd2a080e0a138d3bb82ea8f0), [`1daa61f`](https://github.com/signalwire/signalwire-js/commit/1daa61f6cf5f7fa68fdb87dd4b27dcf55af76456), [`b7299f0`](https://github.com/signalwire/signalwire-js/commit/b7299f07c3583082b7d5c289fd1e1dca7936d6a4)]:
  - @signalwire/core@3.1.1

## [3.1.0] - 2021-08-13

### Added

- [#236](https://github.com/signalwire/signalwire-js/pull/236) [`b967c89`](https://github.com/signalwire/signalwire-js/commit/b967c892d99ad7fa96ebc5a31a871bde1eecb0d0) - Apply `audio` and `video` constraints sent from the backend consuming the `mediaParams` event.

* [#240](https://github.com/signalwire/signalwire-js/pull/240) [`b5d2a72`](https://github.com/signalwire/signalwire-js/commit/b5d2a726b4b2ba4b455dbbe0ebdbc72ed4ae26fd) - Allow `speakerId` to be set when creating a room object to set the audio output device before join.

- [#239](https://github.com/signalwire/signalwire-js/pull/239) [`5c2eb71`](https://github.com/signalwire/signalwire-js/commit/5c2eb7113334c432c7c806a8af29f48284414c9f) - Exports methods to check if the environment supports `getUserMedia` or `getDisplayMedia`.

### Dependencies

- Updated dependencies [[`b967c89`](https://github.com/signalwire/signalwire-js/commit/b967c892d99ad7fa96ebc5a31a871bde1eecb0d0)]:
  - @signalwire/core@3.1.0

## [3.0.0] - 2021-08-09

### Added

- [#187](https://github.com/signalwire/signalwire-js/pull/187) [`9ee753d`](https://github.com/signalwire/signalwire-js/commit/9ee753d1fea82561f760006676505f762d564c65) - Expose updateCamera and updateMicrophone methods to switch devices while connected to a Room

### Changed

- [#188](https://github.com/signalwire/signalwire-js/pull/188) [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2) - Move Room to `js` package

- [#152](https://github.com/signalwire/signalwire-js/pull/152) [`a5ef49a`](https://github.com/signalwire/signalwire-js/commit/a5ef49a7b5b39f69fda92bbe3016d0d1ee8e376a) - Expose "member.talking" event

- [#161](https://github.com/signalwire/signalwire-js/pull/161) [`22b61d3`](https://github.com/signalwire/signalwire-js/commit/22b61d33c7f944b0ceb2b7edf35e0ad5369d3293) - Rename some internal objects and review the public exports

- [#188](https://github.com/signalwire/signalwire-js/pull/188) [`5b5c454`](https://github.com/signalwire/signalwire-js/commit/5b5c45411fa691551c590fa9f69e8bdfef4b9cdd) - Change signature for setMediaElementSinkId to match the return type present in browsers.

- [#148](https://github.com/signalwire/signalwire-js/pull/148) [`0eeca38`](https://github.com/signalwire/signalwire-js/commit/0eeca3882c65a05a9fddb814b868e71d69cd8aac) - Review exported methods and interfaces.

- [#228](https://github.com/signalwire/signalwire-js/pull/228) [`2aa7ff0`](https://github.com/signalwire/signalwire-js/commit/2aa7ff0bfe052b7d8ba2a713f0aed79548ffb662) - Allow react-native builds to consume `getDisplayMedia` to start screenShare. Feature detection for methods on the RTCPeer.

### Fixed

- [#223](https://github.com/signalwire/signalwire-js/pull/223) [`d017a99`](https://github.com/signalwire/signalwire-js/commit/d017a993f57a8f30d880899c42540efa3a4f2654) - Update the filtering logic for the device list where Firefox could return a device with `deviceId` but with empty `label`.

- [#214](https://github.com/signalwire/signalwire-js/pull/214) [`ec49478`](https://github.com/signalwire/signalwire-js/commit/ec49478d3a8fb2384e57951ec13d859b83baa7dc) - Included `commonjs` versions into `js` and `webrtc` packages

- [#221](https://github.com/signalwire/signalwire-js/pull/221) [`9ebadd6`](https://github.com/signalwire/signalwire-js/commit/9ebadd6afb20cef322f5934ed26ca0b31e63f009) - Fix: set internal nodeId for BaseConnection objects

### Dependencies

- Updated dependencies [[`6995825`](https://github.com/signalwire/signalwire-js/commit/699582576f67f12cea37c98d52fb08af01fd6c01), [`ef1964c`](https://github.com/signalwire/signalwire-js/commit/ef1964cfbfbd5febcfe76dca73d5e11b7268941f), [`8e08e73`](https://github.com/signalwire/signalwire-js/commit/8e08e73a6d72583b4af125f9854838f8a268fdeb), [`4524780`](https://github.com/signalwire/signalwire-js/commit/4524780025944ded9497fbe9fbdb8f9e6fddb3b5), [`fe0fe0a`](https://github.com/signalwire/signalwire-js/commit/fe0fe0a51beb1e559fb20d2e80e7854582d51ba9), [`399d213`](https://github.com/signalwire/signalwire-js/commit/399d213816eb1ef43c624cd80ff4f8689817216c), [`8bb4e76`](https://github.com/signalwire/signalwire-js/commit/8bb4e7689559d0ec9dd77c29c5bd3c1aef8b68bd), [`2c89dfb`](https://github.com/signalwire/signalwire-js/commit/2c89dfb6fa55776d9718cc5d1ce0ce45fe49872a), [`f6b8b10`](https://github.com/signalwire/signalwire-js/commit/f6b8b10d155047bb8bfaf251c9559eafeba287ad), [`d84f142`](https://github.com/signalwire/signalwire-js/commit/d84f14258d2fcade88f6296c32fc8d630faef2a0), [`a5ef49a`](https://github.com/signalwire/signalwire-js/commit/a5ef49a7b5b39f69fda92bbe3016d0d1ee8e376a), [`12178ce`](https://github.com/signalwire/signalwire-js/commit/12178ce493fd5cfd735cf5dde5467f9440f0e35e), [`22b61d3`](https://github.com/signalwire/signalwire-js/commit/22b61d33c7f944b0ceb2b7edf35e0ad5369d3293), [`5820540`](https://github.com/signalwire/signalwire-js/commit/5820540054ef1a7a095bcf2ff934982d0608aa85), [`b1f3d45`](https://github.com/signalwire/signalwire-js/commit/b1f3d45e9245c228ecc2b5587e09ad0d406f2f93), [`ec49478`](https://github.com/signalwire/signalwire-js/commit/ec49478d3a8fb2384e57951ec13d859b83baa7dc), [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2), [`45e6159`](https://github.com/signalwire/signalwire-js/commit/45e6159dc78a33eb7c44f40f30a11cd73194d650), [`95df411`](https://github.com/signalwire/signalwire-js/commit/95df411b5105eaa0eeb3c3907c8cca6f2688a730), [`703ee44`](https://github.com/signalwire/signalwire-js/commit/703ee445dfce00c926213b8aa4d5da2e4ec79886)]:
  - @signalwire/core@3.0.0

## 3.0.0-beta.4

### Patch Changes

- ec49478: Included `commonjs` versions into `js` and `webrtc` packages
- Updated dependencies [ec49478]
  - @signalwire/core@3.0.0-beta.4

## 3.0.0-beta.3

### Patch Changes

- Updated dependencies [2c89dfb]
  - @signalwire/core@3.0.0-beta.3

## 3.0.0-beta.2

### Patch Changes

- efe9bd8: Move Room to `js` package
- 8bb4e76: Split Room objects into `Room`, `RoomDevice` and `RoomScreenShare` with specific methods for each use case.
- acf8082: Expose `addMicrophone`, `addCamera` and `addDevice` methods to stream from additional devices in a room.
- f6b8b10: Encapsulate each EventEmitter using a unique id as the namespace.
- 9ee753d: Expose `updateCamera` and `updateMicrophone` methods to switch devices while connected to a Room.
- 5b5c454: Change signature for `setMediaElementSinkId` to match the return type present in browsers.
- Updated dependencies [efe9bd8]
  - @signalwire/core@3.0.0-beta.2

## 3.0.0-beta.1

### Patch Changes

- 399d213: Expose createScreenShareObject() method to share the screen in a room
- a5ef49a: Expose "member.talking" event
- 22b61d3: Rename some internal objects and review the public exports
- 0eeca38: Review exported methods and interfaces
- Updated dependencies [703ee44]
  - @signalwire/core@3.0.0-beta.1

## 3.0.0-beta.0

### Major Changes

- fe0fe0a: Initial beta release of SignalWire JS SDK

### Patch Changes

- Updated dependencies [fe0fe0a]
  - @signalwire/core@3.0.0-beta.0
