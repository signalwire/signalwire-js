# @sw-internal/playground-realtime-api

## 0.2.0

### Minor Changes

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Expose the `Voice.createPlaylist()` method to simplify playing media on a Voice Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to record audio in `Voice` Call.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to prompt for digits or speech using `prompt()` in `Voice` Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Expose the `Voice.createDialer()` method to simplify dialing devices on a Voice Call.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to play media in `Voice` Call.

* [#471](https://github.com/signalwire/signalwire-js/pull/471) [`cf845603`](https://github.com/signalwire/signalwire-js/commit/cf8456031c4ba3adea0b8369d1fac7e2fed407b8) - [internal] Add playground and e2e tests for Task namespace

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to connect and disconnect legs in `Voice` namespace.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to tap audio in `Voice` Call.

- [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to start detectors for machine/digit/fax in `Voice` Call.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add `waitForEnded()` method to the CallPlayback component to easily wait for playbacks to end.

- [#472](https://github.com/signalwire/signalwire-js/pull/472) [`76e92dd9`](https://github.com/signalwire/signalwire-js/commit/76e92dd95abc32dee4e4add8ad6397b8d3216293) - [internal] Add playground for Messaging namespace

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Add ability to receive inbound Calls in the `Voice` namespace.

### Patch Changes

- [#491](https://github.com/signalwire/signalwire-js/pull/491) [`0b98a9e4`](https://github.com/signalwire/signalwire-js/commit/0b98a9e48b751d244abea92fea4cd79e92dfc0b7) - Expose `disconnect()` from Messaging and Task Client objects.

* [#536](https://github.com/signalwire/signalwire-js/pull/536) [`a6e27d88`](https://github.com/signalwire/signalwire-js/commit/a6e27d883527c987b9c5945232e62fcc17762ee0) - Fix calling.call.received event handler

- [#501](https://github.com/signalwire/signalwire-js/pull/501) [`5c96bf85`](https://github.com/signalwire/signalwire-js/commit/5c96bf85a0d584d8467450144b0bbe97c863a571) - [internal] Review parsing of nested fields in our EE transform pipeline

* [#521](https://github.com/signalwire/signalwire-js/pull/521) [`70b5b38d`](https://github.com/signalwire/signalwire-js/commit/70b5b38d915bd1e785bcedd2b6bdecbeb78476c5) - [internal] upgrade to latest esbuild / esbuild-register

- [#499](https://github.com/signalwire/signalwire-js/pull/499) [`19ffe276`](https://github.com/signalwire/signalwire-js/commit/19ffe2766c682131c9153a57d7998c51005f8b6d) - [internal] Make `context` optional in Messaging `send()` method.

* [#477](https://github.com/signalwire/signalwire-js/pull/477) [`c6beec6d`](https://github.com/signalwire/signalwire-js/commit/c6beec6d3ebd28bffd475f2c8e9a625b2bdcf8ee) - Migrate `createDialer` and `createPlaylist` to Dialer and Playlist constructors

- [#539](https://github.com/signalwire/signalwire-js/pull/539) [`4c0909dd`](https://github.com/signalwire/signalwire-js/commit/4c0909ddb57b86bb0216af0c83d37f11a0e54754) - Rename Call method `waitUntilConnected` to `waitForDisconnected` and expose `disconnect` on the VoiceClient

## 0.1.1

### Patch Changes

- [#464](https://github.com/signalwire/signalwire-js/pull/464) [`2c8fc597`](https://github.com/signalwire/signalwire-js/commit/2c8fc59719e7f40c1d9b01ebf67190d358dcea46) - [internal] upgrade dependencies

## 0.1.0

### Minor Changes

- [#411](https://github.com/signalwire/signalwire-js/pull/411) [`f6290de0`](https://github.com/signalwire/signalwire-js/commit/f6290de05c32debef71482e61a27e5385ff81253) - [internal] add option to listen to session.auth_error, add new API for instantiating the Video client on realtime-api
