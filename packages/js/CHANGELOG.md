# @signalwire/js

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2021-08-09

### Added

- [#224](https://github.com/signalwire/signalwire-js/pull/224) [`447460c`](https://github.com/signalwire/signalwire-js/commit/447460cd4d5405e801084f2d7113e669820d5f22) - Export `createCameraDeviceWatcher`, `createMicrophoneDeviceWatcher` and `createSpeakerDeviceWatcher` helper methods

* [#188](https://github.com/signalwire/signalwire-js/pull/188) [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2) - Move Room to `js` package

- [#195](https://github.com/signalwire/signalwire-js/pull/195) [`ef1964c`](https://github.com/signalwire/signalwire-js/commit/ef1964cfbfbd5febcfe76dca73d5e11b7268941f) - Export types/interfaces for Room events

* [#196](https://github.com/signalwire/signalwire-js/pull/196) [`d91b841`](https://github.com/signalwire/signalwire-js/commit/d91b841d11ba42a5a5e7edabf17fac54473f358e) - Fix esm bundle output for `js` package

- [#154](https://github.com/signalwire/signalwire-js/pull/154) [`5820540`](https://github.com/signalwire/signalwire-js/commit/5820540054ef1a7a095bcf2ff934982d0608aa85) - Remove regenerator-runtime from dependencies

* [#160](https://github.com/signalwire/signalwire-js/pull/160) [`399d213`](https://github.com/signalwire/signalwire-js/commit/399d213816eb1ef43c624cd80ff4f8689817216c) - Expose createScreenShareObject() method to share the screen in a room

- [#190](https://github.com/signalwire/signalwire-js/pull/190) [`8bb4e76`](https://github.com/signalwire/signalwire-js/commit/8bb4e7689559d0ec9dd77c29c5bd3c1aef8b68bd) - Split Room objects into Room, RoomDevice and RoomScreenShare with specific methods for each use case

* [#212](https://github.com/signalwire/signalwire-js/pull/212) [`2c89dfb`](https://github.com/signalwire/signalwire-js/commit/2c89dfb6fa55776d9718cc5d1ce0ce45fe49872a) - Deprecated `getLayoutList` and `getMemberList` in favour of `getLayouts` and `getMembers` respectively. Other methods (`audioMute`, `audioUnmute`, `deaf`, `hideVideoMuted`, `removeMember`, `setInputSensitivity`, `setLayout`, `setMicrophoneVolume`, `setSpeakerVolume`, `showVideoMuted`, `undeaf`, `videoMute`, `videoUnmute`) that were previously returning `{ code: string, message: string }` also went through a signature change and are now returning `Promise<void>`

- [#145](https://github.com/signalwire/signalwire-js/pull/145) [`7ba9d45`](https://github.com/signalwire/signalwire-js/commit/7ba9d45b7e76bf89ebd881afcae4cb625792ad06) - Add types to createRoomObject method

* [#179](https://github.com/signalwire/signalwire-js/pull/179) [`acf8082`](https://github.com/signalwire/signalwire-js/commit/acf808210ed8369e2e8e65e868599c0859b49a3d) - Expose createSecondSourceObject() method to stream from additional sources in a room

- [#226](https://github.com/signalwire/signalwire-js/pull/226) [`2bdd043`](https://github.com/signalwire/signalwire-js/commit/2bdd043425a90cc1b3a54aaa620517955195d006) - Fix `setMicrophoneVolume()` behavior on Room, RoomDevice and RoomScreenShare objects. Fix `setSpeakerVolume()` behavior on Room object.

* [#161](https://github.com/signalwire/signalwire-js/pull/161) [`22b61d3`](https://github.com/signalwire/signalwire-js/commit/22b61d33c7f944b0ceb2b7edf35e0ad5369d3293) - Rename some internal objects and review the public exports

- [#214](https://github.com/signalwire/signalwire-js/pull/214) [`ec49478`](https://github.com/signalwire/signalwire-js/commit/ec49478d3a8fb2384e57951ec13d859b83baa7dc) - Included `commonjs` versions into `js` and `webrtc` packages

* [#188](https://github.com/signalwire/signalwire-js/pull/188) [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2) - Add updateSpeaker method

- [#138](https://github.com/signalwire/signalwire-js/pull/138) [`9e3a65a`](https://github.com/signalwire/signalwire-js/commit/9e3a65a2466b09d7d18ec6cb1e0ab20b95e49869) - Always check stopMicrophoneWhileMuted and stopCameraWhileMuted in createRoomObject

* [#177](https://github.com/signalwire/signalwire-js/pull/177) [`f4372cd`](https://github.com/signalwire/signalwire-js/commit/f4372cd6f6d499610340cb473269ac610375db74) - Fix bug with the localVideo overlay rendering

- [#144](https://github.com/signalwire/signalwire-js/pull/144) [`95df411`](https://github.com/signalwire/signalwire-js/commit/95df411b5105eaa0eeb3c3907c8cca6f2688a730) - Renamed internal sessions classes, Bundled core dependencies

* [#156](https://github.com/signalwire/signalwire-js/pull/156) [`703ee44`](https://github.com/signalwire/signalwire-js/commit/703ee445dfce00c926213b8aa4d5da2e4ec79886) - Update RoomLayout interfaces and events payloads

* Updated dependencies [[`6995825`](https://github.com/signalwire/signalwire-js/commit/699582576f67f12cea37c98d52fb08af01fd6c01), [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2), [`ef1964c`](https://github.com/signalwire/signalwire-js/commit/ef1964cfbfbd5febcfe76dca73d5e11b7268941f), [`8e08e73`](https://github.com/signalwire/signalwire-js/commit/8e08e73a6d72583b4af125f9854838f8a268fdeb), [`4524780`](https://github.com/signalwire/signalwire-js/commit/4524780025944ded9497fbe9fbdb8f9e6fddb3b5), [`fe0fe0a`](https://github.com/signalwire/signalwire-js/commit/fe0fe0a51beb1e559fb20d2e80e7854582d51ba9), [`399d213`](https://github.com/signalwire/signalwire-js/commit/399d213816eb1ef43c624cd80ff4f8689817216c), [`8bb4e76`](https://github.com/signalwire/signalwire-js/commit/8bb4e7689559d0ec9dd77c29c5bd3c1aef8b68bd), [`2c89dfb`](https://github.com/signalwire/signalwire-js/commit/2c89dfb6fa55776d9718cc5d1ce0ce45fe49872a), [`a15b69a`](https://github.com/signalwire/signalwire-js/commit/a15b69ae21226ab98b7f4617a5384320b52d2f6d), [`acf8082`](https://github.com/signalwire/signalwire-js/commit/acf808210ed8369e2e8e65e868599c0859b49a3d), [`f6b8b10`](https://github.com/signalwire/signalwire-js/commit/f6b8b10d155047bb8bfaf251c9559eafeba287ad), [`d84f142`](https://github.com/signalwire/signalwire-js/commit/d84f14258d2fcade88f6296c32fc8d630faef2a0), [`a5ef49a`](https://github.com/signalwire/signalwire-js/commit/a5ef49a7b5b39f69fda92bbe3016d0d1ee8e376a), [`12178ce`](https://github.com/signalwire/signalwire-js/commit/12178ce493fd5cfd735cf5dde5467f9440f0e35e), [`9ee753d`](https://github.com/signalwire/signalwire-js/commit/9ee753d1fea82561f760006676505f762d564c65), [`22b61d3`](https://github.com/signalwire/signalwire-js/commit/22b61d33c7f944b0ceb2b7edf35e0ad5369d3293), [`5820540`](https://github.com/signalwire/signalwire-js/commit/5820540054ef1a7a095bcf2ff934982d0608aa85), [`d017a99`](https://github.com/signalwire/signalwire-js/commit/d017a993f57a8f30d880899c42540efa3a4f2654), [`b1f3d45`](https://github.com/signalwire/signalwire-js/commit/b1f3d45e9245c228ecc2b5587e09ad0d406f2f93), [`5b5c454`](https://github.com/signalwire/signalwire-js/commit/5b5c45411fa691551c590fa9f69e8bdfef4b9cdd), [`ec49478`](https://github.com/signalwire/signalwire-js/commit/ec49478d3a8fb2384e57951ec13d859b83baa7dc), [`0eeca38`](https://github.com/signalwire/signalwire-js/commit/0eeca3882c65a05a9fddb814b868e71d69cd8aac), [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2), [`9ebadd6`](https://github.com/signalwire/signalwire-js/commit/9ebadd6afb20cef322f5934ed26ca0b31e63f009), [`45e6159`](https://github.com/signalwire/signalwire-js/commit/45e6159dc78a33eb7c44f40f30a11cd73194d650), [`95df411`](https://github.com/signalwire/signalwire-js/commit/95df411b5105eaa0eeb3c3907c8cca6f2688a730), [`2aa7ff0`](https://github.com/signalwire/signalwire-js/commit/2aa7ff0bfe052b7d8ba2a713f0aed79548ffb662), [`703ee44`](https://github.com/signalwire/signalwire-js/commit/703ee445dfce00c926213b8aa4d5da2e4ec79886)]:
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
