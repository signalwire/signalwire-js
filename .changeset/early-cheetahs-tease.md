---
'@sw-internal/e2e-realtime-api': patch
'@signalwire/realtime-api': patch
'@signalwire/core': patch
---

- Added state to `CallingCallCollectEventParams`
- Made sure voiceCallCollectWorker doesn't clean up CallCollect instance and emit ended/failed event if the state is "collecting"
- Resolve CallCollect.ended() promise only when state is NOT "collecting" AND final is either undefined/true AND result.type is one od ENDED_STATES
- Added more test cases for Call.collect() in @sw-internal/e2e-realtime-api
