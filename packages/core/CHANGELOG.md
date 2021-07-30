# @signalwire/core

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
