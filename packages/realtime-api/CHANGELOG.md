# @signalwire/realtime-api

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
