# Device Management for Visibility Lifecycle

This module provides device management functionality for the visibility lifecycle management feature. It handles device change detection, re-enumeration, preference storage, and device recovery when the browser regains focus or visibility.

## Features

### Device Change Detection
- Monitors for device additions/removals using the `devicechange` event when available
- Falls back to polling (3s interval) for browsers without native `devicechange` support
- Detects changes in audio input, video input, and audio output devices

### Device Re-enumeration
- Re-enumerates devices when the browser regains focus or becomes visible
- Ensures device list is up-to-date after potential hardware changes during background periods
- Supports wake detection scenarios where devices may have changed

### Device Preference Storage
- Stores user's preferred device selections in localStorage
- Remembers audio input, video input, and audio output device choices
- Persists preferences across browser sessions

### Device Recovery
- Restores preferred devices when they are still available after focus/visibility restore
- Falls back to default devices when preferred devices are no longer available
- Verifies that media streams are active and working after device changes
- Integrates with BaseRoomSession device management methods

### Polling Fallback
- Provides polling-based device monitoring for browsers without `devicechange` event support
- Configurable polling interval (default: 3000ms)
- Automatically chooses between native events and polling based on browser capabilities

## Usage

### Basic Integration

```typescript
import { DeviceManager, createDeviceManager } from '@signalwire/client/visibility'
import { DEFAULT_VISIBILITY_CONFIG } from '@signalwire/client/visibility'

// Create device manager for a BaseRoomSession instance
const deviceManager = createDeviceManager(roomSession, DEFAULT_VISIBILITY_CONFIG)

// Initialize device monitoring
await deviceManager.initialize()

// Handle focus gained (typically called by VisibilityManager)
const recoveryResult = await deviceManager.handleFocusGained()

// Clean up when done
deviceManager.cleanup()
```

### Custom Configuration

```typescript
const config = {
  ...DEFAULT_VISIBILITY_CONFIG,
  devices: {
    reEnumerateOnFocus: true,
    pollingInterval: 5000, // Custom polling interval
    restorePreferences: true,
  }
}

const deviceManager = createDeviceManager(roomSession, config)
```

### Manual Device Preference Management

```typescript
// Save current device preferences
await deviceManager.saveCurrentDevicePreferences()

// Get current preferences
const preferences = deviceManager.getPreferences()

// Update preferences manually
deviceManager.updatePreferences({
  audioInput: 'specific-device-id',
  videoInput: 'another-device-id',
})

// Restore device preferences
const result = await deviceManager.restoreDevicePreferences()
```

### Device Change Handling

```typescript
// Handle device change events (typically done automatically)
const deviceChangeEvent = {
  type: 'devicechange',
  changes: {
    added: [newDevice],
    removed: [removedDevice],
    current: allCurrentDevices,
    hasChanges: true
  },
  timestamp: Date.now()
}

await deviceManager.handleDeviceChange(deviceChangeEvent)
```

## Integration with BaseRoomSession

The DeviceManager integrates with BaseRoomSession through the `DeviceManagementTarget` interface:

```typescript
interface DeviceManagementTarget {
  /** Update audio input device */
  updateAudioDevice?: (params: { deviceId: string }) => Promise<void>
  /** Update video input device */
  updateVideoDevice?: (params: { deviceId: string }) => Promise<void>
  /** Update speaker/audio output device */
  updateSpeaker?: (params: { deviceId: string }) => Promise<void>
  /** Get current local stream */
  localStream?: MediaStream | null
  /** Session/instance ID for storage keys */
  id: string
}
```

BaseRoomSession instances automatically provide these methods, making integration seamless.

## Browser Compatibility

### Supported Features
- **Device Enumeration**: All modern browsers with `navigator.mediaDevices.enumerateDevices()`
- **Device Change Events**: Chrome 49+, Firefox 52+, Safari 11+
- **Polling Fallback**: All browsers with device enumeration support
- **LocalStorage**: All modern browsers

### Feature Detection
```typescript
import { 
  isDeviceManagementSupported, 
  getDeviceManagementCapabilities 
} from '@signalwire/client/visibility'

// Check overall support
const isSupported = isDeviceManagementSupported()

// Get detailed capabilities
const capabilities = getDeviceManagementCapabilities()
// Returns: { enumeration, deviceChangeEvent, mediaOutput, localStorage }
```

## Error Handling

The DeviceManager handles errors gracefully:

- **Device enumeration failures**: Logged as errors, empty device list returned
- **Device restoration failures**: Errors collected in recovery result, fallbacks attempted
- **Storage failures**: Logged as warnings, preferences not persisted
- **Stream verification failures**: Triggers additional recovery attempts

## Testing

Comprehensive test suite covers:
- Device change detection algorithms
- Preference storage and restoration
- Media stream verification
- Focus handling scenarios
- Error conditions and edge cases

Run tests with:
```bash
npm test deviceManagement.test.ts
```

## Performance Considerations

- **Memory Usage**: Minimal - stores only device preferences and current device list
- **CPU Usage**: Low - uses native events when available, configurable polling interval
- **Storage Usage**: Minimal - stores only JSON preferences in localStorage
- **Network Usage**: None - all operations are local

## Future Enhancements

Potential improvements for future versions:

1. **Intelligent Polling**: Adaptive polling intervals based on detection patterns
2. **Device Categories**: Separate handling for professional vs consumer devices
3. **Permission Management**: Integration with permission request flows
4. **Analytics**: Telemetry for device change patterns and recovery success rates
5. **Hot-swap Support**: Advanced handling for USB device hot-swapping scenarios