---
"@signalwire/client": minor
"@signalwire/core": minor
---

WIP: Major SDK restructuring and visibility management features

Restructured SignalWire SDK packages with fabric-to-unified rename and comprehensive visibility management:

**Major Changes:**
- Renamed fabric API to unified API with consistent file structure
- Implemented comprehensive Visibility & Page Lifecycle Management for WebRTC applications
- Added VisibilityManager with event channels for browser tab switching and focus changes
- Implemented 4-tier recovery system (video play, keyframe, reconnect, reinvite)
- Added mobile optimization with platform-specific handling for iOS/Android
- Implemented device management with re-enumeration and preference restoration
- Added MediaStateManager with real state capture and restore capabilities

**Package Restructuring:**
- Removed redundant packages (js, node, realtime-api, swaig, web-api)
- Consolidated e2e testing structure 
- Updated CI/CD workflows and build configurations

**Note:** This is a work-in-progress branch containing significant architectural changes that require thorough testing and review before production deployment.