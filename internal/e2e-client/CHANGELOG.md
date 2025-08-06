# @sw-internal/e2e-client

## 0.0.20

### Patch Changes

- Updated dependencies [[`3b215de44f757d2ee76f38868f33d33f3bf5d9b8`](https://github.com/signalwire/signalwire-js/commit/3b215de44f757d2ee76f38868f33d33f3bf5d9b8), [`92461cf2dd3e1c89e15568dc9f0c516784f9b75d`](https://github.com/signalwire/signalwire-js/commit/92461cf2dd3e1c89e15568dc9f0c516784f9b75d)]:
  - @signalwire/client@0.0.1

## 0.0.20-dev.202506111650.ad2f5be.0

### Patch Changes

- [#1202](https://github.com/signalwire/signalwire-js/pull/1202) [`4668e16e659d2ce4fd60816efdd566bf96e0b338`](https://github.com/signalwire/signalwire-js/commit/4668e16e659d2ce4fd60816efdd566bf96e0b338) Thanks [@ayeminag](https://github.com/ayeminag)! - Temporarily disabled convo api tests

- [#1203](https://github.com/signalwire/signalwire-js/pull/1203) [`d40076940941f5e7629bacb522800f6ca8f91501`](https://github.com/signalwire/signalwire-js/commit/d40076940941f5e7629bacb522800f6ca8f91501) Thanks [@giavac](https://github.com/giavac)! - Re-enable Conversation Room e2e tests

- [#1216](https://github.com/signalwire/signalwire-js/pull/1216) [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - CHANGED improved the handling of WebSockets reconnections.

- [#1210](https://github.com/signalwire/signalwire-js/pull/1210) [`8852aa801f8b02b649324a85c7c6f202082ea1a8`](https://github.com/signalwire/signalwire-js/commit/8852aa801f8b02b649324a85c7c6f202082ea1a8) Thanks [@ayeminag](https://github.com/ayeminag)! - Fix conversation spec by making sure promise doesn't resolve on call logs conversation.message and also allow for GET messages response assert to include more than 2 messages in case they include call logs

- [#1223](https://github.com/signalwire/signalwire-js/pull/1223) [`eb0d8f72a42342ddadadc83b9dfe5d3cc1602167`](https://github.com/signalwire/signalwire-js/commit/eb0d8f72a42342ddadadc83b9dfe5d3cc1602167) Thanks [@ayeminag](https://github.com/ayeminag)! - Temporarily disable status webhook callback tests

- [#1218](https://github.com/signalwire/signalwire-js/pull/1218) [`d46203af06c672956fb4a69fa384d9f1d61768b6`](https://github.com/signalwire/signalwire-js/commit/d46203af06c672956fb4a69fa384d9f1d61768b6) Thanks [@ayeminag](https://github.com/ayeminag)! - Added call status webhook test in v2Webrtc suite

- [#1204](https://github.com/signalwire/signalwire-js/pull/1204) [`ad803cb5ec225a776b1576ed035ab260bf243772`](https://github.com/signalwire/signalwire-js/commit/ad803cb5ec225a776b1576ed035ab260bf243772) Thanks [@ayeminag](https://github.com/ayeminag)! - Renabled callfabric/conversation.spec.ts test suite

- [#1216](https://github.com/signalwire/signalwire-js/pull/1216) [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Fix CF network re-connections

- [#1225](https://github.com/signalwire/signalwire-js/pull/1225) [`d042c35bc1575e2f0fe2dbc36e4fdc11420a4b01`](https://github.com/signalwire/signalwire-js/commit/d042c35bc1575e2f0fe2dbc36e4fdc11420a4b01) Thanks [@ayeminag](https://github.com/ayeminag)! - Re-enable v2WebrtcFromRest's status callback tests and added better error handling and retry logic for zrok process

## 0.0.19

### Patch Changes

- [#1102](https://github.com/signalwire/signalwire-js/pull/1102) [`d90911ce3cad4fdba8cd03ac23c191cd644395cb`](https://github.com/signalwire/signalwire-js/commit/d90911ce3cad4fdba8cd03ac23c191cd644395cb) Thanks [@giavac](https://github.com/giavac)! - Improve v2 webrtc e2e tests to detected media timeouts

- [#1067](https://github.com/signalwire/signalwire-js/pull/1067) [`3d67c972f920277befcb3b16c6329851f8ccc146`](https://github.com/signalwire/signalwire-js/commit/3d67c972f920277befcb3b16c6329851f8ccc146) Thanks [@giavac](https://github.com/giavac)! - v2 webrtc e2e test, log response body of failed REST API request, add a test expecting a 422

- [#1176](https://github.com/signalwire/signalwire-js/pull/1176) [`185a10dbe83c017f15b9c57ef48fabfa384515b2`](https://github.com/signalwire/signalwire-js/commit/185a10dbe83c017f15b9c57ef48fabfa384515b2) Thanks [@ayeminag](https://github.com/ayeminag)! - fixed flakey roomSettings.spec.ts

## 0.0.18

### Patch Changes

- [#1027](https://github.com/signalwire/signalwire-js/pull/1027) [`c76f535c`](https://github.com/signalwire/signalwire-js/commit/c76f535c03e2bf18762ead2c2cd506426fa066c0) Thanks [@giavac](https://github.com/giavac)! - e2e tests for Call Fabric, relax expectation on Room Name

- [#1053](https://github.com/signalwire/signalwire-js/pull/1053) [`d4014a2b`](https://github.com/signalwire/signalwire-js/commit/d4014a2bc8288a746e2763da0844b52731c8b2a8) Thanks [@giavac](https://github.com/giavac)! - Relax condition on expected packets, refactor that logic

## 0.0.17

### Patch Changes

- [#985](https://github.com/signalwire/signalwire-js/pull/985) [`82f8461a`](https://github.com/signalwire/signalwire-js/commit/82f8461a8785932dbd5ce89a52be6f6d4bd1ea4e) Thanks [@giavac](https://github.com/giavac)! - call fabric e2e test, relayApp, ignore totalAudioEnergy if undefined

- [#980](https://github.com/signalwire/signalwire-js/pull/980) [`2f8549eb`](https://github.com/signalwire/signalwire-js/commit/2f8549eb1df2e612fb55e4af0e0c1aad3e783ee8) Thanks [@giavac](https://github.com/giavac)! - Review and add e2e tests for v2 webrtc

- [#981](https://github.com/signalwire/signalwire-js/pull/981) [`533c0311`](https://github.com/signalwire/signalwire-js/commit/533c0311369ea5a22263b23657e0a9c013b38bc5) Thanks [@giavac](https://github.com/giavac)! - Refine v2 e2e tests, RTCStats usage

- [#998](https://github.com/signalwire/signalwire-js/pull/998) [`5dd95132`](https://github.com/signalwire/signalwire-js/commit/5dd95132e02db8457946ddbeecdff4961277a6fe) Thanks [@giavac](https://github.com/giavac)! - Fix last remaining checks for totalAudioEnergy

## 0.0.16

### Patch Changes

- [#884](https://github.com/signalwire/signalwire-js/pull/884) [`e5db7cab`](https://github.com/signalwire/signalwire-js/commit/e5db7cabc2e532a19fad45753e47f7d612d6e248) Thanks [@edolix](https://github.com/edolix)! - Update E2E tests for lock unlock rooms

- [#900](https://github.com/signalwire/signalwire-js/pull/900) [`80cd3252`](https://github.com/signalwire/signalwire-js/commit/80cd32526f97a2db71c786f5bc700f300fce820d) Thanks [@iAmmar7](https://github.com/iAmmar7)! - End to end test cases for call fabric with video room and swml script

## 0.0.15

### Patch Changes

- [#860](https://github.com/signalwire/signalwire-js/pull/860) [`19f8673f`](https://github.com/signalwire/signalwire-js/commit/19f8673fd6cdd736b1013fb247afe4cd757aa596) - Improve e2e-tests for the browser sDK

- [#874](https://github.com/signalwire/signalwire-js/pull/874) [`774bed8b`](https://github.com/signalwire/signalwire-js/commit/774bed8b650478d070668c8b533c196cf9bec6ad) - Review CI setup

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Remove event emitter transform pipeline from browser SDK

- Updated dependencies [[`114bc825`](https://github.com/signalwire/signalwire-js/commit/114bc8255c7929a6bb3ac99fa3f69fbd469bd4c8), [`6c435be2`](https://github.com/signalwire/signalwire-js/commit/6c435be2738ec4a70c8acfada282b829b551ec82)]:
  - @sw-internal/playground-js@0.0.15

## 0.0.14

### Patch Changes

- Updated dependencies [[`a7ae5448`](https://github.com/signalwire/signalwire-js/commit/a7ae5448d0327d68bc4f6c158ac2fe8e8417a581), [`a7a0eb98`](https://github.com/signalwire/signalwire-js/commit/a7a0eb989cd52972ed4b401bde0b960e15fb2b8a)]:
  - @sw-internal/playground-js@0.0.14

## 0.0.13

### Patch Changes

- Updated dependencies [[`65b0eea5`](https://github.com/signalwire/signalwire-js/commit/65b0eea54346b177e94fd3960e8cc21579c8a9ce)]:
  - @sw-internal/playground-js@0.0.13

## 0.0.12

### Patch Changes

- Updated dependencies [[`c72e7ce4`](https://github.com/signalwire/signalwire-js/commit/c72e7ce4536910a5915000b3a88e2be064fa32a4)]:
  - @sw-internal/playground-js@0.0.12

## 0.0.11

### Patch Changes

- [#776](https://github.com/signalwire/signalwire-js/pull/776) [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431) - [internal] Review playground and e2e tests for the EmitterTransform refactoring

## 0.0.10

### Patch Changes

- Updated dependencies [[`5be0c97a`](https://github.com/signalwire/signalwire-js/commit/5be0c97ab88206d6219c3536dc63e592652fc180)]:
  - @sw-internal/playground-js@0.0.11

## 0.0.9

### Patch Changes

- [#691](https://github.com/signalwire/signalwire-js/pull/691) [`72b3f65f`](https://github.com/signalwire/signalwire-js/commit/72b3f65fcf2d7fb6325fdbf2d6bb71266c694b90) - [internal] check memberId stable across promote/demote process

- [#681](https://github.com/signalwire/signalwire-js/pull/681) [`bb6ecbf4`](https://github.com/signalwire/signalwire-js/commit/bb6ecbf4574ee72f0e4e8e7b42b5ccc832042fff) - [internal] Review promote/demote e2e tests.

- [#673](https://github.com/signalwire/signalwire-js/pull/673) [`6c4d4b3d`](https://github.com/signalwire/signalwire-js/commit/6c4d4b3dbba722537653a9f6b11fb516c107d5f2) - Add `interactivityMode` to the RoomSession object.

## 0.0.8

### Patch Changes

- [#701](https://github.com/signalwire/signalwire-js/pull/701) [`a9ae0323`](https://github.com/signalwire/signalwire-js/commit/a9ae0323b8906fd61669cfafd6dcc6faa212e307) - Add tests for remove_at and remove_after_seconds_elapsed

- [#755](https://github.com/signalwire/signalwire-js/pull/755) [`09bd387d`](https://github.com/signalwire/signalwire-js/commit/09bd387d022e4124f4ed4ef9a159bdbebe31775a) - Remove usage of `reattach` flag

- [#695](https://github.com/signalwire/signalwire-js/pull/695) [`1aba6e37`](https://github.com/signalwire/signalwire-js/commit/1aba6e37abdbf5b5f9e9ee4a5d32e0e46cbed4b6) - [internal] add e2e test for join_from.

- [#715](https://github.com/signalwire/signalwire-js/pull/715) [`d8fa0053`](https://github.com/signalwire/signalwire-js/commit/d8fa005300e57c4616f87bda1b17688c0a3f35b1) - [internal] e2e dx improvement

- [#729](https://github.com/signalwire/signalwire-js/pull/729) [`41482813`](https://github.com/signalwire/signalwire-js/commit/414828131a81f5bf2e57d786d8002d96e25f7597) - [internal] Update playground and e2e tests for resume

- [#702](https://github.com/signalwire/signalwire-js/pull/702) [`20b0d38c`](https://github.com/signalwire/signalwire-js/commit/20b0d38cf564fe38d72d23ec2aa74e7d6d6a590d) - [internal] improve how we run playwright and upgrade it.

- [#700](https://github.com/signalwire/signalwire-js/pull/700) [`b16076cb`](https://github.com/signalwire/signalwire-js/commit/b16076cbacb102edbe5afdae3db550c0cca43e3a) - tests for initial layout and record-on-start

- Updated dependencies [[`b774abc3`](https://github.com/signalwire/signalwire-js/commit/b774abc3128250c97121c0808688b3f4ae043c5f), [`09bd387d`](https://github.com/signalwire/signalwire-js/commit/09bd387d022e4124f4ed4ef9a159bdbebe31775a), [`41482813`](https://github.com/signalwire/signalwire-js/commit/414828131a81f5bf2e57d786d8002d96e25f7597), [`95325ec9`](https://github.com/signalwire/signalwire-js/commit/95325ec9d1f3c98bd478eb799abefb1dabbd7759)]:
  - @sw-internal/playground-js@0.0.10

## 0.0.7

### Patch Changes

- [#687](https://github.com/signalwire/signalwire-js/pull/687) [`bfb25ed2`](https://github.com/signalwire/signalwire-js/commit/bfb25ed28873dc283c6829d804ea4b25d4247f91) - [internal] dry a bit our e2e tests setup.

* Updated dependencies [[`8dc3d43a`](https://github.com/signalwire/signalwire-js/commit/8dc3d43acc79ae8b309535df27848033513ed03e)]:
  - @sw-internal/playground-js@0.0.9

## 0.0.6

### Patch Changes

- [#656](https://github.com/signalwire/signalwire-js/pull/656) [`8132100c`](https://github.com/signalwire/signalwire-js/commit/8132100cb237dfe69136ef175c235690cfe577db) - Add e2e tests for Chat and disconnect method for PubSub.

## 0.0.5

### Patch Changes

- [#645](https://github.com/signalwire/signalwire-js/pull/645) [`c76d6387`](https://github.com/signalwire/signalwire-js/commit/c76d638753678421680b183468f3bf2ad5932a41) - Add check for `room.left` in screenShare objects.

* [#633](https://github.com/signalwire/signalwire-js/pull/633) [`f1102bb6`](https://github.com/signalwire/signalwire-js/commit/f1102bb6817f119b2f7b063c7e1e5ab2be4e8ec5) - Add e2e for the Stream APIs.

- [#637](https://github.com/signalwire/signalwire-js/pull/637) [`5c3abab6`](https://github.com/signalwire/signalwire-js/commit/5c3abab6f2b9e47b17417f4378898cf240d12dba) - [internal] Tests now throw errors if/when config values are missing.

- Updated dependencies [[`c76d6387`](https://github.com/signalwire/signalwire-js/commit/c76d638753678421680b183468f3bf2ad5932a41), [`569213c8`](https://github.com/signalwire/signalwire-js/commit/569213c874b30d7c1452eb56775ee5aa9d370252)]:
  - @sw-internal/playground-js@0.0.8

## 0.0.4

### Patch Changes

- Updated dependencies [[`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120)]:
  - @sw-internal/playground-js@0.0.7

## 0.0.3

### Patch Changes

- [#598](https://github.com/signalwire/signalwire-js/pull/598) [`06d16780`](https://github.com/signalwire/signalwire-js/commit/06d1678074b72cbfcd26d098d90c8a3b7f406469) - [internal] added sw-test to e2e-client and e2e-realtime-api

* [#596](https://github.com/signalwire/signalwire-js/pull/596) [`6bc89d81`](https://github.com/signalwire/signalwire-js/commit/6bc89d81fe6ffa7530f60ed90482db1e7a39d6ac) - [internal] Add `PubSub` playground and e2e-tests.

* Updated dependencies [[`6bc89d81`](https://github.com/signalwire/signalwire-js/commit/6bc89d81fe6ffa7530f60ed90482db1e7a39d6ac)]:
  - @sw-internal/playground-js@0.0.6

## 0.0.2

### Patch Changes

- Updated dependencies [[`4300716e`](https://github.com/signalwire/signalwire-js/commit/4300716e57c83584dcfdd10ecddb8e1121084269)]:
  - @sw-internal/playground-js@0.0.5

## 0.0.1

### Patch Changes

- [#565](https://github.com/signalwire/signalwire-js/pull/565) [`500b506c`](https://github.com/signalwire/signalwire-js/commit/500b506cc6204d711a3e3b56727c84b00caedfe3) - [internal] add E2E setup for js
