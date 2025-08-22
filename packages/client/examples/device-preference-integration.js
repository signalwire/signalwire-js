/**
 * Example demonstrating Device Preference Management integration with BaseRoomSession
 *
 * This example shows how to:
 * 1. Create a BaseRoomSession with device preference management enabled
 * 2. Use enhanced updateCamera/updateMicrophone/updateSpeaker methods
 * 3. Access the DeviceManager for advanced device management
 */

import {
  createBaseRoomSessionObject,
  LocalStorageAdapter,
} from '@signalwire/client'

// Example 1: Basic integration - Enable device preferences with default configuration
const basicRoomSession = createBaseRoomSessionObject({
  host: 'yourspace.signalwire.com',
  token: 'your-token',
  rootElement: document.getElementById('video-container'),
  devicePreferences: {
    // Enable device preference management with defaults
    global: {
      persistPreferences: true,
      enableMonitoring: true,
      autoRecover: true,
    },
  },
})

// Example 2: Advanced configuration with custom storage and device-specific settings
const advancedRoomSession = createBaseRoomSessionObject({
  host: 'yourspace.signalwire.com',
  token: 'your-token',
  rootElement: document.getElementById('video-container'),
  devicePreferences: {
    // Global settings
    global: {
      persistPreferences: true,
      enableMonitoring: true,
      autoRecover: true,
      monitoringInterval: 3000,
      storageKeyPrefix: 'myapp_device_',
    },
    // Device-specific settings
    camera: {
      maxRecoveryAttempts: 5,
      recoveryDelay: 2000,
    },
    microphone: {
      recoveryStrategy: {
        type: 'preference',
        priorityOrder: ['preference', 'fallback', 'any'],
        notifyOnRecovery: true,
      },
    },
    speaker: {
      autoRecover: false, // Disable auto-recovery for speakers
    },
    // Custom storage adapter
    storageAdapter: new LocalStorageAdapter('custom_prefix_'),
  },
})

// Example 3: Using enhanced device methods with preferences
async function demonstrateEnhancedMethods() {
  await advancedRoomSession.join()

  // Enhanced updateCamera with automatic preference saving
  await advancedRoomSession.updateCamera(
    { deviceId: 'camera-device-id-123' },
    {
      priority: 1,
      isFallback: false,
      metadata: { location: 'desk', quality: 'high' },
    }
  )

  // Enhanced updateMicrophone with preference
  await advancedRoomSession.updateMicrophone(
    { deviceId: 'microphone-device-id-456' },
    {
      priority: 1,
      metadata: { type: 'headset', noiseReduction: true },
    }
  )

  // Enhanced updateSpeaker with preference
  await advancedRoomSession.updateSpeaker(
    { deviceId: 'speaker-device-id-789' },
    {
      priority: 1,
      metadata: { type: 'bluetooth', brand: 'Sony' },
    }
  )
}

// Example 4: Direct DeviceManager usage
async function demonstrateDeviceManager() {
  const deviceManager = advancedRoomSession.deviceManager

  if (!deviceManager) {
    console.log('Device management is not enabled')
    return
  }

  // Listen to device manager events
  deviceManager.on('device.state.changed', (event) => {
    console.log('Device state changed:', event)
  })

  deviceManager.on('device.recovery.completed', (event) => {
    console.log('Device recovery completed:', event)
  })

  deviceManager.on('preferences.saved', (event) => {
    console.log('Preferences saved:', event)
  })

  // Get device preferences
  const cameraPrefs = deviceManager.getPreferences('camera')
  console.log('Camera preferences:', cameraPrefs)

  // Get device state
  const micState = deviceManager.getDeviceState('microphone')
  console.log('Microphone state:', micState)

  // Manual device recovery
  const recoveryResult = await deviceManager.recoverDevice('camera')
  console.log('Recovery result:', recoveryResult)

  // Clear preferences
  await deviceManager.clearPreferences('speaker')
}

// Example 5: Backward compatibility - Using without device preferences
const compatibilityRoomSession = createBaseRoomSessionObject({
  host: 'yourspace.signalwire.com',
  token: 'your-token',
  rootElement: document.getElementById('video-container'),
  // No devicePreferences config = standard behavior
})

async function demonstrateBackwardCompatibility() {
  await compatibilityRoomSession.join()

  // These will work exactly as before (no device preference management)
  await compatibilityRoomSession.updateCamera({ deviceId: 'camera-id' })
  await compatibilityRoomSession.updateMicrophone({ deviceId: 'mic-id' })
  await compatibilityRoomSession.updateSpeaker({ deviceId: 'speaker-id' })

  // DeviceManager will be undefined
  console.log('DeviceManager:', compatibilityRoomSession.deviceManager) // undefined
}

// Example 6: Zero overhead when disabled
function demonstrateZeroOverhead() {
  // When devicePreferences is not provided, there's zero overhead:
  // - No DeviceManager instance is created
  // - No device preference worker is registered
  // - Methods behave exactly as before
  // - No additional memory or CPU usage

  const session = createBaseRoomSessionObject({
    host: 'yourspace.signalwire.com',
    token: 'your-token',
    rootElement: document.getElementById('video-container'),
  })

  console.log('DeviceManager exists:', !!session.deviceManager) // false
  // Standard updateCamera/updateMicrophone/updateSpeaker behavior maintained
}

// Export examples for demonstration
export {
  basicRoomSession,
  advancedRoomSession,
  compatibilityRoomSession,
  demonstrateEnhancedMethods,
  demonstrateDeviceManager,
  demonstrateBackwardCompatibility,
  demonstrateZeroOverhead,
}
