# @signalwire/js

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.1] - 2021-09-15

### Changed

- [#278](https://github.com/signalwire/signalwire-js/pull/278) [`f35a8e0`](https://github.com/signalwire/signalwire-js/commit/f35a8e00a1c38a15d87c7bc3dd6afddc7e77da68) - Removed option for passing a custom event emitter when creating a client.

### Fixed

- [#290](https://github.com/signalwire/signalwire-js/pull/290) [`a780d6d`](https://github.com/signalwire/signalwire-js/commit/a780d6d2b03a3350aa41dbbe72397b75e9e18b64) - Split event handlers for member from member updated events so each type of event gets the proper instance as a handler param.

- [#291](https://github.com/signalwire/signalwire-js/pull/291) [`07bf09c`](https://github.com/signalwire/signalwire-js/commit/07bf09ca4cfc11b3103c86f14b5526dcf41fe33d) - Fix TS signature for member methods

### Dependencies

- Updated dependencies [[`f35a8e0`](https://github.com/signalwire/signalwire-js/commit/f35a8e00a1c38a15d87c7bc3dd6afddc7e77da68), [`a780d6d`](https://github.com/signalwire/signalwire-js/commit/a780d6d2b03a3350aa41dbbe72397b75e9e18b64), [`f35a8e0`](https://github.com/signalwire/signalwire-js/commit/f35a8e00a1c38a15d87c7bc3dd6afddc7e77da68), [`820c6d1`](https://github.com/signalwire/signalwire-js/commit/820c6d1b6472486fefdb64d81997a09d966dda23), [`968bda7`](https://github.com/signalwire/signalwire-js/commit/968bda73d119183b8af5b7692504050db339d85a)]:
  - @signalwire/core@3.1.3
  - @signalwire/webrtc@3.1.3

## [3.2.0] - 2021-09-09

### Added

- [#261](https://github.com/signalwire/signalwire-js/pull/261) [`9dd7dbb`](https://github.com/signalwire/signalwire-js/commit/9dd7dbb890b92b5f69c3c9bb615083367d8113bb) - Expose `startRecording()` method to recording a RoomSession. It returns a RoomSessionRecording object so it can be paused, resumed and stopped.

- [#273](https://github.com/signalwire/signalwire-js/pull/273) [`249facf`](https://github.com/signalwire/signalwire-js/commit/249facf92698be19f9567caea0283535b51a3ae7) - Added `member.talking.started`, `member.talking.ended` events and deprecated `member.talking.start` and `member.talking.stop` for consistency with other event names.

### Dependencies

- Updated dependencies [[`a0f2ac7`](https://github.com/signalwire/signalwire-js/commit/a0f2ac706667c8909e89e8b2bd9429db1d11dc9d), [`6f58367`](https://github.com/signalwire/signalwire-js/commit/6f5836793764d7153850be8de05792664c2859e2), [`f37333a`](https://github.com/signalwire/signalwire-js/commit/f37333a5464d7555822e70668a91221e6489de08), [`9dd7dbb`](https://github.com/signalwire/signalwire-js/commit/9dd7dbb890b92b5f69c3c9bb615083367d8113bb), [`e6233cc`](https://github.com/signalwire/signalwire-js/commit/e6233cc74fb3ad5fc3e042ac36f717be5e6988b8), [`9dd7dbb`](https://github.com/signalwire/signalwire-js/commit/9dd7dbb890b92b5f69c3c9bb615083367d8113bb), [`249facf`](https://github.com/signalwire/signalwire-js/commit/249facf92698be19f9567caea0283535b51a3ae7), [`5b4e57d`](https://github.com/signalwire/signalwire-js/commit/5b4e57d12fed829b15cf28a77ba0082f582e35f3), [`7380582`](https://github.com/signalwire/signalwire-js/commit/73805829683a8f4e2389dede2eaef25db4a5ffb7)]:
  - @signalwire/core@3.1.2
  - @signalwire/webrtc@3.1.2

## [3.1.1] - 2021-08-27

### Changed

- [#243](https://github.com/signalwire/signalwire-js/pull/243) [`e45c52c`](https://github.com/signalwire/signalwire-js/commit/e45c52cc7d3c684efd2a080e0a138d3bb82ea8f0) - Allow to set the logger level via `logLevel` argument on the `UserOptions` interface.

### Dependencies

- Updated dependencies [[`97dacbb`](https://github.com/signalwire/signalwire-js/commit/97dacbb3aaf9029a6781ac2356591f928ae40580), [`d399bb4`](https://github.com/signalwire/signalwire-js/commit/d399bb4df70b590f3b06ecd81e8a099138187c6c), [`e45c52c`](https://github.com/signalwire/signalwire-js/commit/e45c52cc7d3c684efd2a080e0a138d3bb82ea8f0), [`1daa61f`](https://github.com/signalwire/signalwire-js/commit/1daa61f6cf5f7fa68fdb87dd4b27dcf55af76456), [`b7299f0`](https://github.com/signalwire/signalwire-js/commit/b7299f07c3583082b7d5c289fd1e1dca7936d6a4), [`c270247`](https://github.com/signalwire/signalwire-js/commit/c270247769c6ae2584f0372bbb1426c6c994732a)]:
  - @signalwire/core@3.1.1
  - @signalwire/webrtc@3.1.1

## [3.1.0] - 2021-08-13

### Added

- [#236](https://github.com/signalwire/signalwire-js/pull/236) [`b967c89`](https://github.com/signalwire/signalwire-js/commit/b967c892d99ad7fa96ebc5a31a871bde1eecb0d0) - Apply `audio` and `video` constraints sent from the backend consuming the `mediaParams` event.

* [#240](https://github.com/signalwire/signalwire-js/pull/240) [`b5d2a72`](https://github.com/signalwire/signalwire-js/commit/b5d2a726b4b2ba4b455dbbe0ebdbc72ed4ae26fd) - Allow `speakerId` to be set when creating a room object to set the audio output device before join.

- [#239](https://github.com/signalwire/signalwire-js/pull/239) [`5c2eb71`](https://github.com/signalwire/signalwire-js/commit/5c2eb7113334c432c7c806a8af29f48284414c9f) - Exports methods to check if the environment supports `getUserMedia` or `getDisplayMedia`

### Changed

- [#237](https://github.com/signalwire/signalwire-js/pull/237) [`6d36287`](https://github.com/signalwire/signalwire-js/commit/6d362878cacf5feaf6147fbe68c0c04d9c3c9697) - Set parent memberId for screenShare and additionalDevice sessions.
  Add default `audio` constraints for screenShareObjects.

### Dependencies

- Updated dependencies [[`b967c89`](https://github.com/signalwire/signalwire-js/commit/b967c892d99ad7fa96ebc5a31a871bde1eecb0d0), [`b5d2a72`](https://github.com/signalwire/signalwire-js/commit/b5d2a726b4b2ba4b455dbbe0ebdbc72ed4ae26fd), [`5c2eb71`](https://github.com/signalwire/signalwire-js/commit/5c2eb7113334c432c7c806a8af29f48284414c9f)]:
  - @signalwire/core@3.1.0
  - @signalwire/webrtc@3.1.0

## [3.0.0] - 2021-08-09

### Added

- [#224](https://github.com/signalwire/signalwire-js/pull/224) [`447460c`](https://github.com/signalwire/signalwire-js/commit/447460cd4d5405e801084f2d7113e669820d5f22) - Export `createCameraDeviceWatcher`, `createMicrophoneDeviceWatcher` and `createSpeakerDeviceWatcher` helper methods

- [#195](https://github.com/signalwire/signalwire-js/pull/195) [`ef1964c`](https://github.com/signalwire/signalwire-js/commit/ef1964cfbfbd5febcfe76dca73d5e11b7268941f) - Export types/interfaces for Room events

- [#160](https://github.com/signalwire/signalwire-js/pull/160) [`399d213`](https://github.com/signalwire/signalwire-js/commit/399d213816eb1ef43c624cd80ff4f8689817216c) - Expose createScreenShareObject() method to share the screen in a room

- [#179](https://github.com/signalwire/signalwire-js/pull/179) [`acf8082`](https://github.com/signalwire/signalwire-js/commit/acf808210ed8369e2e8e65e868599c0859b49a3d) - Expose createSecondSourceObject() method to stream from additional sources in a room

- [#214](https://github.com/signalwire/signalwire-js/pull/214) [`ec49478`](https://github.com/signalwire/signalwire-js/commit/ec49478d3a8fb2384e57951ec13d859b83baa7dc) - Included `commonjs` versions into `js` and `webrtc` packages

- [#188](https://github.com/signalwire/signalwire-js/pull/188) [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2) - Add `updateSpeaker` method

### Changed

- [#188](https://github.com/signalwire/signalwire-js/pull/188) [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2) - Move Room to `js` package

- [#190](https://github.com/signalwire/signalwire-js/pull/190) [`8bb4e76`](https://github.com/signalwire/signalwire-js/commit/8bb4e7689559d0ec9dd77c29c5bd3c1aef8b68bd) - Split Room objects into Room, RoomDevice and RoomScreenShare with specific methods for each use case

- [#212](https://github.com/signalwire/signalwire-js/pull/212) [`2c89dfb`](https://github.com/signalwire/signalwire-js/commit/2c89dfb6fa55776d9718cc5d1ce0ce45fe49872a) - Deprecated `getLayoutList` and `getMemberList` in favour of `getLayouts` and `getMembers` respectively. Other methods (`audioMute`, `audioUnmute`, `deaf`, `hideVideoMuted`, `removeMember`, `setInputSensitivity`, `setLayout`, `setMicrophoneVolume`, `setSpeakerVolume`, `showVideoMuted`, `undeaf`, `videoMute`, `videoUnmute`) that were previously returning `{ code: string, message: string }` also went through a signature change and are now returning `Promise<void>`

- [#145](https://github.com/signalwire/signalwire-js/pull/145) [`7ba9d45`](https://github.com/signalwire/signalwire-js/commit/7ba9d45b7e76bf89ebd881afcae4cb625792ad06) - Add types to createRoomObject method

- [#161](https://github.com/signalwire/signalwire-js/pull/161) [`22b61d3`](https://github.com/signalwire/signalwire-js/commit/22b61d33c7f944b0ceb2b7edf35e0ad5369d3293) - Rename some internal objects and review the public exports

- [#144](https://github.com/signalwire/signalwire-js/pull/144) [`95df411`](https://github.com/signalwire/signalwire-js/commit/95df411b5105eaa0eeb3c3907c8cca6f2688a730) - Renamed internal sessions classes, Bundled core dependencies

- [#156](https://github.com/signalwire/signalwire-js/pull/156) [`703ee44`](https://github.com/signalwire/signalwire-js/commit/703ee445dfce00c926213b8aa4d5da2e4ec79886) - Update RoomLayout interfaces and events payloads

### Fixed

- [#196](https://github.com/signalwire/signalwire-js/pull/196) [`d91b841`](https://github.com/signalwire/signalwire-js/commit/d91b841d11ba42a5a5e7edabf17fac54473f358e) - Fix esm bundle output for `js` package

- [#226](https://github.com/signalwire/signalwire-js/pull/226) [`2bdd043`](https://github.com/signalwire/signalwire-js/commit/2bdd043425a90cc1b3a54aaa620517955195d006) - Fix `setMicrophoneVolume()` behavior on Room, RoomDevice and RoomScreenShare objects. Fix `setSpeakerVolume()` behavior on Room object.

- [#138](https://github.com/signalwire/signalwire-js/pull/138) [`9e3a65a`](https://github.com/signalwire/signalwire-js/commit/9e3a65a2466b09d7d18ec6cb1e0ab20b95e49869) - Always check stopMicrophoneWhileMuted and stopCameraWhileMuted in createRoomObject

- [#177](https://github.com/signalwire/signalwire-js/pull/177) [`f4372cd`](https://github.com/signalwire/signalwire-js/commit/f4372cd6f6d499610340cb473269ac610375db74) - Fix bug with the localVideo overlay rendering

### Removed

- [#154](https://github.com/signalwire/signalwire-js/pull/154) [`5820540`](https://github.com/signalwire/signalwire-js/commit/5820540054ef1a7a095bcf2ff934982d0608aa85) - Remove regenerator-runtime from dependencies

### Dependencies

- Updated dependencies [[`6995825`](https://github.com/signalwire/signalwire-js/commit/699582576f67f12cea37c98d52fb08af01fd6c01), [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2), [`ef1964c`](https://github.com/signalwire/signalwire-js/commit/ef1964cfbfbd5febcfe76dca73d5e11b7268941f), [`8e08e73`](https://github.com/signalwire/signalwire-js/commit/8e08e73a6d72583b4af125f9854838f8a268fdeb), [`4524780`](https://github.com/signalwire/signalwire-js/commit/4524780025944ded9497fbe9fbdb8f9e6fddb3b5), [`fe0fe0a`](https://github.com/signalwire/signalwire-js/commit/fe0fe0a51beb1e559fb20d2e80e7854582d51ba9), [`399d213`](https://github.com/signalwire/signalwire-js/commit/399d213816eb1ef43c624cd80ff4f8689817216c), [`8bb4e76`](https://github.com/signalwire/signalwire-js/commit/8bb4e7689559d0ec9dd77c29c5bd3c1aef8b68bd), [`2c89dfb`](https://github.com/signalwire/signalwire-js/commit/2c89dfb6fa55776d9718cc5d1ce0ce45fe49872a), [`a15b69a`](https://github.com/signalwire/signalwire-js/commit/a15b69ae21226ab98b7f4617a5384320b52d2f6d), [`acf8082`](https://github.com/signalwire/signalwire-js/commit/acf808210ed8369e2e8e65e868599c0859b49a3d), [`f6b8b10`](https://github.com/signalwire/signalwire-js/commit/f6b8b10d155047bb8bfaf251c9559eafeba287ad), [`d84f142`](https://github.com/signalwire/signalwire-js/commit/d84f14258d2fcade88f6296c32fc8d630faef2a0), [`a5ef49a`](https://github.com/signalwire/signalwire-js/commit/a5ef49a7b5b39f69fda92bbe3016d0d1ee8e376a), [`12178ce`](https://github.com/signalwire/signalwire-js/commit/12178ce493fd5cfd735cf5dde5467f9440f0e35e), [`9ee753d`](https://github.com/signalwire/signalwire-js/commit/9ee753d1fea82561f760006676505f762d564c65), [`22b61d3`](https://github.com/signalwire/signalwire-js/commit/22b61d33c7f944b0ceb2b7edf35e0ad5369d3293), [`5820540`](https://github.com/signalwire/signalwire-js/commit/5820540054ef1a7a095bcf2ff934982d0608aa85), [`d017a99`](https://github.com/signalwire/signalwire-js/commit/d017a993f57a8f30d880899c42540efa3a4f2654), [`b1f3d45`](https://github.com/signalwire/signalwire-js/commit/b1f3d45e9245c228ecc2b5587e09ad0d406f2f93), [`5b5c454`](https://github.com/signalwire/signalwire-js/commit/5b5c45411fa691551c590fa9f69e8bdfef4b9cdd), [`ec49478`](https://github.com/signalwire/signalwire-js/commit/ec49478d3a8fb2384e57951ec13d859b83baa7dc), [`0eeca38`](https://github.com/signalwire/signalwire-js/commit/0eeca3882c65a05a9fddb814b868e71d69cd8aac), [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2), [`9ebadd6`](https://github.com/signalwire/signalwire-js/commit/9ebadd6afb20cef322f5934ed26ca0b31e63f009), [`45e6159`](https://github.com/signalwire/signalwire-js/commit/45e6159dc78a33eb7c44f40f30a11cd73194d650), [`95df411`](https://github.com/signalwire/signalwire-js/commit/95df411b5105eaa0eeb3c3907c8cca6f2688a730), [`2aa7ff0`](https://github.com/signalwire/signalwire-js/commit/2aa7ff0bfe052b7d8ba2a713f0aed79548ffb662), [`703ee44`](https://github.com/signalwire/signalwire-js/commit/703ee445dfce00c926213b8aa4d5da2e4ec79886)]:
  - @signalwire/core@3.0.0
  - @signalwire/webrtc@3.0.0

## 3.0.0-beta.6

### Patch Changes

- ec49478: Included `commonjs` versions into `js` and `webrtc` packages
- eaad2d8: Try to use aspectRatio 16:9 as a default value for video constraints
- Updated dependencies [ec49478]
  - @signalwire/core@3.0.0-beta.4
  - @signalwire/webrtc@3.0.0-beta.4

## 3.0.0-beta.5

### Patch Changes

- ef1964c: Export types/interfaces for Room events
- 2c89dfb: Deprecated `getLayoutList` and `getMemberList` in favour of `getLayouts` and `getMembers` respectively. Other methods (`audioMute`, `audioUnmute`, `deaf`, `hideVideoMuted`, `removeMember`, `setInputSensitivity`, `setLayout`, `setMicrophoneVolume`, `setSpeakerVolume`, `showVideoMuted`, `undeaf`, `videoMute`, `videoUnmute`) that were previously returning `{ code: string, message: string }` also went through a signature change and are now returning `Promise<void>`
- Updated dependencies [2c89dfb]
  - @signalwire/core@3.0.0-beta.3
  - @signalwire/webrtc@3.0.0-beta.3

## 3.0.0-beta.4

### Patch Changes

- Fix esm bundle output for `js` package

## 3.0.0-beta.3

### Patch Changes

- efe9bd8: Move Room to `js` package
- 8bb4e76: Split Room objects into Room, RoomDevice and RoomScreenShare with specific methods for each use case
- acf8082: Expose `addMicrophone`, `addCamera` and `addDevice` methods to stream from additional devices in a room.
- 9ee753d: Expose `updateCamera` and `updateMicrophone` methods to switch devices while connected to a Room.
- efe9bd8: Add updateSpeaker method
- f4372cd: Fix bug with the localVideo overlay rendering
- a15b69a: Add `getMemberList` method to retrieve the member list for the current room
- Updated dependencies [efe9bd8]
  - @signalwire/core@3.0.0-beta.2
  - @signalwire/webrtc@3.0.0-beta.2

## 3.0.0-beta.2

### Patch Changes

- 5820540: Remove regenerator-runtime from dependencies
- 399d213: Expose createScreenShareObject() method to share the screen in a room
- 7ba9d45: Add types to createRoomObject method
- 22b61d3: Rename some internal objects and review the public exports
- 95df411: Renamed internal sessions classes, Bundled core dependencies
- 703ee44: Update RoomLayout interfaces and events payloads
- Updated dependencies [703ee44]
  - @signalwire/core@3.0.0-beta.1
  - @signalwire/webrtc@3.0.0-beta.1

## 3.0.0-beta.1

### Patch Changes

- 9e3a65a: Always check stopMicrophoneWhileMuted and stopCameraWhileMuted in createRoomObject
- Updated dependencies [fe0fe0a]
  - @signalwire/core@3.0.0-beta.0
  - @signalwire/webrtc@3.0.0-beta.0

## 3.0.0-beta.0

### Major Changes

- fb2fa66: Initial beta release of SignalWire JS SDK
