---
"@signalwire/webrtc": patch
---

Fix duplicate audio m-lines in SDP when reusing pooled RTCPeerConnections

When reusing a pre-warmed connection from the pool, the code now properly reuses existing transceivers instead of creating new ones. This prevents duplicate audio/video sections in the SDP offer, which was causing issues with media negotiation.

Changes:
- Modified RTCPeer.start() to check for and reuse existing transceivers when adding real tracks
- Updated _checkMediaToNegotiate() to reuse existing transceivers instead of creating duplicates
- Properly updates transceiver direction and parameters when reusing