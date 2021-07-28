---
'@signalwire/js': patch
---

Change the signature of `getLayoutList` and `getLayoutList` so they return the list of layouts (`Promise<string[]>`) and members (`Promise<RoomMember[]>`) respectively. Other methods (`audioMute`, `audioUnmute`, `deaf`, `hideVideoMuted`, `removeMember`, `setInputSensitivity`, `setLayout`, `setMicrophoneVolume`, `setSpeakerVolume`, `showVideoMuted`, `undeaf`, `videoMute`, `videoUnmute`) that were previously returning `{ code: string, message: string }` also went through a signature change and are now returning `Promise<void>`
