# P4-001: Update E2E Test Infrastructure - Summary

## Completed Tasks

### 1. Updated Test Infrastructure to Support Both SDKs
- Modified `templates/blank/index.js` to import both SDKs:
  - `@signalwire/js` as VideoSDK (exposed as `window._SWJS`)
  - `@signalwire/browser-js` as FabricSDK (exposed as `window._SWBROWSERJS`)

### 2. Fixed Type/Value Export Issues
- Identified that several exports were TypeScript interfaces being imported as runtime values
- Fixed `RoomSessionDevice` and `RoomSessionScreenShare` exports to be type-only exports
- Fixed `OverlayMap` export to be a type-only export  
- Updated imports in `video/index.ts` to use `import type` for interfaces

### 3. Fixed Deprecated Exports
- Replaced dynamic `require()` with Proxy and function exports for deprecated APIs
- Added proper deprecation warnings that throw errors when accessed
- Ensured no runtime errors from ESM/CommonJS conflicts

### 4. Updated Global Type Definitions
- Modified `utils.ts` to include both SDK types in the Window interface
- Separated Video SDK and Fabric SDK type imports

### 5. Created Comprehensive Tests
- Created `sdkInfrastructure.spec.ts` to verify both SDKs load properly
- Created `sdkUsage.spec.ts` to verify:
  - Video SDK components can be instantiated (RoomSession, Chat.Client, PubSub.Client)
  - Fabric SDK SignalWire function is available and callable
  - Deprecation warnings work correctly

## Test Results
All infrastructure tests pass:
- ✓ Both SDKs load in the test environment
- ✓ Video SDK namespaces are available (Video, Chat, PubSub, WebRTC)
- ✓ Fabric SDK SignalWire function is available
- ✓ All SDK components can be instantiated
- ✓ Deprecation warnings work as expected

## Notes
- Existing E2E tests require environment variables (API_HOST, RELAY_HOST, etc.) to run
- The test infrastructure itself is working correctly - failures are due to missing credentials
- Both SDKs can coexist in the same test environment without conflicts

## Files Modified
1. `internal/e2e-js/templates/blank/index.js`
2. `internal/e2e-js/utils.ts`
3. `packages/js/src/index.ts`
4. `packages/js/src/video/index.ts`

## Files Created
1. `internal/e2e-js/tests/sdkInfrastructure.spec.ts`
2. `internal/e2e-js/tests/sdkUsage.spec.ts`