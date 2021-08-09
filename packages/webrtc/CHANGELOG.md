# @signalwire/webrtc

## [3.0.0] - 2021-08-09

### Added

- [#188](https://github.com/signalwire/signalwire-js/pull/188) [`efe9bd8`](https://github.com/signalwire/signalwire-js/commit/efe9bd8ff92ec4b0938ce6208c60bc5d84cd59d2) - Move Room to `js` package

* [#160](https://github.com/signalwire/signalwire-js/pull/160) [`399d213`](https://github.com/signalwire/signalwire-js/commit/399d213816eb1ef43c624cd80ff4f8689817216c) - Expose createScreenShareObject() method to share the screen in a room

- [#190](https://github.com/signalwire/signalwire-js/pull/190) [`8bb4e76`](https://github.com/signalwire/signalwire-js/commit/8bb4e7689559d0ec9dd77c29c5bd3c1aef8b68bd) - Split Room objects into Room, RoomDevice and RoomScreenShare with specific methods for each use case

* [#176](https://github.com/signalwire/signalwire-js/pull/176) [`a15b69a`](https://github.com/signalwire/signalwire-js/commit/a15b69ae21226ab98b7f4617a5384320b52d2f6d) - Add method to retrieve the member list for the current room

- [#179](https://github.com/signalwire/signalwire-js/pull/179) [`acf8082`](https://github.com/signalwire/signalwire-js/commit/acf808210ed8369e2e8e65e868599c0859b49a3d) - Expose createSecondSourceObject() method to stream from additional sources in a room

* [#167](https://github.com/signalwire/signalwire-js/pull/167) [`f6b8b10`](https://github.com/signalwire/signalwire-js/commit/f6b8b10d155047bb8bfaf251c9559eafeba287ad) - Encapsulate each EventEmitter using a unique id as the namespace.

- [#152](https://github.com/signalwire/signalwire-js/pull/152) [`a5ef49a`](https://github.com/signalwire/signalwire-js/commit/a5ef49a7b5b39f69fda92bbe3016d0d1ee8e376a) - Expose "member.talking" event

* [#187](https://github.com/signalwire/signalwire-js/pull/187) [`9ee753d`](https://github.com/signalwire/signalwire-js/commit/9ee753d1fea82561f760006676505f762d564c65) - Expose updateCamera and updateMicrophone methods to switch devices while connected to a Room

- [#161](https://github.com/signalwire/signalwire-js/pull/161) [`22b61d3`](https://github.com/signalwire/signalwire-js/commit/22b61d33c7f944b0ceb2b7edf35e0ad5369d3293) - Rename some internal objects and review the public exports

* [#223](https://github.com/signalwire/signalwire-js/pull/223) [`d017a99`](https://github.com/signalwire/signalwire-js/commit/d017a993f57a8f30d880899c42540efa3a4f2654) - Update the filtering logic for the device list where Firefox could return a device with `deviceId` but with empty `label`.

- [#188](https://github.com/signalwire/signalwire-js/pull/188) [`5b5c454`](https://github.com/signalwire/signalwire-js/commit/5b5c45411fa691551c590fa9f69e8bdfef4b9cdd) - Change signature for setMediaElementSinkId to match the return type present in browsers.

* [#214](https://github.com/signalwire/signalwire-js/pull/214) [`ec49478`](https://github.com/signalwire/signalwire-js/commit/ec49478d3a8fb2384e57951ec13d859b83baa7dc) - Included `commonjs` versions into `js` and `webrtc` packages

- [#148](https://github.com/signalwire/signalwire-js/pull/148) [`0eeca38`](https://github.com/signalwire/signalwire-js/commit/0eeca3882c65a05a9fddb814b868e71d69cd8aac) - Review exported methods and interfaces

* [#221](https://github.com/signalwire/signalwire-js/pull/221) [`9ebadd6`](https://github.com/signalwire/signalwire-js/commit/9ebadd6afb20cef322f5934ed26ca0b31e63f009) - Fix: set internal nodeId for BaseConnection objects

- [#228](https://github.com/signalwire/signalwire-js/pull/228) [`2aa7ff0`](https://github.com/signalwire/signalwire-js/commit/2aa7ff0bfe052b7d8ba2a713f0aed79548ffb662) - Allow react-native builds to consume `getDisplayMedia` to start screenShare. Feature detection for methods on the RTCPeer.

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
