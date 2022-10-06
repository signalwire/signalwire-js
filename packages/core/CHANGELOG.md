# @signalwire/core

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
