# @signalwire/js

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
