# Visibility & Page Lifecycle Management

This module provides intelligent handling of browser visibility changes, tab focus events, and device wake scenarios to ensure optimal WebRTC performance and resource utilization, with special focus on mobile device optimizations.

## Key Features

### 🔋 Mobile-Specific Optimizations
- **Auto-mute Strategy**: Battery-aware video muting on mobile devices
- **Platform Detection**: Advanced iOS, Android, and browser engine detection
- **Wake Detection**: Intelligent device sleep/wake event detection
- **DTMF Notifications**: Server state change notifications via DTMF tones
- **Recovery Strategies**: Platform-specific media recovery patterns

### 📱 Platform Support
- **iOS Safari**: Aggressive auto-muting due to background throttling
- **Android Chrome**: Optimized for Chrome's tab handling
- **WebView Detection**: Special handling for in-app browsers
- **Desktop Browsers**: Standard visibility management

### 🚀 Core Capabilities
- **Visibility Detection**: Monitor Page Visibility API events
- **State Preservation**: Maintain media state across visibility changes
- **Recovery Orchestration**: Multi-layered recovery strategies
- **Device Management**: Handle device enumeration and changes

## Usage

### Basic Usage

```typescript
import { MobileOptimizationManager } from '@signalwire/client'

// Create mobile optimization manager
const mobileOptimizer = new MobileOptimizationManager({
  enabled: true,
  mobile: {
    autoMuteVideo: true,
    autoRestoreVideo: true,
    notifyServer: true,
  }
})

// Check if device needs special handling
if (mobileOptimizer.requiresSpecialHandling()) {
  console.log('Mobile optimizations active')
}

// Get platform-specific strategies
const recoveryStrategies = mobileOptimizer
  .getRecoveryStrategy()
  .getRecoveryStrategies()
```

### Integration with Room Sessions

```typescript
import { VisibilityManager } from '@signalwire/client'

// Create visibility manager for room session
const visibilityManager = new VisibilityManager(roomSession, {
  mobile: {
    autoMuteVideo: true,      // Auto-mute video on mobile
    autoRestoreVideo: true,   // Auto-restore when regaining focus
    notifyServer: true,       // Send DTMF notifications
  },
  recovery: {
    strategies: [
      RecoveryStrategy.PLAY_VIDEO,
      RecoveryStrategy.REQUEST_KEYFRAME,
      RecoveryStrategy.RECONNECT_STREAM,
    ]
  }
})

// Listen for visibility events
visibilityManager.on('visibility.focus.lost', (params) => {
  if (params.autoMuted) {
    console.log('Video auto-muted for battery saving')
  }
})

visibilityManager.on('visibility.recovery.success', (params) => {
  console.log(`Recovery successful using: ${params.strategy}`)
})
```

## Mobile Detection

The module provides detailed mobile context detection:

```typescript
import { detectExtendedMobileContext } from '@signalwire/client'

const context = detectExtendedMobileContext()

console.log({
  isMobile: context.isMobile,
  isIOS: context.isIOS,
  isAndroid: context.isAndroid,
  deviceType: context.deviceType, // 'phone' | 'tablet' | 'desktop'
  browser: context.browser,       // 'safari' | 'chrome' | etc.
  isWebView: context.isWebView,
  iOSVersion: context.iOSVersion,
  androidVersion: context.androidVersion,
})
```

## Auto-Mute Strategy

The auto-mute strategy intelligently manages video muting based on platform:

```typescript
import { MobileAutoMuteStrategy } from '@signalwire/client'

const strategy = new MobileAutoMuteStrategy(config)

// Apply auto-mute when losing focus
const autoMuted = await strategy.applyAutoMute(
  'session-id',
  () => roomSession.muteVideo(),
  () => roomSession.muteAudio(), // optional
  (tone) => roomSession.sendDTMF(tone)
)

// Restore when regaining focus
const restored = await strategy.restoreFromAutoMute(
  'session-id',
  () => roomSession.unmuteVideo(),
  () => roomSession.unmuteAudio(), // optional
  (tone) => roomSession.sendDTMF(tone)
)
```

## Wake Detection

Detect when devices wake from sleep:

