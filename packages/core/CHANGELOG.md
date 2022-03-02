# @signalwire/core

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
