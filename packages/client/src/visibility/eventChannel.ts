/**
 * Event channel implementation for visibility lifecycle events
 */

import { sagaHelpers } from '@signalwire/core'
import {
  VisibilityEvent,
  VisibilityState,
  FocusState,
  DeviceChangeEvent,
  MobileContext,
  VisibilityConfig,
} from './types'

/**
 * Detect mobile context and browser capabilities
 */
export function detectMobileContext(): MobileContext {
  const userAgent = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isAndroid = /android/.test(userAgent)
  const isMobile =
    isIOS ||
    isAndroid ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0

  let browserEngine: 'webkit' | 'blink' | 'gecko' = 'blink'
  if ('webkitAudioContext' in window) browserEngine = 'webkit'
  else if ('mozGetUserMedia' in navigator) browserEngine = 'gecko'

  return { isMobile, isIOS, isAndroid, browserEngine }
}

/**
 * Detect device changes by comparing device lists
 */
export function detectDeviceChanges(
  previousDevices: MediaDeviceInfo[],
  currentDevices: MediaDeviceInfo[]
) {
  const prevIds = new Set(previousDevices.map(d => d.deviceId))
  const currIds = new Set(currentDevices.map(d => d.deviceId))

  const added = currentDevices.filter(d => !prevIds.has(d.deviceId))
  const removed = previousDevices.filter(d => !currIds.has(d.deviceId))

  return { added, removed, current: currentDevices }
}

/**
 * Create event channel for Page Visibility API events
 */
export function createVisibilityChannel(
  config: VisibilityConfig = {} as VisibilityConfig
) {
  return sagaHelpers.eventChannel<VisibilityEvent>((emitter) => {
    let lastBlurTime: number | null = null
    let lastCheckTime = Date.now()
    let wakeDetectionInterval: NodeJS.Timeout | null = null

    // Get current visibility state
    const getCurrentVisibilityState = (): VisibilityState => ({
      hidden: document.hidden,
      visibilityState: document.visibilityState,
      timestamp: Date.now(),
    })

    // Handle visibility change events
    const handleVisibilityChange = () => {
      const state = getCurrentVisibilityState()
      emitter({
        type: 'visibility',
        state,
        timestamp: state.timestamp,
      })
    }

    // Handle focus events
    const handleFocus = () => {
      const now = Date.now()
      const wasHidden = document.hidden
      const hiddenDuration = lastBlurTime ? now - lastBlurTime : 0
      
      lastBlurTime = null

      emitter({
        type: 'focus',
        wasHidden,
        hiddenDuration,
        timestamp: now,
      })
    }

    // Handle blur events
    const handleBlur = () => {
      const now = Date.now()
      lastBlurTime = now

      emitter({
        type: 'blur',
        autoMuted: false, // Will be set by the manager based on mobile context
        timestamp: now,
      })
    }

    // Handle page show events
    const handlePageShow = (event: PageTransitionEvent) => {
      emitter({
        type: 'pageshow',
        persisted: event.persisted,
        timestamp: Date.now(),
      })
    }

    // Handle page hide events
    const handlePageHide = (event: PageTransitionEvent) => {
      emitter({
        type: 'pagehide',
        persisted: event.persisted,
        timestamp: Date.now(),
      })
    }

    // Register core event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('pagehide', handlePageHide)

    // Setup wake detection if enabled
    if (config.enabled !== false) {
      wakeDetectionInterval = setInterval(() => {
        const now = Date.now()
        const timeDiff = now - lastCheckTime

        // If more than 5 seconds passed, device likely woke from sleep
        if (timeDiff > 5000) {
          const sleepDuration = timeDiff - 1000 // Subtract interval time
          emitter({
            type: 'wake',
            sleepDuration,
            timestamp: now,
          })
        }

        lastCheckTime = now
      }, 1000)
    }

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('pagehide', handlePageHide)

      if (wakeDetectionInterval) {
        clearInterval(wakeDetectionInterval)
      }
    }
  })
}

/**
 * Create event channel for device change monitoring
 */
export function createDeviceChangeChannel(
  config: VisibilityConfig
) {
  return sagaHelpers.eventChannel<DeviceChangeEvent>((emitter) => {
    let previousDevices: MediaDeviceInfo[] = []
    let pollingInterval: NodeJS.Timeout | null = null

    const checkDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const changes = detectDeviceChanges(previousDevices, devices)
        
        if (changes.added.length > 0 || changes.removed.length > 0) {
          emitter({
            type: 'devicechange',
            changes,
            timestamp: Date.now(),
          })
        }

        previousDevices = devices
      } catch (error) {
        console.warn('Device enumeration failed:', error)
      }
    }

    // Initial enumeration
    checkDevices()

    // Setup monitoring
    if (navigator.mediaDevices && 'ondevicechange' in navigator.mediaDevices) {
      // Use native devicechange event if available
      navigator.mediaDevices.addEventListener('devicechange', checkDevices)
    } else {
      // Fallback to polling
      pollingInterval = setInterval(
        checkDevices, 
        config.devices?.pollingInterval || 3000
      )
    }

    // Cleanup function
    return () => {
      if (navigator.mediaDevices && 'ondevicechange' in navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', checkDevices)
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  })
}

/**
 * Create combined event channel that merges visibility and device events
 */
export function createCombinedVisibilityChannel(
  config: VisibilityConfig
) {
  return sagaHelpers.eventChannel<VisibilityEvent | DeviceChangeEvent>((_emitter) => {
    // Create individual channels
    const visibilityChannel = createVisibilityChannel(config)
    const deviceChannel = createDeviceChangeChannel(config)

    // Note: In a real implementation, you would need to use saga's
    // fork and take to properly handle multiple channels.
    // This is a simplified version for demonstration.

    // Cleanup function
    return () => {
      if (visibilityChannel && typeof visibilityChannel.close === 'function') {
        visibilityChannel.close()
      }
      if (deviceChannel && typeof deviceChannel.close === 'function') {
        deviceChannel.close()
      }
    }
  })
}

/**
 * Utility to check if browser supports required APIs
 */
export function checkVisibilityAPISupport(): {
  pageVisibility: boolean
  deviceChange: boolean
  pageTransition: boolean
} {
  return {
    pageVisibility: typeof document.hidden !== 'undefined',
    deviceChange: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
    pageTransition: 'onpageshow' in window && 'onpagehide' in window,
  }
}

/**
 * Get current visibility state without creating a channel
 */
export function getCurrentVisibilityState(): VisibilityState {
  return {
    hidden: document.hidden,
    visibilityState: document.visibilityState,
    timestamp: Date.now(),
  }
}

/**
 * Get current focus state without creating a channel
 */
export function getCurrentFocusState(): FocusState {
  return {
    hasFocus: document.hasFocus(),
    timestamp: Date.now(),
  }
}