# @sw-internal/playground-js

## 0.0.9

### Patch Changes

- [#672](https://github.com/signalwire/signalwire-js/pull/672) [`8dc3d43a`](https://github.com/signalwire/signalwire-js/commit/8dc3d43acc79ae8b309535df27848033513ed03e) - Use a `ResizeObserver` to detect rootElement changes and adapt the MCU.

## 0.0.8

### Patch Changes

- [#645](https://github.com/signalwire/signalwire-js/pull/645) [`c76d6387`](https://github.com/signalwire/signalwire-js/commit/c76d638753678421680b183468f3bf2ad5932a41) - Add check for `room.left` in screenShare objects.

* [#641](https://github.com/signalwire/signalwire-js/pull/641) [`569213c8`](https://github.com/signalwire/signalwire-js/commit/569213c874b30d7c1452eb56775ee5aa9d370252) - Update playground-js to allow resize of the rootElement.

## 0.0.7

### Patch Changes

- [#594](https://github.com/signalwire/signalwire-js/pull/594) [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120) - Refactoring to allow multiple RTCPeer instances on a BaseConnection.

## 0.0.6

### Patch Changes

- [#596](https://github.com/signalwire/signalwire-js/pull/596) [`6bc89d81`](https://github.com/signalwire/signalwire-js/commit/6bc89d81fe6ffa7530f60ed90482db1e7a39d6ac) - [internal] Add `PubSub` playground and e2e-tests.

## 0.0.5

### Patch Changes

- [#587](https://github.com/signalwire/signalwire-js/pull/587) [`4300716e`](https://github.com/signalwire/signalwire-js/commit/4300716e57c83584dcfdd10ecddb8e1121084269) - Restore the UI when the server removes the user from the room

## 0.0.4

### Patch Changes

- [#512](https://github.com/signalwire/signalwire-js/pull/512) [`f69ef584`](https://github.com/signalwire/signalwire-js/commit/f69ef5848eebf8c4c1901fda5ea1d3c8a92b6a84) - [internal] fix parse nested fields

* [#520](https://github.com/signalwire/signalwire-js/pull/520) [`2c3145b7`](https://github.com/signalwire/signalwire-js/commit/2c3145b70379a5b4f66b362b98e75900fce32a9c) - Fix `getDevicesWithPermissions` for Firefox.

- [#501](https://github.com/signalwire/signalwire-js/pull/501) [`5c96bf85`](https://github.com/signalwire/signalwire-js/commit/5c96bf85a0d584d8467450144b0bbe97c863a571) - [internal] Review parsing of nested fields in our EE transform pipeline

* [#506](https://github.com/signalwire/signalwire-js/pull/506) [`05bb3c31`](https://github.com/signalwire/signalwire-js/commit/05bb3c31fc7527c17814535b59e926db09d34f43) - [internal] Skip BaseComponents and Proxies in toExternalJSON

## 0.0.3

### Patch Changes

- [#401](https://github.com/signalwire/signalwire-js/pull/401) [`46600032`](https://github.com/signalwire/signalwire-js/commit/466000329e146b39fbf809ff6f31c727f780e592) - Add `layout` and `positions` when starting a screenShare.

* [#464](https://github.com/signalwire/signalwire-js/pull/464) [`2c8fc597`](https://github.com/signalwire/signalwire-js/commit/2c8fc59719e7f40c1d9b01ebf67190d358dcea46) - [internal] upgrade dependencies

- [#418](https://github.com/signalwire/signalwire-js/pull/418) [`a8036381`](https://github.com/signalwire/signalwire-js/commit/a803638111de02e5174f47e661477fe5b2f4e092) - Add ability to reinvite media on the BaseConnection

## 0.0.2

### Patch Changes

- [#413](https://github.com/signalwire/signalwire-js/pull/413) [`603d4497`](https://github.com/signalwire/signalwire-js/commit/603d4497ac777c063167ce6481b0ddf5c715ae3c) - Rename Chat publish param from 'message' to 'content' for consistency

* [#424](https://github.com/signalwire/signalwire-js/pull/424) [`743168df`](https://github.com/signalwire/signalwire-js/commit/743168df0abef04960e18bba70474f489e1d36ce) - Expose `updateToken` to the Chat.Client to allow renew tokens for a chat session.

## 0.0.1

### Patch Changes

- [#398](https://github.com/signalwire/signalwire-js/pull/398) [`da52634`](https://github.com/signalwire/signalwire-js/commit/da526347cdd0503635ff9ae8cab6a7eaef334da4) - [internal] Update chat playground with channel history