```typescript
import { MobileWakeDetector } from '@signalwire/client'

const detector = new MobileWakeDetector()

const unsubscribe = detector.onWake((sleepDuration) => {
  console.log(`Device woke after ${sleepDuration}ms`)
  // Trigger recovery procedures
})

// Cleanup
unsubscribe()
detector.stop()
```

## DTMF Notifications

Send server notifications for state changes:

```typescript
import { MobileDTMFNotifier } from '@signalwire/client'

const notifier = new MobileDTMFNotifier(config)

// Notify server of state changes
notifier.notifyStateChange('auto-mute', (tone) => {
  roomSession.sendDTMF(tone) // Sends '*0'
})

notifier.notifyStateChange('wake', (tone) => {
  roomSession.sendDTMF(tone) // Sends '*1'
})
```

## DTMF Signal Reference

| Signal | Meaning | Description |
|--------|---------|-------------|
| `*0` | Auto-mute/unmute | Video was auto-muted or restored |
| `*1` | Device wake | Device woke from sleep |
| `*2` | Background | App moved to background |
| `*3` | Foreground | App moved to foreground |

## Platform-Specific Behaviors

### iOS Safari
- **Aggressive auto-muting**: Mutes video on visibility loss and focus loss
- **iOS-specific recovery**: Uses special media element handling
- **Safari workarounds**: Handles Safari's strict background policies

### Android Chrome
- **Selective auto-muting**: Only mutes after longer background periods
- **Chrome optimizations**: Uses Chrome-specific recovery patterns
- **WebView detection**: Special handling for Android WebView apps

### Desktop Browsers
- **Standard handling**: Uses standard recovery strategies
- **No auto-muting**: Preserves user's explicit mute/unmute choices

## Configuration

```typescript
interface VisibilityConfig {
  enabled: boolean
  
  mobile: {
    autoMuteVideo: boolean        // Auto-mute video on mobile
    autoRestoreVideo: boolean     // Auto-restore when regaining focus
    notifyServer: boolean         // Send DTMF notifications
  }
  
  recovery: {
    strategies: RecoveryStrategy[] // Recovery strategies in order
    maxAttempts: number           // Max attempts per strategy
    delayBetweenAttempts: number  // Delay between attempts (ms)
  }
  
  devices: {
    reEnumerateOnFocus: boolean   // Re-enumerate devices on focus
    pollingInterval: number       // Device polling interval (ms)
    restorePreferences: boolean   // Restore device preferences
  }
  
  throttling: {
    backgroundThreshold: number   // Background threshold (ms)
    resumeDelay: number          // Resume delay (ms)
  }
}
```

## Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Page Visibility API | ✅ | ✅ | ✅ | ✅ |
| Device Change Events | ✅ | ✅ | ✅ | ✅ |
| Wake Detection | ✅ | ✅ | ⚠️ | ✅ |
| Auto-mute | ✅ | ✅ | ✅ | ✅ |
| WebView Detection | ✅ | ✅ | ❌ | ✅ |

## Performance Considerations

- **Battery Impact**: Auto-muting reduces battery consumption on mobile
- **Memory Usage**: Minimal overhead with efficient state management
- **Recovery Time**: Typically < 2 seconds for successful recovery
- **Network Impact**: Reduced bandwidth usage during backgrounding

## Testing

The module includes comprehensive tests covering:
- Mobile detection across platforms
- Auto-mute/restore functionality
- Wake detection mechanisms
- DTMF notification system
- Recovery strategy execution

Run tests with:
```bash
npm test src/visibility/mobileOptimization.test.ts
```

## Integration Points

This module integrates with:
- **BaseRoomSession**: Core room session functionality
- **CallSession**: Call Fabric SDK sessions
- **VideoRoomSession**: Video room sessions
- **VisibilityManager**: Main visibility lifecycle coordinator

## Future Enhancements

- **Battery API Integration**: Use Battery API for more intelligent auto-muting
- **Network Condition Awareness**: Adapt behavior based on connection quality
- **User Preference Learning**: Learn from user patterns to optimize behavior
- **Advanced Recovery**: More sophisticated recovery mechanisms