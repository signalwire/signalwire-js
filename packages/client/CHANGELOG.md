# @signalwire/js

## 3.29.0-dev.202506111650.ad2f5be.0

### Minor Changes

- [#1180](https://github.com/signalwire/signalwire-js/pull/1180) [`bb4b96f96315a9e89ae8df147ca4d1c9650e0944`](https://github.com/signalwire/signalwire-js/commit/bb4b96f96315a9e89ae8df147ca4d1c9650e0944) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Added API request retries by default

- [#1216](https://github.com/signalwire/signalwire-js/pull/1216) [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - CHANGED improved the handling of WebSockets reconnections.

- [#1217](https://github.com/signalwire/signalwire-js/pull/1217) [`b999b0bf8502b3e72ef2412a7f5d435f2791dc45`](https://github.com/signalwire/signalwire-js/commit/b999b0bf8502b3e72ef2412a7f5d435f2791dc45) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Allow users to pass the `fromFabricAddressId` while dialing

  ```ts
  const call = await client.dial({
    .....,
    to: .....,
    fromFabricAddressId: 'valid_subscriber_id', // Optional
    ...
  })
  ```

- [#1214](https://github.com/signalwire/signalwire-js/pull/1214) [`dcc5a7cc59a818d342a9df40f68873e19d8c42eb`](https://github.com/signalwire/signalwire-js/commit/dcc5a7cc59a818d342a9df40f68873e19d8c42eb) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Support default media params

  ```ts
  await call.dial({
    applyLocalVideoOverlay: false, // Should the SDK apply local video overlay? Default: true
    applyMemberOverlay: true, // Should the SDK apply member video overlays? Default: true
    stopCameraWhileMuted: true, // Should the SDK stop the camera when muted? Default: true
    stopMicrophoneWhileMuted: true, // Should the SDK stop the mic when muted? Default: true
    mirrorLocalVideoOverlay: false, // Should the SDK mirror the local video overlay? Default: true
  })
  ```

### Patch Changes

- [#1220](https://github.com/signalwire/signalwire-js/pull/1220) [`faabb0f929a63289ad345f87b7d7c1f83d71de70`](https://github.com/signalwire/signalwire-js/commit/faabb0f929a63289ad345f87b7d7c1f83d71de70) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - CF SDK: Optional `incomingCallHandler` parameter to `handlePushNotification()`

- [#1201](https://github.com/signalwire/signalwire-js/pull/1201) [`b1d63f14c5dabbf0f26fb894ab0bb474a62c5767`](https://github.com/signalwire/signalwire-js/commit/b1d63f14c5dabbf0f26fb894ab0bb474a62c5767) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Video & CF SDK:

  - Exposes a `cameraConstraints` and `microphoneConstraints` on the room/call object.

  CF SDK:

  - Introduces a validation proxy for the `CallSession` class.
  - Introduces a `CapabilityError` for the errors based on the missing capability.
  - Fixes the `setOutputVolume` API for Call Fabric.
  - Fixes the `setInputSensitivity` API param for Call Fabric.

- [#1199](https://github.com/signalwire/signalwire-js/pull/1199) [`fcfc862cecaaaaa5c7257af5b402321c952c728d`](https://github.com/signalwire/signalwire-js/commit/fcfc862cecaaaaa5c7257af5b402321c952c728d) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - CF SDK: Fix Raise Hand call and member capability.

- [#1200](https://github.com/signalwire/signalwire-js/pull/1200) [`3d01d9663a4994c8cf42b2a1fac3bd2ca5371687`](https://github.com/signalwire/signalwire-js/commit/3d01d9663a4994c8cf42b2a1fac3bd2ca5371687) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Fix the `getAddresses` TS contract with internal refactoring

- [#1191](https://github.com/signalwire/signalwire-js/pull/1191) [`ea433428084da537a0f20debd43f58b95f2ed2cb`](https://github.com/signalwire/signalwire-js/commit/ea433428084da537a0f20debd43f58b95f2ed2cb) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - resolves the user_name from the getChatMessages API

- [#1198](https://github.com/signalwire/signalwire-js/pull/1198) [`42ebbf935141f3a306f4d1993ab41ada69b932d9`](https://github.com/signalwire/signalwire-js/commit/42ebbf935141f3a306f4d1993ab41ada69b932d9) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - CF SDK: Changed the type of the error param for the `expectedErrorHandler` internal handler

- [#1208](https://github.com/signalwire/signalwire-js/pull/1208) [`65ff8c4b49052c9fccc77672766753b6225c79ce`](https://github.com/signalwire/signalwire-js/commit/65ff8c4b49052c9fccc77672766753b6225c79ce) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK(bug): Include the missing Pagination type

- [#1216](https://github.com/signalwire/signalwire-js/pull/1216) [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Fix CF network re-connections

- [#1197](https://github.com/signalwire/signalwire-js/pull/1197) [`dd983ecad6c560373cd76f99603904d2834c10b9`](https://github.com/signalwire/signalwire-js/commit/dd983ecad6c560373cd76f99603904d2834c10b9) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - refactored gatChatMeassages to prevent multiple lookup of the same address

- Updated dependencies [[`bb4b96f96315a9e89ae8df147ca4d1c9650e0944`](https://github.com/signalwire/signalwire-js/commit/bb4b96f96315a9e89ae8df147ca4d1c9650e0944), [`b1d63f14c5dabbf0f26fb894ab0bb474a62c5767`](https://github.com/signalwire/signalwire-js/commit/b1d63f14c5dabbf0f26fb894ab0bb474a62c5767), [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06), [`3c389671b35d1a57fd6be3f8c793be36f8294795`](https://github.com/signalwire/signalwire-js/commit/3c389671b35d1a57fd6be3f8c793be36f8294795), [`b999b0bf8502b3e72ef2412a7f5d435f2791dc45`](https://github.com/signalwire/signalwire-js/commit/b999b0bf8502b3e72ef2412a7f5d435f2791dc45), [`3d01d9663a4994c8cf42b2a1fac3bd2ca5371687`](https://github.com/signalwire/signalwire-js/commit/3d01d9663a4994c8cf42b2a1fac3bd2ca5371687), [`42ebbf935141f3a306f4d1993ab41ada69b932d9`](https://github.com/signalwire/signalwire-js/commit/42ebbf935141f3a306f4d1993ab41ada69b932d9), [`ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06`](https://github.com/signalwire/signalwire-js/commit/ad2f5be0cb97b3d3325ba11a0b3a9fb0e2970f06)]:
  - @signalwire/core@4.3.0-dev.202506111650.ad2f5be.0
  - @signalwire/webrtc@3.14.0-dev.202506111650.ad2f5be.0

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.28.1] - 2025-03-04

### Added

- [#1089](https://github.com/signalwire/signalwire-js/pull/1089) [`d34f3360163292aedb3474ffc9f7e2017b9d0002`](https://github.com/signalwire/signalwire-js/commit/d34f3360163292aedb3474ffc9f7e2017b9d0002) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - ADD lock and unlock methods to CallCallSession

- [#1130](https://github.com/signalwire/signalwire-js/pull/1130) [`fca4c09ac531ab88dec9d94f3a73d5cd06060d36`](https://github.com/signalwire/signalwire-js/commit/fca4c09ac531ab88dec9d94f3a73d5cd06060d36) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Introduce the set member position API

- [#1133](https://github.com/signalwire/signalwire-js/pull/1133) [`b3b17aa944212ee744f7ec518ab8663dae2380c2`](https://github.com/signalwire/signalwire-js/commit/b3b17aa944212ee744f7ec518ab8663dae2380c2) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Create and expose member overlays on top of Video element

- [#1121](https://github.com/signalwire/signalwire-js/pull/1121) [`ed8d713ab9c399bcc335a147d499248d44c72468`](https://github.com/signalwire/signalwire-js/commit/ed8d713ab9c399bcc335a147d499248d44c72468) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Allow user to raise/lower thier hand

- [#1082](https://github.com/signalwire/signalwire-js/pull/1082) [`fcb722a9f831359d3a05f9d53282c825dc749fa2`](https://github.com/signalwire/signalwire-js/commit/fcb722a9f831359d3a05f9d53282c825dc749fa2) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Added chat namespace with convenience methods to to handle chat messages

- [#1059](https://github.com/signalwire/signalwire-js/pull/1059) [`616f84048c52e1f5e9f38e6f2d2f8d90196a1b4a`](https://github.com/signalwire/signalwire-js/commit/616f84048c52e1f5e9f38e6f2d2f8d90196a1b4a) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - ADDED reattach method to Call Fabric client

- [#1123](https://github.com/signalwire/signalwire-js/pull/1123) [`76e573f46553337990c397693985e5004eeecae1`](https://github.com/signalwire/signalwire-js/commit/76e573f46553337990c397693985e5004eeecae1) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Expose room layout on the `CallFabriRoomSession` object

- [#1116](https://github.com/signalwire/signalwire-js/pull/1116) [`00a94f1aa70be61732b3673893903f4066880e44`](https://github.com/signalwire/signalwire-js/commit/00a94f1aa70be61732b3673893903f4066880e44) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Add sort parameters to GetAddressesParams allowing developers to benefit from server-side sorting.

- [#1061](https://github.com/signalwire/signalwire-js/pull/1061) [`beb8f52012ad5f717ee8bfcb1c5a92b115f66d93`](https://github.com/signalwire/signalwire-js/commit/beb8f52012ad5f717ee8bfcb1c5a92b115f66d93) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - ADDED userVariables param to DialOption and WSClientOtions

- [#1137](https://github.com/signalwire/signalwire-js/pull/1137) [`2dc5db84d40b7224c641371727881c0319c002d1`](https://github.com/signalwire/signalwire-js/commit/2dc5db84d40b7224c641371727881c0319c002d1) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Call Fabric and Video SDK: Introduce update media APIs with renegotiation

  ```ts
  await updateMedia({
    audio: {
      direction: 'sendonly' | 'sendrecv',
      constraints?: MediaTrackConstraints
    },
    video: {
      direction: 'recvonly' | 'inactive'
      constraints?: MediaTrackConstraints
    }
  })

  // Either "audio" or "video" is required with "direction" property.
  // The "constraints" can only be passed if the "direction" is either "sendrecv" or "sendonly".

  await setVideoDirection('sendonly' | 'sendrecv' | 'recvonly' | 'inactive')

  await setAudioDirection('sendonly' | 'sendrecv' | 'recvonly' | 'inactive')
  ```

- [#1087](https://github.com/signalwire/signalwire-js/pull/1087) [`06f35804752f615f4e0aaeda9631d63770301977`](https://github.com/signalwire/signalwire-js/commit/06f35804752f615f4e0aaeda9631d63770301977) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Include the screen share feature inside the CF room

- [#1097](https://github.com/signalwire/signalwire-js/pull/1097) [`b5007832098cdc0505326a8aa306e9671fb96674`](https://github.com/signalwire/signalwire-js/commit/b5007832098cdc0505326a8aa306e9671fb96674) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Add Conversations Join API

- [#1103](https://github.com/signalwire/signalwire-js/pull/1103) [`fe44c5d48782e569f942a63afe627cd503da2c87`](https://github.com/signalwire/signalwire-js/commit/fe44c5d48782e569f942a63afe627cd503da2c87) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Add a new `name` parameter to `client.address.getAddress`, allowing you to fetch an address by name.

### Changed

- [#1069](https://github.com/signalwire/signalwire-js/pull/1069) [`fe5c4cca5c3dd14f0dc3af0579231973e57717f6`](https://github.com/signalwire/signalwire-js/commit/fe5c4cca5c3dd14f0dc3af0579231973e57717f6) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Remove implicit reauthentication

- [#1150](https://github.com/signalwire/signalwire-js/pull/1150) [`ee3728e338979c59bae876d806a5506237ceb062`](https://github.com/signalwire/signalwire-js/commit/ee3728e338979c59bae876d806a5506237ceb062) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Dial the audio-only call by default

- [#1107](https://github.com/signalwire/signalwire-js/pull/1107) [`4d7f9728619a29b502e27655b856ce341ad0aadd`](https://github.com/signalwire/signalwire-js/commit/4d7f9728619a29b502e27655b856ce341ad0aadd) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Give high priority to user params

- [#1146](https://github.com/signalwire/signalwire-js/pull/1146) [`75f81c204c30b18bce6f03d4778c90cbe8d3c38a`](https://github.com/signalwire/signalwire-js/commit/75f81c204c30b18bce6f03d4778c90cbe8d3c38a) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Allow user to subscribe to all conversation events

- [#1166](https://github.com/signalwire/signalwire-js/pull/1166) [`0a43dc4aad1d224c2ee732ffb7b4333e5287d3e9`](https://github.com/signalwire/signalwire-js/commit/0a43dc4aad1d224c2ee732ffb7b4333e5287d3e9) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Expose all events on the client object for internal usage

- [#1120](https://github.com/signalwire/signalwire-js/pull/1120) [`30fae885d5132be6ac697b725b5d630daf69a391`](https://github.com/signalwire/signalwire-js/commit/30fae885d5132be6ac697b725b5d630daf69a391) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Throw error from `startScreenShare` method if permission is denied

- [#1134](https://github.com/signalwire/signalwire-js/pull/1134) [`736ec0e18cef1cd4a73aa2d9b6793041900e21b4`](https://github.com/signalwire/signalwire-js/commit/736ec0e18cef1cd4a73aa2d9b6793041900e21b4) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Expose the `InternalVideoLayoutLayer`

- [#1091](https://github.com/signalwire/signalwire-js/pull/1091) [`632ec5b53ad232c99368c3c59beb5d9cd7d14f61`](https://github.com/signalwire/signalwire-js/commit/632ec5b53ad232c99368c3c59beb5d9cd7d14f61) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Browser SDKs: Expose `enumerateDevicesByKind`

- [#1083](https://github.com/signalwire/signalwire-js/pull/1083) [`2ef7d5eb845fa033c3c816ffc5e0c29a69a59335`](https://github.com/signalwire/signalwire-js/commit/2ef7d5eb845fa033c3c816ffc5e0c29a69a59335) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Expose CallCallSession type

- [#1104](https://github.com/signalwire/signalwire-js/pull/1104) [`d257907065d529c38a81f5484e33c01a9cfabea5`](https://github.com/signalwire/signalwire-js/commit/d257907065d529c38a81f5484e33c01a9cfabea5) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Expose the `addressId` from the Conversation contract

- [#1106](https://github.com/signalwire/signalwire-js/pull/1106) [`c2b754e54fbbefcb38606015bec8709554265e04`](https://github.com/signalwire/signalwire-js/commit/c2b754e54fbbefcb38606015bec8709554265e04) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Allow user to set the negotiate audio/video param

- [#1170](https://github.com/signalwire/signalwire-js/pull/1170) [`32ae8cb6391c91e8d9e8aa38524c6a188ea9d747`](https://github.com/signalwire/signalwire-js/commit/32ae8cb6391c91e8d9e8aa38524c6a188ea9d747) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Refacterd and moved call capabilites types and helpers from core to js

- [#1179](https://github.com/signalwire/signalwire-js/pull/1179) [`03698cda4dfa0f474cd347ee0c628817d52cd3ad`](https://github.com/signalwire/signalwire-js/commit/03698cda4dfa0f474cd347ee0c628817d52cd3ad) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Pass complete destination resource address

- [#1143](https://github.com/signalwire/signalwire-js/pull/1143) [`f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc`](https://github.com/signalwire/signalwire-js/commit/f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Updated ConversationMessage GetAddressResponse ConversationMessage GetSubscriberInfoResponse with new properties

- [#1108](https://github.com/signalwire/signalwire-js/pull/1108) [`4499da9532ae8486b8fc8959c8cc8c9a16756283`](https://github.com/signalwire/signalwire-js/commit/4499da9532ae8486b8fc8959c8cc8c9a16756283) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Allow user unsubscribe from the conversation subscribe API

- [#1124](https://github.com/signalwire/signalwire-js/pull/1124) [`ada6c49538862f466dea659286ea8eb405f4f636`](https://github.com/signalwire/signalwire-js/commit/ada6c49538862f466dea659286ea8eb405f4f636) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce dedicated types for Video and Fabric SDKs

### Fixed

- [#1096](https://github.com/signalwire/signalwire-js/pull/1096) [`7130138f9dcd750bc2d9f9bee0d644a2e02425c6`](https://github.com/signalwire/signalwire-js/commit/7130138f9dcd750bc2d9f9bee0d644a2e02425c6) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix type interface in Message event

- [#1094](https://github.com/signalwire/signalwire-js/pull/1094) [`449f1fc151881c23f472104c3bf7361d19aa2bf0`](https://github.com/signalwire/signalwire-js/commit/449f1fc151881c23f472104c3bf7361d19aa2bf0) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix resource types

- [#1129](https://github.com/signalwire/signalwire-js/pull/1129) [`df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4`](https://github.com/signalwire/signalwire-js/commit/df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF & Video SDKs: Fix layout event parameter type

- [#1159](https://github.com/signalwire/signalwire-js/pull/1159) [`461943a395d9a40a10658c906447398bff7ec160`](https://github.com/signalwire/signalwire-js/commit/461943a395d9a40a10658c906447398bff7ec160) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Maintain the session connection state

- [#1136](https://github.com/signalwire/signalwire-js/pull/1136) [`209f47f30987989c5a642c2733066026940c5569`](https://github.com/signalwire/signalwire-js/commit/209f47f30987989c5a642c2733066026940c5569) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - - fix the get chat messages filter for the next and previous pages

  - normalize the getAddress return

- [#1093](https://github.com/signalwire/signalwire-js/pull/1093) [`bcc83b9314309dd39c1e64d958b193b1c7476542`](https://github.com/signalwire/signalwire-js/commit/bcc83b9314309dd39c1e64d958b193b1c7476542) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix CallFabric types

- [#1158](https://github.com/signalwire/signalwire-js/pull/1158) [`347df7e4691e3bc8d5736ebc8fac475775ab7b99`](https://github.com/signalwire/signalwire-js/commit/347df7e4691e3bc8d5736ebc8fac475775ab7b99) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Fix the Conversation types typo

- [#1095](https://github.com/signalwire/signalwire-js/pull/1095) [`db072e479d9b30ae7aa952c819220eda60f329bb`](https://github.com/signalwire/signalwire-js/commit/db072e479d9b30ae7aa952c819220eda60f329bb) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix message event type

- [#1101](https://github.com/signalwire/signalwire-js/pull/1101) [`62ba0f61c670837356b4d76be615e2f7afe39a56`](https://github.com/signalwire/signalwire-js/commit/62ba0f61c670837356b4d76be615e2f7afe39a56) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - FIX Call Fabric local muted/unmute

- [#1100](https://github.com/signalwire/signalwire-js/pull/1100) [`96066d60caf9512e1d5658b09c441d9c55b06c23`](https://github.com/signalwire/signalwire-js/commit/96066d60caf9512e1d5658b09c441d9c55b06c23) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix types name typo

- [#1092](https://github.com/signalwire/signalwire-js/pull/1092) [`a2682371fc53c2526f40530b9c9e706397da1a8d`](https://github.com/signalwire/signalwire-js/commit/a2682371fc53c2526f40530b9c9e706397da1a8d) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix Conversation API types

- [#1160](https://github.com/signalwire/signalwire-js/pull/1160) [`fd39f12ca49f9257933b59490c64563e3391a93a`](https://github.com/signalwire/signalwire-js/commit/fd39f12ca49f9257933b59490c64563e3391a93a) Thanks [@iAmmar7](https://github.com/iAmmar7)! - - Fix session emitter

  - Make SignalWire a singelton for Call Fabric SDK
  - Fix memory leak

### Dependencies

- Updated dependencies [[`7130138f9dcd750bc2d9f9bee0d644a2e02425c6`](https://github.com/signalwire/signalwire-js/commit/7130138f9dcd750bc2d9f9bee0d644a2e02425c6), [`df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4`](https://github.com/signalwire/signalwire-js/commit/df6377b2ae19bc4ad7b96fc26cf4a71ae51713c4), [`461943a395d9a40a10658c906447398bff7ec160`](https://github.com/signalwire/signalwire-js/commit/461943a395d9a40a10658c906447398bff7ec160), [`d34f3360163292aedb3474ffc9f7e2017b9d0002`](https://github.com/signalwire/signalwire-js/commit/d34f3360163292aedb3474ffc9f7e2017b9d0002), [`fca4c09ac531ab88dec9d94f3a73d5cd06060d36`](https://github.com/signalwire/signalwire-js/commit/fca4c09ac531ab88dec9d94f3a73d5cd06060d36), [`5e4539144f31ff154e3e295e57d939e86dee0840`](https://github.com/signalwire/signalwire-js/commit/5e4539144f31ff154e3e295e57d939e86dee0840), [`fe5c4cca5c3dd14f0dc3af0579231973e57717f6`](https://github.com/signalwire/signalwire-js/commit/fe5c4cca5c3dd14f0dc3af0579231973e57717f6), [`d88cb49838b3dfd90046afdeb6900b8be0c2bd36`](https://github.com/signalwire/signalwire-js/commit/d88cb49838b3dfd90046afdeb6900b8be0c2bd36), [`ed8d713ab9c399bcc335a147d499248d44c72468`](https://github.com/signalwire/signalwire-js/commit/ed8d713ab9c399bcc335a147d499248d44c72468), [`fcb722a9f831359d3a05f9d53282c825dc749fa2`](https://github.com/signalwire/signalwire-js/commit/fcb722a9f831359d3a05f9d53282c825dc749fa2), [`84aaad9b4837739f87b3dd1de99a14eb1123653f`](https://github.com/signalwire/signalwire-js/commit/84aaad9b4837739f87b3dd1de99a14eb1123653f), [`616f84048c52e1f5e9f38e6f2d2f8d90196a1b4a`](https://github.com/signalwire/signalwire-js/commit/616f84048c52e1f5e9f38e6f2d2f8d90196a1b4a), [`76e573f46553337990c397693985e5004eeecae1`](https://github.com/signalwire/signalwire-js/commit/76e573f46553337990c397693985e5004eeecae1), [`db072e479d9b30ae7aa952c819220eda60f329bb`](https://github.com/signalwire/signalwire-js/commit/db072e479d9b30ae7aa952c819220eda60f329bb), [`aca483d46cfdc4e7bcef288c804a6bbe86b02611`](https://github.com/signalwire/signalwire-js/commit/aca483d46cfdc4e7bcef288c804a6bbe86b02611), [`16499a4d075d893ad432a5bdbafac950a08edc26`](https://github.com/signalwire/signalwire-js/commit/16499a4d075d893ad432a5bdbafac950a08edc26), [`a2682371fc53c2526f40530b9c9e706397da1a8d`](https://github.com/signalwire/signalwire-js/commit/a2682371fc53c2526f40530b9c9e706397da1a8d), [`32ae8cb6391c91e8d9e8aa38524c6a188ea9d747`](https://github.com/signalwire/signalwire-js/commit/32ae8cb6391c91e8d9e8aa38524c6a188ea9d747), [`3d0fe342a5dfb34814b376bf62b370f0bf57bfac`](https://github.com/signalwire/signalwire-js/commit/3d0fe342a5dfb34814b376bf62b370f0bf57bfac), [`fd39f12ca49f9257933b59490c64563e3391a93a`](https://github.com/signalwire/signalwire-js/commit/fd39f12ca49f9257933b59490c64563e3391a93a), [`f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc`](https://github.com/signalwire/signalwire-js/commit/f24b5fdb2aefcc60a3b07754a1f4842ffe995dcc), [`2dc5db84d40b7224c641371727881c0319c002d1`](https://github.com/signalwire/signalwire-js/commit/2dc5db84d40b7224c641371727881c0319c002d1), [`ada6c49538862f466dea659286ea8eb405f4f636`](https://github.com/signalwire/signalwire-js/commit/ada6c49538862f466dea659286ea8eb405f4f636)]:
  - @signalwire/core@4.2.1
  - @signalwire/webrtc@3.13.1

## [3.28.0] - 2025-01-21 (Accidental Release — DO NOT USE)

> **Note:** This version was published by mistake and should not be used.
> Please upgrade directly to `3.28.1` or higher.

## [3.27.0] - 2024-06-03

### Added

- [#956](https://github.com/signalwire/signalwire-js/pull/956) [`e16ec479`](https://github.com/signalwire/signalwire-js/commit/e16ec479be85b40f989aba2e3bae932fd9eb59d9) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce Conversation API with Conversation Subscriber

- [#1001](https://github.com/signalwire/signalwire-js/pull/1001) [`968d226b`](https://github.com/signalwire/signalwire-js/commit/968d226ba2791f44dea4bd1b0d173aefaf103bda) Thanks [@ayeminag](https://github.com/ayeminag)! - - API to fetch address by id and tests

- [#977](https://github.com/signalwire/signalwire-js/pull/977) [`19281d4a`](https://github.com/signalwire/signalwire-js/commit/19281d4a42dc7ae3a9239768a2de6e6da91f0287) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - NEW - by default the SDK will use the full width for the video call in both orientations.

- [#979](https://github.com/signalwire/signalwire-js/pull/979) [`8667fdcc`](https://github.com/signalwire/signalwire-js/commit/8667fdccba8730edc66b01bcaf15a8ac82d73c15) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Changed API for handling incoming call over WebSocket and PushNotification

- [#979](https://github.com/signalwire/signalwire-js/pull/979) [`8667fdcc`](https://github.com/signalwire/signalwire-js/commit/8667fdccba8730edc66b01bcaf15a8ac82d73c15) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Changed dial() and accept() functions now can receive a rootElement to render the call video

- [#995](https://github.com/signalwire/signalwire-js/pull/995) [`c370fec8`](https://github.com/signalwire/signalwire-js/commit/c370fec84e86701d8baf8910aebf1e959dcedc85) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Fetch subscriber info function

- [#973](https://github.com/signalwire/signalwire-js/pull/973) [`c8deacef`](https://github.com/signalwire/signalwire-js/commit/c8deacef19176b7f744b61b9fe454556f0eccd52) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Online/offline registeration for WebRTC endpoint

- [#1052](https://github.com/signalwire/signalwire-js/pull/1052) [`36423414`](https://github.com/signalwire/signalwire-js/commit/364234142d66da73086478ffb62421be3dbfc405) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce the standalone `buildVideoElement` method to render the video element

- [#968](https://github.com/signalwire/signalwire-js/pull/968) [`82bdfb9c`](https://github.com/signalwire/signalwire-js/commit/82bdfb9ce143aca15042bb4ce02460bc93fecb21) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - NEW emits `member.joined` events for all members in a `call.joined` event

- [#999](https://github.com/signalwire/signalwire-js/pull/999) [`6d71362b`](https://github.com/signalwire/signalwire-js/commit/6d71362b589439fe3b4f234f4ff98871f8d98a20) Thanks [@ayeminag](https://github.com/ayeminag)! - - `client.conversations.sendMessage()`
  - `conversation.sendMessage()` API for conversation object returned from `getConversations()` API
  - `conversation.getMessages()` API for conversation object returned from `getConversations()`
  - added e2e tests for conversation (room)

### Changed

- [#1012](https://github.com/signalwire/signalwire-js/pull/1012) [`45991e4c`](https://github.com/signalwire/signalwire-js/commit/45991e4c23065028b8e55af3c61faaf7661a8baf) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Cleanup unified eventing

- [#975](https://github.com/signalwire/signalwire-js/pull/975) [`6c1b4293`](https://github.com/signalwire/signalwire-js/commit/6c1b429341209a3b2a62e82390bf34f5f35a0c36) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Export Call Fabric types

- [#988](https://github.com/signalwire/signalwire-js/pull/988) [`78f46be4`](https://github.com/signalwire/signalwire-js/commit/78f46be4743ef32a358d7975556e08eb40de69a4) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Allow user pass video audio constraints

- [#1054](https://github.com/signalwire/signalwire-js/pull/1054) [`dd0c693f`](https://github.com/signalwire/signalwire-js/commit/dd0c693f72d7f2d60ecf7eda9b5ae86a58248986) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Fix layout and member list actions

- [#982](https://github.com/signalwire/signalwire-js/pull/982) [`ded3dc7a`](https://github.com/signalwire/signalwire-js/commit/ded3dc7a71977460d19fc623c3f2745f5365fb7b) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: OAuth refresh token

- [#996](https://github.com/signalwire/signalwire-js/pull/996) [`006a13e3`](https://github.com/signalwire/signalwire-js/commit/006a13e36b5531609e145b184970330db547e006) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Expose conversation event params

- [#1047](https://github.com/signalwire/signalwire-js/pull/1047) [`6135cf54`](https://github.com/signalwire/signalwire-js/commit/6135cf54944a3daca3b3e1a5c95cd03cfd20fc3d) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Fix dial method return type

- [#978](https://github.com/signalwire/signalwire-js/pull/978) [`0f4f2b3c`](https://github.com/signalwire/signalwire-js/commit/0f4f2b3cbf788a259baf5543fe82bbfc8b2540b7) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce pageSize param for Conversation APIs

- [#966](https://github.com/signalwire/signalwire-js/pull/966) [`45dbb9dd`](https://github.com/signalwire/signalwire-js/commit/45dbb9dde5c71638bc36a3f65736dde1b35d3c20) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - Only emits self member updates with the original self.member_id. That is to prevent the application to be exposed to internal self member versions on each call segment.

- [#1058](https://github.com/signalwire/signalwire-js/pull/1058) [`1ff74249`](https://github.com/signalwire/signalwire-js/commit/1ff742493cf27e7d31d3e9cb5757443859e79509) Thanks [@ayeminag](https://github.com/ayeminag)! - - Parse `to` parameter in `dial` request to detect `channel=audio|video` and negotiate media accordingly.

  - Added e2e test

- [#1030](https://github.com/signalwire/signalwire-js/pull/1030) [`254016f3`](https://github.com/signalwire/signalwire-js/commit/254016f396ce89cda82585b6ef9bb3f0e5b9135c) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Destroy the workers after a successful verto.bye

- [#1002](https://github.com/signalwire/signalwire-js/pull/1002) [`55b8c51a`](https://github.com/signalwire/signalwire-js/commit/55b8c51aeb8bcb3147aee22aeb5a8555c71d847f) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - FIXED connects to before sending the online request

- [#1003](https://github.com/signalwire/signalwire-js/pull/1003) [`3a37e0a9`](https://github.com/signalwire/signalwire-js/commit/3a37e0a99300412210f3a934834044405c189da4) Thanks [@ayeminag](https://github.com/ayeminag)! - - fix Conversation.test.ts

- [#1046](https://github.com/signalwire/signalwire-js/pull/1046) [`7a5b9d1d`](https://github.com/signalwire/signalwire-js/commit/7a5b9d1d6628d086b805f557169fe6a4e4890dac) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - FIX return types of the `online`, `offline`, and `dial` methods
  FIX handling of the optional `rootElement` param

- [#994](https://github.com/signalwire/signalwire-js/pull/994) [`553efcdd`](https://github.com/signalwire/signalwire-js/commit/553efcdde3d0bf7d970107d7b0320ea141fb063c) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Expsose Call Fabric types

- [#992](https://github.com/signalwire/signalwire-js/pull/992) [`3d20672b`](https://github.com/signalwire/signalwire-js/commit/3d20672bbf2247b35e7d3ee8524a904fae1e6b2a) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix room session id usage in room worker

- [#983](https://github.com/signalwire/signalwire-js/pull/983) [`3d6a4fbe`](https://github.com/signalwire/signalwire-js/commit/3d6a4fbe4364a5795233d2aac87ba309d9d34bdd) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce CallSegment and CallFabric worker

- [#960](https://github.com/signalwire/signalwire-js/pull/960) [`184c8777`](https://github.com/signalwire/signalwire-js/commit/184c8777d1891985ab6bccbf417938e0dae5041f) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce member instance in CF SDK

- [#1055](https://github.com/signalwire/signalwire-js/pull/1055) [`e76c89c7`](https://github.com/signalwire/signalwire-js/commit/e76c89c73dba33d481212f7785cdf7650dbe4351) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Fix the outbound audio/video streams

- [#1050](https://github.com/signalwire/signalwire-js/pull/1050) [`229320b3`](https://github.com/signalwire/signalwire-js/commit/229320b3a105690bcb5c7271bc516d6269a1ca76) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introducing Call Fabric client

- [#1017](https://github.com/signalwire/signalwire-js/pull/1017) [`d215ef5d`](https://github.com/signalwire/signalwire-js/commit/d215ef5d1501f5f3df4e5d3837ac740f42649c2e) Thanks [@iAmmar7](https://github.com/iAmmar7)! - CF SDK: Improve the action invoke strategy

- [#965](https://github.com/signalwire/signalwire-js/pull/965) [`a08512a3`](https://github.com/signalwire/signalwire-js/commit/a08512a3a4f3a6fd1d0faf643f3c481ca668abc4) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Page size for Address API

### Dependencies

- Updated dependencies [[`45991e4c`](https://github.com/signalwire/signalwire-js/commit/45991e4c23065028b8e55af3c61faaf7661a8baf), [`e16ec479`](https://github.com/signalwire/signalwire-js/commit/e16ec479be85b40f989aba2e3bae932fd9eb59d9), [`968d226b`](https://github.com/signalwire/signalwire-js/commit/968d226ba2791f44dea4bd1b0d173aefaf103bda), [`ded3dc7a`](https://github.com/signalwire/signalwire-js/commit/ded3dc7a71977460d19fc623c3f2745f5365fb7b), [`0f4f2b3c`](https://github.com/signalwire/signalwire-js/commit/0f4f2b3cbf788a259baf5543fe82bbfc8b2540b7), [`254016f3`](https://github.com/signalwire/signalwire-js/commit/254016f396ce89cda82585b6ef9bb3f0e5b9135c), [`c370fec8`](https://github.com/signalwire/signalwire-js/commit/c370fec84e86701d8baf8910aebf1e959dcedc85), [`3d20672b`](https://github.com/signalwire/signalwire-js/commit/3d20672bbf2247b35e7d3ee8524a904fae1e6b2a), [`3d6a4fbe`](https://github.com/signalwire/signalwire-js/commit/3d6a4fbe4364a5795233d2aac87ba309d9d34bdd), [`184c8777`](https://github.com/signalwire/signalwire-js/commit/184c8777d1891985ab6bccbf417938e0dae5041f), [`c8deacef`](https://github.com/signalwire/signalwire-js/commit/c8deacef19176b7f744b61b9fe454556f0eccd52), [`e76c89c7`](https://github.com/signalwire/signalwire-js/commit/e76c89c73dba33d481212f7785cdf7650dbe4351), [`229320b3`](https://github.com/signalwire/signalwire-js/commit/229320b3a105690bcb5c7271bc516d6269a1ca76), [`d215ef5d`](https://github.com/signalwire/signalwire-js/commit/d215ef5d1501f5f3df4e5d3837ac740f42649c2e), [`a08512a3`](https://github.com/signalwire/signalwire-js/commit/a08512a3a4f3a6fd1d0faf643f3c481ca668abc4), [`6d71362b`](https://github.com/signalwire/signalwire-js/commit/6d71362b589439fe3b4f234f4ff98871f8d98a20)]:
  - @signalwire/core@4.1.0
  - @signalwire/webrtc@3.12.1

## [3.26.0] - 2024-04-17

### Added

- [#932](https://github.com/signalwire/signalwire-js/pull/932) [`6b0f8227`](https://github.com/signalwire/signalwire-js/commit/6b0f82271c0029c6f136a20e5b9326bdd9abab48) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Allow users to pass the optional `disableUdpIceServers` boolean flag with a value of `true` to remove the URLs of UDP transport ICE servers.

  Default value for `disableUdpIceServers` is `false`

  Call Fabric SDK:

  ```js
  import { SignalWire } from '@signalwire/js'

  const client = await SignalWire({
     host: ...,
     token: ...,
     rootElement: ...,
     disableUdpIceServers: true|false, // default is false
  })
  ```

  Video SDK:

  ```js
  import { Video } from '@signalwire/js'

  const roomSession = new Video.RoomSession({
     host: ...,
     token: ...,
     rootElement: ...,
     disableUdpIceServers: true|false, // default is false
  })
  ```

### Changed

- [#948](https://github.com/signalwire/signalwire-js/pull/948) [`6cb639bf`](https://github.com/signalwire/signalwire-js/commit/6cb639bf6dcbacefd71615ec99c4911cbbd120c4) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Allow user to pass filters to `getAddress` function

  ```js
  const addressData = await client.getAddresses({
    type: 'room',
    displayName: 'domain app',
  })
  ```

- [#961](https://github.com/signalwire/signalwire-js/pull/961) [`b6e30de2`](https://github.com/signalwire/signalwire-js/commit/b6e30de2f1bdae486304b294768e0bfe1d091f17) Thanks [@jpsantosbh](https://github.com/jpsantosbh)! - FIXED HTTPClient should use the ch header from the JWT token for the host domain

- Updated dependencies [[`03f01c36`](https://github.com/signalwire/signalwire-js/commit/03f01c36b3f1244e4eed4188610e67955c7ba9ce), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`6cb639bf`](https://github.com/signalwire/signalwire-js/commit/6cb639bf6dcbacefd71615ec99c4911cbbd120c4), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`d93c3af4`](https://github.com/signalwire/signalwire-js/commit/d93c3af430db1580de204d8da9906a2220951049), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`6b0f8227`](https://github.com/signalwire/signalwire-js/commit/6b0f82271c0029c6f136a20e5b9326bdd9abab48), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99), [`b39b82fe`](https://github.com/signalwire/signalwire-js/commit/b39b82feed94950ef21883ba9dfe8c8f25220b99)]:
  - @signalwire/core@4.0.0
  - @signalwire/webrtc@3.12.0

## [3.25.1] - 2023-12-05

### Added

- [#919](https://github.com/signalwire/signalwire-js/pull/919) [`b7af58bd`](https://github.com/signalwire/signalwire-js/commit/b7af58bd1f21313ec290b2489851d6776b8b5fc8) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Expose Chat types from the JS SDK

## [3.25.0] - 2023-11-23

### Added

- [#873](https://github.com/signalwire/signalwire-js/pull/873) [`6c9d2aa5`](https://github.com/signalwire/signalwire-js/commit/6c9d2aa5f5c8d7b07d955a2c6e2ab647a62bd702) Thanks [@iAmmar7](https://github.com/iAmmar7)! - Introduce the hand raise API for the Video SDKs (browser and realtime-api)

### Fixed

- Updated dependencies [[`d564c379`](https://github.com/signalwire/signalwire-js/commit/d564c379e10d23c21abb56b3e740aff70fc451b9), [`4ee7b6f8`](https://github.com/signalwire/signalwire-js/commit/4ee7b6f852e650c1828decda2429ebec79576085), [`6c9d2aa5`](https://github.com/signalwire/signalwire-js/commit/6c9d2aa5f5c8d7b07d955a2c6e2ab647a62bd702)]:
  - @signalwire/core@3.21.0
  - @signalwire/webrtc@3.11.0

## [3.24.0] - 2023-11-07

### Added

- [#884](https://github.com/signalwire/signalwire-js/pull/884) [`e5db7cab`](https://github.com/signalwire/signalwire-js/commit/e5db7cabc2e532a19fad45753e47f7d612d6e248) Thanks [@edolix](https://github.com/edolix)! - Add support for `lock` and `unlock` RoomSessions.

### Dependencies

- Updated dependencies [[`e5db7cab`](https://github.com/signalwire/signalwire-js/commit/e5db7cabc2e532a19fad45753e47f7d612d6e248), [`bcced8ae`](https://github.com/signalwire/signalwire-js/commit/bcced8ae774de5483331c4d3146299d5ffffd7e7), [`2131bb41`](https://github.com/signalwire/signalwire-js/commit/2131bb418afeb75081fb2bfaee3b00a24df4614f)]:
  - @signalwire/core@3.20.0
  - @signalwire/webrtc@3.10.4

## [3.23.4] - 2023-09-14

### Changed

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Enhance shared function between realtime and browser SDK

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Introduce the session emitter and eliminate the global emitter

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Eliminate the multicast pubsub channel

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Attach listeners without the namespace prefix

- [#861](https://github.com/signalwire/signalwire-js/pull/861) [`4f42179e`](https://github.com/signalwire/signalwire-js/commit/4f42179e54960e343458994424dfef7a8aee907e) - Add `object-fit: cover` to the local video overlay element

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the SDK by removing applyEmitterTransform

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Cleanup the global emitter

- [#853](https://github.com/signalwire/signalwire-js/pull/853) [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea) - Remove event emitter transform pipeline from browser SDK

- [#865](https://github.com/signalwire/signalwire-js/pull/865) [`6c435be2`](https://github.com/signalwire/signalwire-js/commit/6c435be2738ec4a70c8acfada282b829b551ec82) - Expose `destroy` event for inbound calls in Call Fabric to handle cases where the caller cancel the dial before the callee answers.

- [#876](https://github.com/signalwire/signalwire-js/pull/876) [`e5db0ef9`](https://github.com/signalwire/signalwire-js/commit/e5db0ef95325d3578b8729c15e8bfca5b7a4cb3a) - Bump supported node version to at least 16

### Dependencies

- Updated dependencies [[`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`1086a1b0`](https://github.com/signalwire/signalwire-js/commit/1086a1b0dae256bb44858f16c24494aba8cdfc3e), [`be17e614`](https://github.com/signalwire/signalwire-js/commit/be17e614edd560a8578daf380dff1205e0032db3), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`fb45dce7`](https://github.com/signalwire/signalwire-js/commit/fb45dce7f57a99533df445b4e1cda9587a1f3eb4), [`2a9b88d9`](https://github.com/signalwire/signalwire-js/commit/2a9b88d92c61fbf9e317234e860c34081c49c235), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`5e1ff117`](https://github.com/signalwire/signalwire-js/commit/5e1ff117cf84c6058b08863b578be885b7fb37ea), [`6c435be2`](https://github.com/signalwire/signalwire-js/commit/6c435be2738ec4a70c8acfada282b829b551ec82), [`e5db0ef9`](https://github.com/signalwire/signalwire-js/commit/e5db0ef95325d3578b8729c15e8bfca5b7a4cb3a)]:
  - @signalwire/webrtc@3.10.3
  - @signalwire/core@3.19.0

## [3.23.3] - 2023-08-17

### Changed

- [#858](https://github.com/signalwire/signalwire-js/pull/858) [`bb50b2fb`](https://github.com/signalwire/signalwire-js/commit/bb50b2fb31c6bb016e355b6884d2c2cb11260170) - Fix custom CloseEvent implementation to avoid crash on WS close.

### Dependencies

- Updated dependencies [[`bb50b2fb`](https://github.com/signalwire/signalwire-js/commit/bb50b2fb31c6bb016e355b6884d2c2cb11260170)]:
  - @signalwire/core@3.18.3
  - @signalwire/webrtc@3.10.2

## [3.23.2] - 2023-08-08

### Dependencies

- Updated dependencies [[`af7072b7`](https://github.com/signalwire/signalwire-js/commit/af7072b7415940b9ef00bb2d35b3ed6b6ba979a5)]:
  - @signalwire/core@3.18.2
  - @signalwire/webrtc@3.10.1

## [3.23.1] - 2023-07-26

### Changed

- [#836](https://github.com/signalwire/signalwire-js/pull/836) [`a7a0eb98`](https://github.com/signalwire/signalwire-js/commit/a7a0eb989cd52972ed4b401bde0b960e15fb2b8a) - [cf] Return the Call object without join it to allow attaching event listeners

### Dependencies

- Updated dependencies [[`81beb29a`](https://github.com/signalwire/signalwire-js/commit/81beb29a9bc3c6135df37223fae44445967c1a84), [`a7ae5448`](https://github.com/signalwire/signalwire-js/commit/a7ae5448d0327d68bc4f6c158ac2fe8e8417a581), [`2a2049ba`](https://github.com/signalwire/signalwire-js/commit/2a2049ba37ea786395d9552789f55d00172f165f)]:
  - @signalwire/core@3.18.1
  - @signalwire/webrtc@3.10.0

## [3.23.0] - 2023-07-19

### Added

- [#822](https://github.com/signalwire/signalwire-js/pull/822) [`65b0eea5`](https://github.com/signalwire/signalwire-js/commit/65b0eea54346b177e94fd3960e8cc21579c8a9ce) - Initial changes to setup a `SignalWire` client.

### Changed

- [#825](https://github.com/signalwire/signalwire-js/pull/825) [`b44bd6fb`](https://github.com/signalwire/signalwire-js/commit/b44bd6fbd69acd206e43b5b1fefbe7989dc16298) - Added support for user-defined refresh token function to update SAT

### Dependencies

- Updated dependencies [[`b44bd6fb`](https://github.com/signalwire/signalwire-js/commit/b44bd6fbd69acd206e43b5b1fefbe7989dc16298), [`b9283059`](https://github.com/signalwire/signalwire-js/commit/b9283059f7f6633d9b28061efc46dab3bbf31d04), [`6a35f0a3`](https://github.com/signalwire/signalwire-js/commit/6a35f0a38071160a82f766bd8b73b4718f04108f), [`65b0eea5`](https://github.com/signalwire/signalwire-js/commit/65b0eea54346b177e94fd3960e8cc21579c8a9ce), [`f03e60a3`](https://github.com/signalwire/signalwire-js/commit/f03e60a3d2e27403fa14560697bb0ce20918f310)]:
  - @signalwire/core@3.18.0
  - @signalwire/webrtc@3.9.0

## [3.22.0] - 2023-07-07

### Added

- [#805](https://github.com/signalwire/signalwire-js/pull/805) [`e8141c0e`](https://github.com/signalwire/signalwire-js/commit/e8141c0e85e11477e2911e6eccb1e96cff860d58) - Events to keep track of the connected devices status

### Changed

- [#819](https://github.com/signalwire/signalwire-js/pull/819) [`f814685b`](https://github.com/signalwire/signalwire-js/commit/f814685b24964c89510aad687d10f172265c0424) - Improve support for React Native.

- [#757](https://github.com/signalwire/signalwire-js/pull/757) [`c72e7ce4`](https://github.com/signalwire/signalwire-js/commit/c72e7ce4536910a5915000b3a88e2be064fa32a4) - Initial internal changes to support CF calling.

### Dependencies

- Updated dependencies [[`f814685b`](https://github.com/signalwire/signalwire-js/commit/f814685b24964c89510aad687d10f172265c0424), [`c72e7ce4`](https://github.com/signalwire/signalwire-js/commit/c72e7ce4536910a5915000b3a88e2be064fa32a4), [`e8141c0e`](https://github.com/signalwire/signalwire-js/commit/e8141c0e85e11477e2911e6eccb1e96cff860d58), [`4e1116b6`](https://github.com/signalwire/signalwire-js/commit/4e1116b606ad41dc649c44eccf4f8b28d0dfa7d8)]:
  - @signalwire/webrtc@3.8.0
  - @signalwire/core@3.17.0

## [3.21.0] - 2023-05-22

### Added

- [#798](https://github.com/signalwire/signalwire-js/pull/798) [`aaa07479`](https://github.com/signalwire/signalwire-js/commit/aaa07479db10685e72d96ea43927d759dbac076e) - Allow user to set the local media stream

### Changed

- [#811](https://github.com/signalwire/signalwire-js/pull/811) [`f3711f17`](https://github.com/signalwire/signalwire-js/commit/f3711f1726a9001a4204527b34b452de80e9a0e6) - Improve reconnection under bad network conditions.

### Dependencies

- Updated dependencies [[`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`9fd8f9cb`](https://github.com/signalwire/signalwire-js/commit/9fd8f9cbff5fc03347248795f09e169166aba0f3), [`aaa07479`](https://github.com/signalwire/signalwire-js/commit/aaa07479db10685e72d96ea43927d759dbac076e), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`f3711f17`](https://github.com/signalwire/signalwire-js/commit/f3711f1726a9001a4204527b34b452de80e9a0e6), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431), [`602921a6`](https://github.com/signalwire/signalwire-js/commit/602921a61ef2d57675fcb429fd95d85c020c9431)]:
  - @signalwire/core@3.16.0
  - @signalwire/webrtc@3.7.0

## [3.20.0] - 2023-05-22

### Added

- [#790](https://github.com/signalwire/signalwire-js/pull/790) [`2e58a76b`](https://github.com/signalwire/signalwire-js/commit/2e58a76b6b505ca1d7ed5f6711dd33039a7ed84f) - Allow user to mirror the local video stream.

### Dependencies

- Updated dependencies [[`aa31e1a0`](https://github.com/signalwire/signalwire-js/commit/aa31e1a0307e7c1f3927d985ecd48ec06b9a1312), [`4e8e5b0d`](https://github.com/signalwire/signalwire-js/commit/4e8e5b0d859733b9c7455150cd837e42e851ef29), [`9fb4e5f4`](https://github.com/signalwire/signalwire-js/commit/9fb4e5f43640b3e5a3978634e6465562a20ac4a5)]:
  - @signalwire/core@3.15.0
  - @signalwire/webrtc@3.6.3

## [3.19.2] - 2023-03-24

### Changed

- [#771](https://github.com/signalwire/signalwire-js/pull/771) [`f99f73d7`](https://github.com/signalwire/signalwire-js/commit/f99f73d71784fd69b2658df3ff55f486191557d0) - Add subscriptions for required events.

## [3.19.1] - 2023-03-24

### Fixed

- [#767](https://github.com/signalwire/signalwire-js/pull/767) [`a1321a63`](https://github.com/signalwire/signalwire-js/commit/a1321a6349bac0febcf8c948dd31a1ed2ef4133e) - Fix missing roomSessionId/memberId on screenShare/additionalDevice objects and expose those variables right after `.join()`.

### Dependencies

- Updated dependencies [[`e299b048`](https://github.com/signalwire/signalwire-js/commit/e299b048fbcf876f2409335a98de1295fba70480), [`e299b048`](https://github.com/signalwire/signalwire-js/commit/e299b048fbcf876f2409335a98de1295fba70480), [`a491dbff`](https://github.com/signalwire/signalwire-js/commit/a491dbffac6540a81ea22054dd97f2139d489651)]:
  - @signalwire/core@3.14.1
  - @signalwire/webrtc@3.6.2

## [3.19.0] - 2023-03-22

### Added

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Add `promote`/`demote` methods to RoomSession.

- [#673](https://github.com/signalwire/signalwire-js/pull/673) [`6c4d4b3d`](https://github.com/signalwire/signalwire-js/commit/6c4d4b3dbba722537653a9f6b11fb516c107d5f2) - Add `interactivityMode` to the RoomSession object.

### Changed

- [#661](https://github.com/signalwire/signalwire-js/pull/661) [`ef18e7ef`](https://github.com/signalwire/signalwire-js/commit/ef18e7ef8b2c4121d7693a2683f1f190dd08f112) - Internal changes to keep the member_id stable across promote/demote.

- [#738](https://github.com/signalwire/signalwire-js/pull/738) [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a) - Remove executeActionWatcher and related functions

- [#664](https://github.com/signalwire/signalwire-js/pull/664) [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b) - Expose the `room.audience_count` event on the RoomSession

### Dependencies

- Updated dependencies [[`ef18e7ef`](https://github.com/signalwire/signalwire-js/commit/ef18e7ef8b2c4121d7693a2683f1f190dd08f112), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`688306f4`](https://github.com/signalwire/signalwire-js/commit/688306f4a5bd157dee40c13ce757001cfa30e832), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a), [`0cf1c920`](https://github.com/signalwire/signalwire-js/commit/0cf1c920440e8ae60b76be53a5b125cab4de07fa), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bc56cc42`](https://github.com/signalwire/signalwire-js/commit/bc56cc42497220d43085adea8f3834fbce60444b), [`bb6ecbf4`](https://github.com/signalwire/signalwire-js/commit/bb6ecbf4574ee72f0e4e8e7b42b5ccc832042fff), [`ba39c819`](https://github.com/signalwire/signalwire-js/commit/ba39c819fa5cccd97deaa9135696ed70a289296a)]:
  - @signalwire/webrtc@3.6.1
  - @signalwire/core@3.14.0

## [3.18.0] - 2023-03-07

### Added

- [#729](https://github.com/signalwire/signalwire-js/pull/729) [`41482813`](https://github.com/signalwire/signalwire-js/commit/414828131a81f5bf2e57d786d8002d96e25f7597) - Expose new events on the RoomSession to detect the media state: `media.connected`, `media.disconnected` and `media.reconnecting`.

- [#747](https://github.com/signalwire/signalwire-js/pull/747) [`95325ec9`](https://github.com/signalwire/signalwire-js/commit/95325ec9d1f3c98bd478eb799abefb1dabbd7759) - Changes to support connecting using SAT and join a video room.

### Changed

- [#755](https://github.com/signalwire/signalwire-js/pull/755) [`09bd387d`](https://github.com/signalwire/signalwire-js/commit/09bd387d022e4124f4ed4ef9a159bdbebe31775a) - Set internal `reattach` flag `true` by default.

- [#569](https://github.com/signalwire/signalwire-js/pull/569) [`0bdda948`](https://github.com/signalwire/signalwire-js/commit/0bdda94824e9ffefa5830b951488899e0dbd8d85) - Internal changes to persist and use `authorization.state` events.

- [#697](https://github.com/signalwire/signalwire-js/pull/697) [`9349ba45`](https://github.com/signalwire/signalwire-js/commit/9349ba455aec041e64fa404aa4de8f5361673c9e) - Allow override for connection host from JWT.

### Dependencies

- Updated dependencies [[`41482813`](https://github.com/signalwire/signalwire-js/commit/414828131a81f5bf2e57d786d8002d96e25f7597), [`a937768a`](https://github.com/signalwire/signalwire-js/commit/a937768a0b965d35b8468324a5d85273fc46e638), [`90d9776a`](https://github.com/signalwire/signalwire-js/commit/90d9776acd2dad58dded5036ec04b073efef2c65), [`5b002eab`](https://github.com/signalwire/signalwire-js/commit/5b002eab500142c97777c16e7aab846282eca656), [`bbb9544c`](https://github.com/signalwire/signalwire-js/commit/bbb9544cf41d9825a84cff825e8c1c0ceda4920b), [`45536d5f`](https://github.com/signalwire/signalwire-js/commit/45536d5fb6a8e474a2f5b511ddf12fb474566b19), [`95325ec9`](https://github.com/signalwire/signalwire-js/commit/95325ec9d1f3c98bd478eb799abefb1dabbd7759), [`bb216980`](https://github.com/signalwire/signalwire-js/commit/bb21698019ef5db7e4cd0376f1cd6bfec66fea98), [`9ad158b9`](https://github.com/signalwire/signalwire-js/commit/9ad158b90f73bed038d18f7f8b745931c266c3cf), [`0bdda948`](https://github.com/signalwire/signalwire-js/commit/0bdda94824e9ffefa5830b951488899e0dbd8d85), [`e1e1e336`](https://github.com/signalwire/signalwire-js/commit/e1e1e336df952429126eea2c2b8aaea8e55d29d7), [`55a309f8`](https://github.com/signalwire/signalwire-js/commit/55a309f8d6189c97941a55d8396bfe0e0e588fc8), [`4728ee55`](https://github.com/signalwire/signalwire-js/commit/4728ee555c6a2400877dccb986cbfc1408c7fb28), [`e2c475a7`](https://github.com/signalwire/signalwire-js/commit/e2c475a7ceb4e9eea6438b1d3dbb8457b7ad3e70)]:
  - @signalwire/webrtc@3.6.0
  - @signalwire/core@3.13.0

## [3.17.0] - 2022-11-23

### Added

- [#675](https://github.com/signalwire/signalwire-js/pull/675) [`c1b5025e`](https://github.com/signalwire/signalwire-js/commit/c1b5025e508d2352e51287693afa2abab2ced4c0) - Add `permissions` to the RoomSession object.

### Fixed

- [#669](https://github.com/signalwire/signalwire-js/pull/669) [`7a867dce`](https://github.com/signalwire/signalwire-js/commit/7a867dce9e3ec67a5403cb177afdb2a9da40ffde) - Fix `layout.changed` types.

* [#672](https://github.com/signalwire/signalwire-js/pull/672) [`8dc3d43a`](https://github.com/signalwire/signalwire-js/commit/8dc3d43acc79ae8b309535df27848033513ed03e) - Use a `ResizeObserver` to detect `rootElement` changes and adapt the MCU.

- [#686](https://github.com/signalwire/signalwire-js/pull/686) [`c82e6576`](https://github.com/signalwire/signalwire-js/commit/c82e65765555eecf0fd82b5e981ea928d133607e) - Review internals to always reconnect the SDKs expect for when the user disconnects the clients.

* [#668](https://github.com/signalwire/signalwire-js/pull/668) [`37ab859d`](https://github.com/signalwire/signalwire-js/commit/37ab859d2883efcef34d7d594ad241ee0a9cbef4) - Fix localVideo overlay updates joining and leaving the same room.

- [#670](https://github.com/signalwire/signalwire-js/pull/670) [`6239655b`](https://github.com/signalwire/signalwire-js/commit/6239655b14775da9aa3cb9d0bd3b8e5178fb4b97) - Correct types for `room.joined` event.

### Dependencies

- Updated dependencies [[`583ef730`](https://github.com/signalwire/signalwire-js/commit/583ef730675884b51045784980a12d80fc573b3b), [`bf68ad40`](https://github.com/signalwire/signalwire-js/commit/bf68ad40a090a73b1212eb1c0b2d88b7f9d0cdfd), [`3e7ce646`](https://github.com/signalwire/signalwire-js/commit/3e7ce6461a423e5b1014f16bf69b53793dfe1024), [`c82e6576`](https://github.com/signalwire/signalwire-js/commit/c82e65765555eecf0fd82b5e981ea928d133607e), [`e26f84e5`](https://github.com/signalwire/signalwire-js/commit/e26f84e503493c7cb79f43bb57fc8b03f5c282f0), [`a32413d8`](https://github.com/signalwire/signalwire-js/commit/a32413d89f9dc155be91aa148c4c56edec7e8413), [`aa5a469c`](https://github.com/signalwire/signalwire-js/commit/aa5a469ca1e33ca7bca6edb68f45f9edc3faf361)]:
  - @signalwire/core@3.12.2
  - @signalwire/webrtc@3.5.9

## [3.16.0] - 2022-10-06

### Changed

- [#631](https://github.com/signalwire/signalwire-js/pull/631) [`c00b343ed48305c12fcc599e46e76f2116ab2706`](https://github.com/signalwire/signalwire-js/commit/c00b343ed48305c12fcc599e46e76f2116ab2706) - Enhance `.join()` signature with an optional argument to control the media to send and receive.

### Added

- [#656](https://github.com/signalwire/signalwire-js/pull/656) [`8132100c`](https://github.com/signalwire/signalwire-js/commit/8132100cb237dfe69136ef175c235690cfe577db) - Expose `.disconnect()` on PubSub and Chat clients.

### Fixed

- [#660](https://github.com/signalwire/signalwire-js/pull/660) [`e3453977`](https://github.com/signalwire/signalwire-js/commit/e3453977b7df3cd34939ee8e6f15c6d83fb08134) - Fix how Chat/PubSub client can be reused after a `.disconnect()`.

* [#631](https://github.com/signalwire/signalwire-js/pull/631) [`c00b343ed48305c12fcc599e46e76f2116ab2706`](https://github.com/signalwire/signalwire-js/commit/c00b343ed48305c12fcc599e46e76f2116ab2706) - Fix audio/video constraints override from constructor to keep backward compatibility.

### Dependencies

- Updated dependencies [[`64e13ec6`](https://github.com/signalwire/signalwire-js/commit/64e13ec60a812ba3dbab941ea3d2bfa5f27ad5fe), [`b765449b`](https://github.com/signalwire/signalwire-js/commit/b765449bb22604b7f116a365027e17b10984d0af), [`021d9b83`](https://github.com/signalwire/signalwire-js/commit/021d9b8364777e493aa8d320d5b03a4275f640bb), [`e3453977`](https://github.com/signalwire/signalwire-js/commit/e3453977b7df3cd34939ee8e6f15c6d83fb08134), [`be8b8dea`](https://github.com/signalwire/signalwire-js/commit/be8b8deadb8652d4ea54bd2b4c3cfd29d2f94662)]:
  - @signalwire/webrtc@3.5.8
  - @signalwire/core@3.12.1

## [3.15.0] - 2022-09-21

### Added

- [#633](https://github.com/signalwire/signalwire-js/pull/633) [`f1102bb6`](https://github.com/signalwire/signalwire-js/commit/f1102bb6817f119b2f7b063c7e1e5ab2be4e8ec5) - Expose `getStreams` and `startStream` on the `RoomSession` object.

* [#627](https://github.com/signalwire/signalwire-js/pull/627) [`6cf01e1c`](https://github.com/signalwire/signalwire-js/commit/6cf01e1cecfc30395691aae68b6be15de140bd41) - Expose `getMeta` and `getMemberMeta` methods on the RoomSession.

### Changed

- [#652](https://github.com/signalwire/signalwire-js/pull/652) [`7febdb3e`](https://github.com/signalwire/signalwire-js/commit/7febdb3eb4c058737387e27ed7835ce69b6b71ce) - Disable Picture-in-Picture on the local video overlay.

### Fixed

- [#645](https://github.com/signalwire/signalwire-js/pull/645) [`c76d6387`](https://github.com/signalwire/signalwire-js/commit/c76d638753678421680b183468f3bf2ad5932a41) - Fix bug on the `RoomSession` screenShare leave logic.

* [#641](https://github.com/signalwire/signalwire-js/pull/641) [`569213c8`](https://github.com/signalwire/signalwire-js/commit/569213c874b30d7c1452eb56775ee5aa9d370252) - Fix video render for RoomSession in certain aspect ratio related to the rootElement.

- [#638](https://github.com/signalwire/signalwire-js/pull/638) [`1ba9daa6`](https://github.com/signalwire/signalwire-js/commit/1ba9daa60a2c543ab57ff4f33210567e8ddc384e) - Set `width: 100%` on contentWrapper to always give size to the MCU.

### Dependencies

- Updated dependencies [[`1d2fd5f8`](https://github.com/signalwire/signalwire-js/commit/1d2fd5f8836c94df23ee421fffe2fec67d74c57d), [`569213c8`](https://github.com/signalwire/signalwire-js/commit/569213c874b30d7c1452eb56775ee5aa9d370252), [`b9fb5deb`](https://github.com/signalwire/signalwire-js/commit/b9fb5deb967ab77f54731cd83a10726cd01f1a40), [`6cf01e1c`](https://github.com/signalwire/signalwire-js/commit/6cf01e1cecfc30395691aae68b6be15de140bd41), [`c00b343e`](https://github.com/signalwire/signalwire-js/commit/c00b343ed48305c12fcc599e46e76f2116ab2706), [`577e81d3`](https://github.com/signalwire/signalwire-js/commit/577e81d31cd237e87518a61532148c8c8563c3f6), [`0e7bffdd`](https://github.com/signalwire/signalwire-js/commit/0e7bffdd8ace2233c90c48fde925215e8753d53b), [`f1102bb6`](https://github.com/signalwire/signalwire-js/commit/f1102bb6817f119b2f7b063c7e1e5ab2be4e8ec5), [`5c3abab6`](https://github.com/signalwire/signalwire-js/commit/5c3abab6f2b9e47b17417f4378898cf240d12dba), [`577e81d3`](https://github.com/signalwire/signalwire-js/commit/577e81d31cd237e87518a61532148c8c8563c3f6), [`39ff2060`](https://github.com/signalwire/signalwire-js/commit/39ff2060ef2b13e4e83a8cba2a4433fb552af38e), [`c00b343e`](https://github.com/signalwire/signalwire-js/commit/c00b343ed48305c12fcc599e46e76f2116ab2706), [`c76d6387`](https://github.com/signalwire/signalwire-js/commit/c76d638753678421680b183468f3bf2ad5932a41)]:
  - @signalwire/webrtc@3.5.7
  - @signalwire/core@3.12.0

## [3.14.0] - 2022-08-17

### Added

- [#601](https://github.com/signalwire/signalwire-js/pull/601) [`d8cf078c`](https://github.com/signalwire/signalwire-js/commit/d8cf078ca113286b77ee978ae6c9c891a5b9d634) - Add `getAllowedChannels()` method to PubSub and Chat namespaces.

* [#619](https://github.com/signalwire/signalwire-js/pull/619) [`d7ce34d3`](https://github.com/signalwire/signalwire-js/commit/d7ce34d3e0a54952321b3186abcbad3cd97b7f81) - Add methods to manage a RoomSession and Member `meta`: `updateMeta`, `deleteMeta`, `setMemberMeta`, `updateMemberMeta`, `deleteMemberMeta`.

### Changed

- [#610](https://github.com/signalwire/signalwire-js/pull/610) [`eb1c3fe9`](https://github.com/signalwire/signalwire-js/commit/eb1c3fe985767f747747ca0525b1c0710af862cb) - Updated interfaces to match the spec, update `RoomSession.getRecordings` and `RoomSession.getPlaybacks` to return stateful objects, deprecated `RoomSession.members` and `RoomSession.recordings` in favour of their corresponding getters.

- [#589](https://github.com/signalwire/signalwire-js/pull/589) [`fa62d67f`](https://github.com/signalwire/signalwire-js/commit/fa62d67ff13398f1a29f10ac8d6d6299a42e7554) - Internal changes to update media_allowed, video_allowed and audio_allowed values for joinAudience.

* [#594](https://github.com/signalwire/signalwire-js/pull/594) [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120) - Refactoring to allow multiple RTCPeer instances on a BaseConnection.

- [#609](https://github.com/signalwire/signalwire-js/pull/609) [`24e956a2`](https://github.com/signalwire/signalwire-js/commit/24e956a231a491c37b26cac775a3d4139a9bdace) - Change logic for handling the auto managed `rootElement` so we don't mutate its styles.

* [#605](https://github.com/signalwire/signalwire-js/pull/605) [`2f909c9e`](https://github.com/signalwire/signalwire-js/commit/2f909c9ef670eeaed7b3444b9d4bf703bfbc3a1b) - Change how the SDK agent is defined.

- [#594](https://github.com/signalwire/signalwire-js/pull/594) [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120) - Internal: migrate `roomSubscribed` event handling to a custom worker.

### Dependencies

- Updated dependencies [[`3d202275`](https://github.com/signalwire/signalwire-js/commit/3d20227590f224cc1364171702ad3bffc83ff7be), [`9a6936e6`](https://github.com/signalwire/signalwire-js/commit/9a6936e68d9578bd8f0b1810a6a9bc1863338b90), [`fa62d67f`](https://github.com/signalwire/signalwire-js/commit/fa62d67ff13398f1a29f10ac8d6d6299a42e7554), [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120), [`d8cf078c`](https://github.com/signalwire/signalwire-js/commit/d8cf078ca113286b77ee978ae6c9c891a5b9d634), [`d7ce34d3`](https://github.com/signalwire/signalwire-js/commit/d7ce34d3e0a54952321b3186abcbad3cd97b7f81), [`5402ffcf`](https://github.com/signalwire/signalwire-js/commit/5402ffcf2169bfc05f490ead9b6ae9351a7968bc), [`2f909c9e`](https://github.com/signalwire/signalwire-js/commit/2f909c9ef670eeaed7b3444b9d4bf703bfbc3a1b), [`eb1c3fe9`](https://github.com/signalwire/signalwire-js/commit/eb1c3fe985767f747747ca0525b1c0710af862cb), [`7b196107`](https://github.com/signalwire/signalwire-js/commit/7b196107f120db410c5f85a3fd20682bacbf7576), [`7bdd7ab0`](https://github.com/signalwire/signalwire-js/commit/7bdd7ab03414a4b9aa337e9d6b339891c8feda36), [`81503784`](https://github.com/signalwire/signalwire-js/commit/815037849bbca0359b47e27de8979121623e4101), [`999b2526`](https://github.com/signalwire/signalwire-js/commit/999b2526a8126ada05c93e59edc24c7fa1ee2872), [`819a6772`](https://github.com/signalwire/signalwire-js/commit/819a67725a62e51ce1f21b624b35f19722b89120), [`4e2284d6`](https://github.com/signalwire/signalwire-js/commit/4e2284d6b328f023a06e2e4b924182093fc9eb5f)]:
  - @signalwire/core@3.11.0
  - @signalwire/webrtc@3.5.6

## [3.13.1]- 2022-07-27

### Dependencies

- Updated dependencies [[`6b4ad46d`](https://github.com/signalwire/signalwire-js/commit/6b4ad46db6eb01e3e13496d65206a87cf09819aa), [`6bc89d81`](https://github.com/signalwire/signalwire-js/commit/6bc89d81fe6ffa7530f60ed90482db1e7a39d6ac), [`6d1c26ea`](https://github.com/signalwire/signalwire-js/commit/6d1c26eaaaa6799bde38099218e55e88dbe634ca)]:
  - @signalwire/webrtc@3.5.5
  - @signalwire/core@3.10.1

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
