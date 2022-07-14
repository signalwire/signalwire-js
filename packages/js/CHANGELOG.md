# @signalwire/js

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.13.0]- 2022-07-14

### Added

- [#585](https://github.com/signalwire/signalwire-js/pull/585) [`20f61a7d`](https://github.com/signalwire/signalwire-js/commit/20f61a7d61d34b9bbce5f6a323a98951577010e1) - Add ability to listen to `room.left` on RoomSession instances.

* [#560](https://github.com/signalwire/signalwire-js/pull/560) [`d308daf8`](https://github.com/signalwire/signalwire-js/commit/d308daf88b99d69465f03c240ecd6d1806a379a9) - Expose methods to `seek` to a specific video position during playback.

### Changed

- [#577](https://github.com/signalwire/signalwire-js/pull/577) [`9e1bf9d8`](https://github.com/signalwire/signalwire-js/commit/9e1bf9d841be864064fd78bfd36915cfb52cff21) - Remove all the internal docs.ts files and overall intellisense improvements.

* [#588](https://github.com/signalwire/signalwire-js/pull/588) [`bbc21e43`](https://github.com/signalwire/signalwire-js/commit/bbc21e43aadcff7fec6d8416ef1eb101f5ed49d0) - Internal changes on how `BaseConnection` retrieves and handle local state properties.

### Dependencies

- Updated dependencies [[`8ec914b6`](https://github.com/signalwire/signalwire-js/commit/8ec914b6c5f446ecc4b9fae7587b89da360dddf8), [`9e1bf9d8`](https://github.com/signalwire/signalwire-js/commit/9e1bf9d841be864064fd78bfd36915cfb52cff21), [`4300716e`](https://github.com/signalwire/signalwire-js/commit/4300716e57c83584dcfdd10ecddb8e1121084269), [`9eb9851f`](https://github.com/signalwire/signalwire-js/commit/9eb9851f0bb048b7ed24d2c1bcfc23915a11c7c7), [`bbc21e43`](https://github.com/signalwire/signalwire-js/commit/bbc21e43aadcff7fec6d8416ef1eb101f5ed49d0), [`d308daf8`](https://github.com/signalwire/signalwire-js/commit/d308daf88b99d69465f03c240ecd6d1806a379a9)]:
  - @signalwire/core@3.10.0
  - @signalwire/webrtc@3.5.4

## [3.12.1] - 2022-06-24

### Fixed

- [#574](https://github.com/signalwire/signalwire-js/pull/574) [`4e35e0ac`](https://github.com/signalwire/signalwire-js/commit/4e35e0ac7f93f574c4c62e631c9408fb749e81da) - Fix issue with missing constructors on `react-native`.

* [#579](https://github.com/signalwire/signalwire-js/pull/579) [`3cd2bab2`](https://github.com/signalwire/signalwire-js/commit/3cd2bab292cb59e8fc973eeb2ad3369b8cd5ea75) - Fix a possible condition where the localVideo overlay shows up after a video mute and video unmute in sequence without any layout changes in between.

- [#578](https://github.com/signalwire/signalwire-js/pull/578) [`2bd390de`](https://github.com/signalwire/signalwire-js/commit/2bd390dea1cadaddc25d559c1bed7eaa4c170b2b) - Add default width/height for video constraints.

### Dependencies

- Updated dependencies [[`e8a54a63`](https://github.com/signalwire/signalwire-js/commit/e8a54a63003ddd1f07302b2fae140296135ad666), [`4e35e0ac`](https://github.com/signalwire/signalwire-js/commit/4e35e0ac7f93f574c4c62e631c9408fb749e81da), [`43b29191`](https://github.com/signalwire/signalwire-js/commit/43b2919101564da45ba7f9e1a8a4ef3fd62b6696), [`f15032f1`](https://github.com/signalwire/signalwire-js/commit/f15032f180503453c49d10cbf2a8ef5e24e27dc3), [`14c08b89`](https://github.com/signalwire/signalwire-js/commit/14c08b899bfd763be87a63580ee94a00ed514856), [`b168fc4f`](https://github.com/signalwire/signalwire-js/commit/b168fc4f92411bff70c50009f4a326171c886a55), [`f15032f1`](https://github.com/signalwire/signalwire-js/commit/f15032f180503453c49d10cbf2a8ef5e24e27dc3)]:
  - @signalwire/core@3.9.1
  - @signalwire/webrtc@3.5.3

## [3.12.0] - 2022-06-10

### Added

- [#562](https://github.com/signalwire/signalwire-js/pull/562) [`02d97ded`](https://github.com/signalwire/signalwire-js/commit/02d97ded0295fa6cf75dd154eabd64871a17f7d6) - Add `layout` property to RoomSession.play().

### Fixed

- [#561](https://github.com/signalwire/signalwire-js/pull/561) [`e6e75067`](https://github.com/signalwire/signalwire-js/commit/e6e7506710af9016a693d129fb34e4e5975aa51a) - Fix typings for `member.updated` event.

### Dependencies

- Updated dependencies [[`02d97ded`](https://github.com/signalwire/signalwire-js/commit/02d97ded0295fa6cf75dd154eabd64871a17f7d6)]:
  - @signalwire/core@3.9.0
  - @signalwire/webrtc@3.5.2

## [3.11.1] - 2022-06-01

### Changed

- [#547](https://github.com/signalwire/signalwire-js/pull/547) [`b0f9aa5f`](https://github.com/signalwire/signalwire-js/commit/b0f9aa5f432992343b57e450d12dfc83e7591459) - Add ability to read a custom host from the JWT.

- [#546](https://github.com/signalwire/signalwire-js/pull/546) [`fc4689df`](https://github.com/signalwire/signalwire-js/commit/fc4689dfd1955f03d59fb8a0ae8e530d4ef8f79d) - Internal changes to migrate from `setWorker`/`attachWorker` to `runWorkers` and from `payload` to `initialState`.

### Fixed

- [#541](https://github.com/signalwire/signalwire-js/pull/541) [`4ad09354`](https://github.com/signalwire/signalwire-js/commit/4ad093543424479214460e9e1cc29f65f6ae5d38) - Try to force a browser repaint to move the local video overlay in the correct position

* [#554](https://github.com/signalwire/signalwire-js/pull/554) [`1b95b93b`](https://github.com/signalwire/signalwire-js/commit/1b95b93ba30f7c226d99c6c667604bcce8349d26) - Fix issue with local streams for when the user joined with a token with `join_audio_muted` or `join_video_muted`. Update typings.

### Dependencies

- Updated dependencies [[`875b2bb8`](https://github.com/signalwire/signalwire-js/commit/875b2bb844cc34d0b173b8544a5c34f0d39fc9c3), [`fc4689df`](https://github.com/signalwire/signalwire-js/commit/fc4689dfd1955f03d59fb8a0ae8e530d4ef8f79d), [`78d1aea6`](https://github.com/signalwire/signalwire-js/commit/78d1aea6536008f5fd7885e23f0eaed2c431b6e0), [`1b95b93b`](https://github.com/signalwire/signalwire-js/commit/1b95b93ba30f7c226d99c6c667604bcce8349d26)]:
  - @signalwire/core@3.8.1
  - @signalwire/webrtc@3.5.1

## [3.11.0] - 2022-05-19

### Added

- [#533](https://github.com/signalwire/signalwire-js/pull/533) [`b6d5bb3b`](https://github.com/signalwire/signalwire-js/commit/b6d5bb3bf4576961aff6b9c8b1397a5085b02056) - Introduce PubSub namespace

### Changed

- [#532](https://github.com/signalwire/signalwire-js/pull/532) [`12c64580`](https://github.com/signalwire/signalwire-js/commit/12c6458088fe5d2e560095f0d4ba0b5bbbc65b5c) - Improve typings of the public interface for the `Chat` namespace.

### Fixed

- [#497](https://github.com/signalwire/signalwire-js/pull/497) [`1fcf2544`](https://github.com/signalwire/signalwire-js/commit/1fcf25446b8946107b3d470ee221bc0f3ab5870b) - Fix to allow the JS SDK to be used in the Shadow DOM.

* [#494](https://github.com/signalwire/signalwire-js/pull/494) [`55afce1f`](https://github.com/signalwire/signalwire-js/commit/55afce1f1cdfb8fb8aed37c09369195135ad3573) - Fix regression on `createRoomObject` method.

- [#490](https://github.com/signalwire/signalwire-js/pull/490) [`1e83737e`](https://github.com/signalwire/signalwire-js/commit/1e83737e36acf48e65b9dc1f0496d26208e1774e) - Disconnect the underlay client in case of signaling and/or media errors.

* [#501](https://github.com/signalwire/signalwire-js/pull/501) [`5c96bf85`](https://github.com/signalwire/signalwire-js/commit/5c96bf85a0d584d8467450144b0bbe97c863a571) - Expose all the active recordings on the `room.joined` event.

* [#509](https://github.com/signalwire/signalwire-js/pull/509) [`5cacd751`](https://github.com/signalwire/signalwire-js/commit/5cacd75184de22d00cac6a4b5576fd2efec07432) - Force video elements to play when paused by UA.

### Dependencies

- Updated dependencies [[`f89b8848`](https://github.com/signalwire/signalwire-js/commit/f89b884860451e010c1c76df5d73f81e2f722fe7), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`ad62b818`](https://github.com/signalwire/signalwire-js/commit/ad62b8189070cba9290644637b5ae6d124fe4037), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`a0b7b4d0`](https://github.com/signalwire/signalwire-js/commit/a0b7b4d0f5eb95c7ccbf752c43c8abd53e8a4de7), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`0b98a9e4`](https://github.com/signalwire/signalwire-js/commit/0b98a9e48b751d244abea92fea4cd79e92dfc0b7), [`f69ef584`](https://github.com/signalwire/signalwire-js/commit/f69ef5848eebf8c4c1901fda5ea1d3c8a92b6a84), [`c02b694e`](https://github.com/signalwire/signalwire-js/commit/c02b694e43132b37a162ba6dc93feeb0dfbeae65), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`2c3145b7`](https://github.com/signalwire/signalwire-js/commit/2c3145b70379a5b4f66b362b98e75900fce32a9c), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`5c96bf85`](https://github.com/signalwire/signalwire-js/commit/5c96bf85a0d584d8467450144b0bbe97c863a571), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`05bb3c31`](https://github.com/signalwire/signalwire-js/commit/05bb3c31fc7527c17814535b59e926db09d34f43), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`12c64580`](https://github.com/signalwire/signalwire-js/commit/12c6458088fe5d2e560095f0d4ba0b5bbbc65b5c), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`24ef812a`](https://github.com/signalwire/signalwire-js/commit/24ef812a392eb1b46cf638a373638a34cdb20a96), [`d42824a0`](https://github.com/signalwire/signalwire-js/commit/d42824a05cf9ee6704e3f6c28ec51978ae0d3ed9), [`cf845603`](https://github.com/signalwire/signalwire-js/commit/cf8456031c4ba3adea0b8369d1fac7e2fed407b8), [`7e64fb28`](https://github.com/signalwire/signalwire-js/commit/7e64fb28db2f21394b8c44789db603c7253dacc2), [`76e92dd9`](https://github.com/signalwire/signalwire-js/commit/76e92dd95abc32dee4e4add8ad6397b8d3216293), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`b36970ac`](https://github.com/signalwire/signalwire-js/commit/b36970ac5f9993fe1fd7db94910cc6aba7c1a204), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`b6d5bb3b`](https://github.com/signalwire/signalwire-js/commit/b6d5bb3bf4576961aff6b9c8b1397a5085b02056), [`61838b07`](https://github.com/signalwire/signalwire-js/commit/61838b07f8a1e217c1d7367f5f3774698ec97c56), [`6ebf3f64`](https://github.com/signalwire/signalwire-js/commit/6ebf3f64f580bbcc91863b330082fc0ef9ac806a), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`01c33de9`](https://github.com/signalwire/signalwire-js/commit/01c33de9d3d077c02261694d88bcc72af93a171b), [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee), [`e09afd5b`](https://github.com/signalwire/signalwire-js/commit/e09afd5bf1ff72469aea65532c08064966c38115), [`4c0909dd`](https://github.com/signalwire/signalwire-js/commit/4c0909ddb57b86bb0216af0c83d37f11a0e54754)]:
  - @signalwire/core@3.8.0
  - @signalwire/webrtc@3.5.0

## [3.10.2] - 2022-04-01

### Dependencies

- Updated dependencies [[`a9abe1d5`](https://github.com/signalwire/signalwire-js/commit/a9abe1d5f2267513f0765fd47a2cf9334463b445)]:
  - @signalwire/core@3.7.1
  - @signalwire/webrtc@3.4.2

## [3.10.1] - 2022-03-31

### Fixed

- [#480](https://github.com/signalwire/signalwire-js/pull/480) [`ea6d5a43`](https://github.com/signalwire/signalwire-js/commit/ea6d5a4332be0484affeab479d83d12002cf7c95) - Fix race condition on `layout.changed` processing to update the localVideo overlay.

## [3.10.0] - 2022-03-25

### Added

- [#456](https://github.com/signalwire/signalwire-js/pull/456) [`c487d29b`](https://github.com/signalwire/signalwire-js/commit/c487d29ba47be5cb5a47861b10145f6c6ef9ebe4) - Add ability to handle member's currentPosition

* [#457](https://github.com/signalwire/signalwire-js/pull/457) [`4692b05d`](https://github.com/signalwire/signalwire-js/commit/4692b05d3790b86de256cb9a03a9d50b07dbde48) - Update default screenShare audio constraints.

- [#401](https://github.com/signalwire/signalwire-js/pull/401) [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592) - Add `layout` and `positions` when starting a screenShare.

* [#452](https://github.com/signalwire/signalwire-js/pull/452) [`563a31e5`](https://github.com/signalwire/signalwire-js/commit/563a31e554aec607f939d25dc45c9a1aefb7fe40) - Expose `setMeta` and `setMemberMeta` methods on the RoomSession.

### Fixed

- [#469](https://github.com/signalwire/signalwire-js/pull/469) [`4d7bcc30`](https://github.com/signalwire/signalwire-js/commit/4d7bcc30775ea6428be1ca0e6fda349653db808b) - Fix Chat methods that required the underlay client to be connected.

* [#455](https://github.com/signalwire/signalwire-js/pull/455) [`3b5f59b3`](https://github.com/signalwire/signalwire-js/commit/3b5f59b3eb10149c89515207a2bf0469834b262a) - Fix issue with local video overlay when user is video muted.

### Dependencies

- Updated dependencies [[`8f203450`](https://github.com/signalwire/signalwire-js/commit/8f20345085b9dde85f93c0b2bbdcb0c5d3060d8e), [`c487d29b`](https://github.com/signalwire/signalwire-js/commit/c487d29ba47be5cb5a47861b10145f6c6ef9ebe4), [`b1b022a4`](https://github.com/signalwire/signalwire-js/commit/b1b022a43bc030d65e287d43244025ba9ab32cf9), [`2e4a59cd`](https://github.com/signalwire/signalwire-js/commit/2e4a59cdcbbce252c49f85a83bc22279312963f3), [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592), [`4a918d56`](https://github.com/signalwire/signalwire-js/commit/4a918d5605518750a00ccf079f2312c51f4c05ea), [`058e9a0c`](https://github.com/signalwire/signalwire-js/commit/058e9a0cee9fe5b2148d8c6bae3e8524ef180f98), [`da4ef026`](https://github.com/signalwire/signalwire-js/commit/da4ef026d41e0a806b0fddd4662cb96d31920460), [`2c8fc597`](https://github.com/signalwire/signalwire-js/commit/2c8fc59719e7f40c1d9b01ebf67190d358dcea46), [`563a31e5`](https://github.com/signalwire/signalwire-js/commit/563a31e554aec607f939d25dc45c9a1aefb7fe40), [`1944348f`](https://github.com/signalwire/signalwire-js/commit/1944348f3d3f4f5c2a538bb100747b8faf2dae1b), [`4d7bcc30`](https://github.com/signalwire/signalwire-js/commit/4d7bcc30775ea6428be1ca0e6fda349653db808b), [`a8036381`](https://github.com/signalwire/signalwire-js/commit/a803638111de02e5174f47e661477fe5b2f4e092)]:
  - @signalwire/core@3.7.0
  - @signalwire/webrtc@3.4.1

## [3.9.0] - 2022-03-02

### Added

- [#433](https://github.com/signalwire/signalwire-js/pull/433) [`dabaafe9`](https://github.com/signalwire/signalwire-js/commit/dabaafe96a7cce64df5b23d52add51714006fa81) - Add helper for testing the microphone

- [#426](https://github.com/signalwire/signalwire-js/pull/426) [`edc573f2`](https://github.com/signalwire/signalwire-js/commit/edc573f2cb7f3c82430b833117f537b7dcc462c8) - Expose the `removeAllListeners` method for all the components.

- [#447](https://github.com/signalwire/signalwire-js/pull/447) [`37567d47`](https://github.com/signalwire/signalwire-js/commit/37567d470f7b0630d2b8aa448218837d045b74e5) - Expose `RoomSessionOptions` and `VideoMemberListUpdatedParams` types.

### Changed

- [#432](https://github.com/signalwire/signalwire-js/pull/432) [`3434f3af`](https://github.com/signalwire/signalwire-js/commit/3434f3af7bc7a7568ca907581c7fed41dec3d7f8) - Removed an obsolete console warning which was triggered for the previously experimental `Chat` feature.

### Dependencies

- Updated dependencies [[`dabaafe9`](https://github.com/signalwire/signalwire-js/commit/dabaafe96a7cce64df5b23d52add51714006fa81), [`0edfa63b`](https://github.com/signalwire/signalwire-js/commit/0edfa63bd4a44b3dbf4e5a7d171f62c47330bad9), [`bc0134e9`](https://github.com/signalwire/signalwire-js/commit/bc0134e939c654f5e2d78188b041f31c611724c1), [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592), [`d168a035`](https://github.com/signalwire/signalwire-js/commit/d168a035c6f56f5002935269a2f379ef796355df), [`f1fca94d`](https://github.com/signalwire/signalwire-js/commit/f1fca94d21825601e76adb7c5914cf36e8d7f9f3), [`edc573f2`](https://github.com/signalwire/signalwire-js/commit/edc573f2cb7f3c82430b833117f537b7dcc462c8)]:
  - @signalwire/webrtc@3.4.0
  - @signalwire/core@3.6.0

## [3.8.0] - 2022-02-04

### Added

- [#398](https://github.com/signalwire/signalwire-js/pull/398) [`da526347`](https://github.com/signalwire/signalwire-js/commit/da526347cdd0503635ff9ae8cab6a7eaef334da4) - Expose Chat methods: `getMembers`, `getMessages`, `setState` and `getState`

- [#400](https://github.com/signalwire/signalwire-js/pull/400) [`3f851e2a`](https://github.com/signalwire/signalwire-js/commit/3f851e2a83e5f62919ff689efb5adb2084654ad9) - Expose chat member events: `member.joined`, `member.updated` and `member.left`

- [#419](https://github.com/signalwire/signalwire-js/pull/419) [`c33a4565`](https://github.com/signalwire/signalwire-js/commit/c33a4565535fcdf96a751c29e6f040608fc8b777) - Expose RoomSession `memberList.updated` event to keep track of the whole member list.

- [#424](https://github.com/signalwire/signalwire-js/pull/424) [`743168df`](https://github.com/signalwire/signalwire-js/commit/743168df0abef04960e18bba70474f489e1d36ce) - Expose `updateToken` to the `Chat.Client` to allow renew tokens for a chat session.

### Dependencies

- Updated dependencies [[`da526347`](https://github.com/signalwire/signalwire-js/commit/da526347cdd0503635ff9ae8cab6a7eaef334da4), [`3f851e2a`](https://github.com/signalwire/signalwire-js/commit/3f851e2a83e5f62919ff689efb5adb2084654ad9), [`6d234ccc`](https://github.com/signalwire/signalwire-js/commit/6d234ccc34eec4f12ae22ce67a4461ac2cebb9f2), [`bbbff2c6`](https://github.com/signalwire/signalwire-js/commit/bbbff2c6bf8ea886163f13768a953f5d19e6a7ab), [`1bda6272`](https://github.com/signalwire/signalwire-js/commit/1bda62721d837f59eb8cf50981e0b25bbe8d07f8), [`c557e4e5`](https://github.com/signalwire/signalwire-js/commit/c557e4e54c790c4b003af855dfb0807209d478c1), [`f6290de0`](https://github.com/signalwire/signalwire-js/commit/f6290de05c32debef71482e61a27e5385ff81253), [`603d4497`](https://github.com/signalwire/signalwire-js/commit/603d4497ac777c063167ce6481b0ddf5c715ae3c), [`da5ddf5a`](https://github.com/signalwire/signalwire-js/commit/da5ddf5a14f6e8ffeeeb2efc34311738a92d18b1), [`d2ef4270`](https://github.com/signalwire/signalwire-js/commit/d2ef42703b3406c620816e221179c16ea5729e8b), [`7c688bb5`](https://github.com/signalwire/signalwire-js/commit/7c688bb575fa737c468e5cc330ef145dfe480812), [`6d94624b`](https://github.com/signalwire/signalwire-js/commit/6d94624b943a653393e66ef4c1aeb72ac7ef2864), [`743168df`](https://github.com/signalwire/signalwire-js/commit/743168df0abef04960e18bba70474f489e1d36ce), [`c33a4565`](https://github.com/signalwire/signalwire-js/commit/c33a4565535fcdf96a751c29e6f040608fc8b777), [`d1174ec8`](https://github.com/signalwire/signalwire-js/commit/d1174ec8e81789d26314cb13665bb10fd2822d32)]:
  - @signalwire/core@3.5.0
  - @signalwire/webrtc@3.3.1

## [3.7.0] - 2022-01-11

### Added

- [#394](https://github.com/signalwire/signalwire-js/pull/394) [`03e5d42`](https://github.com/signalwire/signalwire-js/commit/03e5d4253cbcc93d39479aac8f5bcf419ce1f837) - Add `previewUrl` property to the RoomSession object.

### Dependencies

- Updated dependencies [[`03e5d42`](https://github.com/signalwire/signalwire-js/commit/03e5d4253cbcc93d39479aac8f5bcf419ce1f837), [`da52634`](https://github.com/signalwire/signalwire-js/commit/da526347cdd0503635ff9ae8cab6a7eaef334da4), [`3f851e2`](https://github.com/signalwire/signalwire-js/commit/3f851e2a83e5f62919ff689efb5adb2084654ad9), [`62c25d8`](https://github.com/signalwire/signalwire-js/commit/62c25d8468c37711f37c6674c24251755a4ada39), [`ed04e25`](https://github.com/signalwire/signalwire-js/commit/ed04e2586710bc06dc758cdc3fa9f1d580565efd), [`03e5d42`](https://github.com/signalwire/signalwire-js/commit/03e5d4253cbcc93d39479aac8f5bcf419ce1f837), [`576b667`](https://github.com/signalwire/signalwire-js/commit/576b66799c41bfd2853d7edb822d8413a928854e)]:
  - @signalwire/core@3.4.1
  - @signalwire/webrtc@3.3.0

## [3.6.0] - 2021-12-16

### Added

- [#361](https://github.com/signalwire/signalwire-js/pull/361) [`4606f19`](https://github.com/signalwire/signalwire-js/commit/4606f19fe72270d6d84b4e19fbf8cc51345df98c) - [wip] Initial changes for the Chat namespace.

### Fixed

- [#375](https://github.com/signalwire/signalwire-js/pull/375) [`2b1e970`](https://github.com/signalwire/signalwire-js/commit/2b1e970df5fd74c79609fe7a678280020a4624e2) - Hide the local video overlay element when the user's video is not in the layout.

- [#379](https://github.com/signalwire/signalwire-js/pull/379) [`dd41aba`](https://github.com/signalwire/signalwire-js/commit/dd41abaa3ed3c5d93f7e546323fce51f9158ec23) - `RoomSession`: Improve TypeScript signature for member methods with optional properties.

- [#370](https://github.com/signalwire/signalwire-js/pull/370) [`ba0647b`](https://github.com/signalwire/signalwire-js/commit/ba0647bd198838d2f769c097e6b94348a55920b3) - Add prefix to the DOM elements created by the SDK to make them unique.

### Dependencies

- Updated dependencies [[`64997a0`](https://github.com/signalwire/signalwire-js/commit/64997a088c6771fa39213c3df0e58e8afb8ffaae), [`b7bdfcb`](https://github.com/signalwire/signalwire-js/commit/b7bdfcb807f711af640c0a2c32376e5b619ad108), [`ff82436`](https://github.com/signalwire/signalwire-js/commit/ff82436cb240843e8724b8ab2118d878f0c9dbd9), [`dd41aba`](https://github.com/signalwire/signalwire-js/commit/dd41abaa3ed3c5d93f7e546323fce51f9158ec23), [`f1ae2c9`](https://github.com/signalwire/signalwire-js/commit/f1ae2c94fce75efd1d30932bfa8f504c71c008f5), [`d2e51b8`](https://github.com/signalwire/signalwire-js/commit/d2e51b82bbc8307e0baa948c6a34d07dd1deb812), [`f436d5f`](https://github.com/signalwire/signalwire-js/commit/f436d5f106291f68ad8fb834f90cec0b9acd52bc), [`104256e`](https://github.com/signalwire/signalwire-js/commit/104256e31c8b919eb47bd9f630e8412db4de7f76), [`4606f19`](https://github.com/signalwire/signalwire-js/commit/4606f19fe72270d6d84b4e19fbf8cc51345df98c), [`1fb1440`](https://github.com/signalwire/signalwire-js/commit/1fb144037b34797b52d4515a1e0f632aace630ca), [`ec2ca1d`](https://github.com/signalwire/signalwire-js/commit/ec2ca1d05e2e531d6d46ffccf5e01ecb9def5a1d), [`499f62a`](https://github.com/signalwire/signalwire-js/commit/499f62a7a02fe023a197aa950cbda975ef4509b0), [`f494e05`](https://github.com/signalwire/signalwire-js/commit/f494e05a28e013d29431c93690d2382db8df96e8), [`94b7363`](https://github.com/signalwire/signalwire-js/commit/94b7363da35f153dbdcc6d55e37cc81222c5f9fa)]:
  - @signalwire/core@3.4.0
  - @signalwire/webrtc@3.2.0

## [3.5.0] - 2021-11-02

### Added

- [#327](https://github.com/signalwire/signalwire-js/pull/327) [`fa40510`](https://github.com/signalwire/signalwire-js/commit/fa4051009213028955a043fedcfb7109da2e6f4b) - Added `setHideVideoMuted` to RoomSession interface.

- [#343](https://github.com/signalwire/signalwire-js/pull/343) [`9df995b`](https://github.com/signalwire/signalwire-js/commit/9df995b437fdf8703af16f91b0362d313732ff25) - Included a complete method documentation for the SDK

### Changed

- [#351](https://github.com/signalwire/signalwire-js/pull/351) [`0e22ac8`](https://github.com/signalwire/signalwire-js/commit/0e22ac8dd3aedf8189276df42910e2ddb5f583bb) - Always attach the audio track regardless the `rootElement` option.

- [#327](https://github.com/signalwire/signalwire-js/pull/327) [`fa40510`](https://github.com/signalwire/signalwire-js/commit/fa4051009213028955a043fedcfb7109da2e6f4b) - Improved internal typings for the Video namespace.

### Fixed

- [#346](https://github.com/signalwire/signalwire-js/pull/346) [`ea0cef3`](https://github.com/signalwire/signalwire-js/commit/ea0cef3f3d7da2d5b709786313d830a9af43dd5b) - Fix possible race condition on RoomSession `join()` method.

- [#337](https://github.com/signalwire/signalwire-js/pull/337) [`ccc0d35`](https://github.com/signalwire/signalwire-js/commit/ccc0d35e4103cc85f9689f4ef125b213b3a05b24) - Fix a possible race condition when applying the localVideo overlay.

### Dependencies

- Updated dependencies [[`2360ef7`](https://github.com/signalwire/signalwire-js/commit/2360ef77915497072d4428aacf0595d9713a614e), [`a1bc095`](https://github.com/signalwire/signalwire-js/commit/a1bc095c22b9d2823208b6fddfbfd785803430de), [`bae6985`](https://github.com/signalwire/signalwire-js/commit/bae69856f67aa339c02e074fc936048f2cc7bc7b), [`fa40510`](https://github.com/signalwire/signalwire-js/commit/fa4051009213028955a043fedcfb7109da2e6f4b)]:
  - @signalwire/webrtc@3.1.6
  - @signalwire/core@3.3.0

## [3.4.0] - 2021-10-12

### Added

- [#297](https://github.com/signalwire/signalwire-js/pull/297) [`2675e5e`](https://github.com/signalwire/signalwire-js/commit/2675e5ea1ce9247a9e9b525cacf365cb8e4374ca) - Add support for the Playback APIs: `roomSession.play()` and the `RoomSessionPlayback` object to control it.

### Dependencies

- Updated dependencies [[`7d183de`](https://github.com/signalwire/signalwire-js/commit/7d183de47bae0e1f436609ab63704ec1888134a8), [`2675e5e`](https://github.com/signalwire/signalwire-js/commit/2675e5ea1ce9247a9e9b525cacf365cb8e4374ca)]:
  - @signalwire/core@3.2.0
  - @signalwire/webrtc@3.1.5

## [3.3.0] - 2021-10-06

### Deprecated

- [#318](https://github.com/signalwire/signalwire-js/pull/318) [`cc5fd62`](https://github.com/signalwire/signalwire-js/commit/cc5fd6227689855e6b4127c537f7ac77b3f75c7f) - Deprecated `Room`, `RoomDevice`, `RoomScreenShare` and `createScreenShareObject()` in favour of `RoomSession`, `RoomSessionDevice`, `RoomSessionScreenShare` and `startScreenShare()` respectively.

### Changed

- [#313](https://github.com/signalwire/signalwire-js/pull/313) [`5c35910`](https://github.com/signalwire/signalwire-js/commit/5c3591034abee66519ffa6593bb1a50144ec0d7c) - Introduce `RoomSession` as a new primitive for connecting to a Room. Mark `createRoomObject()` and `joinRoom()` as deprecated.

* [#312](https://github.com/signalwire/signalwire-js/pull/312) [`feb23ba`](https://github.com/signalwire/signalwire-js/commit/feb23ba7e7545fa4e298cfb371538c223d75c272) - Remove `height: 100%` on the localVideo overlay to avoid positioning issues if the wrapper has a fixed height.

- [#302](https://github.com/signalwire/signalwire-js/pull/302) [`2ac7f6d`](https://github.com/signalwire/signalwire-js/commit/2ac7f6defeb9a1a2a4254c300a15c258f8a57cd7) - Added `setInputVolume`/`setOutputVolume` and marked `setMicrophoneVolume`/`setSpeakerVolume` as deprecated.

* [#316](https://github.com/signalwire/signalwire-js/pull/316) [`ab4ff5a`](https://github.com/signalwire/signalwire-js/commit/ab4ff5a094f3f53f388d905c103b023d5d2b435b) - Use `rootElement` in the new `RoomSession` constructor to handle the local video overlay.

- [#305](https://github.com/signalwire/signalwire-js/pull/305) [`cec54bd`](https://github.com/signalwire/signalwire-js/commit/cec54bd208801f42a719a7777da802ae2c51a79a) - Convert timestamp properties to `Date` objects.

### Dependencies

- Updated dependencies [[`3af0ea6`](https://github.com/signalwire/signalwire-js/commit/3af0ea6ee53ea9e5009e5e36c7e7418833730159), [`72eb91b`](https://github.com/signalwire/signalwire-js/commit/72eb91bd74a046fa720868a4b43e6154d7a076f0), [`2ac7f6d`](https://github.com/signalwire/signalwire-js/commit/2ac7f6defeb9a1a2a4254c300a15c258f8a57cd7), [`cec54bd`](https://github.com/signalwire/signalwire-js/commit/cec54bd208801f42a719a7777da802ae2c51a79a), [`febb842`](https://github.com/signalwire/signalwire-js/commit/febb84202568fde1b94558c8b470ba9e348f1aa4), [`b60e9fc`](https://github.com/signalwire/signalwire-js/commit/b60e9fcea7f1f308efcc78081cb3fb61c60ae522), [`da9909e`](https://github.com/signalwire/signalwire-js/commit/da9909ec37b470ef5d34c494147bb49bef6a748e), [`4d21716`](https://github.com/signalwire/signalwire-js/commit/4d2171661dcf2a9ebd5bb6b6daa5c32a78dfa21f), [`49b4aa9`](https://github.com/signalwire/signalwire-js/commit/49b4aa9d127df0d52512b6c44359fc7b7b88caae), [`685e0a2`](https://github.com/signalwire/signalwire-js/commit/685e0a240bec5ee065f8fde91879c476768e4c1f)]:
  - @signalwire/core@3.1.4
  - @signalwire/webrtc@3.1.4

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
