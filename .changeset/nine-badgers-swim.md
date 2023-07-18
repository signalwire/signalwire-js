---
'@signalwire/webrtc': patch
---

Make `updateConstraints()` more resilient trying to stop the current MediaStream in case of `NotReadableError`.
