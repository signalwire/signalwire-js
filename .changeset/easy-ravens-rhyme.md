---
'@signalwire/webrtc': patch
'@signalwire/core': patch
'@signalwire/js': patch
---

Video & CF SDK:

- Exposes a `cameraConstraints` and `microphoneConstraints` on the room/call object.

CF SDK:

- Introduces a validation proxy for the `FabricRoomSession` class.
- Introduces a `CapabilityError` for the errors based on the missing capability.
- Fixes the `setOutputVolume` API.
