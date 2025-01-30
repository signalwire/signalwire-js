---
'@signalwire/webrtc': minor
'@signalwire/core': minor
'@signalwire/js': minor
---

Call Fabric and Video SDK: Introduce update media APIs with renegotiation

```text

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

Either "audio" or "video" is required with "direction" property.
The "constraints" can only be passed if the "direction" is either "sendrecv" or "sendonly".

await setVideoDirection('sendonly' | 'sendrecv' | 'recvonly' | 'inactive')

await setAudioDirection('sendonly' | 'sendrecv' | 'recvonly' | 'inactive')

```
