# @signalwire/webrtc

## 3.0.0-beta.2

### Patch Changes

- efe9bd8: Move Room to `js` package
- 8bb4e76: Split Room objects into `Room`, `RoomDevice` and `RoomScreenShare` with specific methods for each use case.
- a15b69a: Add `getMemberList` method to retrieve the member list for the current room
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
