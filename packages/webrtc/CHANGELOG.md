# @signalwire/webrtc

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
