# @signalwire/core

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
