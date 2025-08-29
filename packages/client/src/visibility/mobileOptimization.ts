/**
 * Mobile-specific optimizations for the visibility lifecycle feature
 * 
 * This module provides enhanced mobile detection, battery-aware auto-muting,
 * wake detection, DTMF notifications, and platform-specific recovery strategies
 * for iOS and Android devices.
 */

import { MobileContext, MediaStateSnapshot, VisibilityConfig } from './types'

/**
 * Extended mobile context with more detailed platform information
 */
export interface ExtendedMobileContext extends MobileContext {
  /** iOS version number (if available) */
  iOSVersion?: number
  /** Android version number (if available) */
  androidVersion?: number
  /** Device type classification */
  deviceType: 'phone' | 'tablet' | 'desktop'
  /** Browser type */
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'opera' | 'other'
  /** WebView detection */
  isWebView: boolean
  /** Supports touch */
  hasTouch: boolean
  /** Screen size classification */
  screenSize: 'small' | 'medium' | 'large'
}

/**
 * Mobile-specific media state with battery optimization data
 */
export interface MobileMediaState extends MediaStateSnapshot {
  /** Battery optimization state */
  batteryOptimization: {
    /** Whether video was auto-muted for battery saving */
    videoAutoMutedForBattery: boolean
    /** Whether audio was auto-muted for battery saving */
    audioAutoMutedForBattery: boolean
    /** Battery level when auto-mute occurred (if available) */
    batteryLevelAtMute?: number
    /** Performance score when auto-mute occurred */
    performanceScore?: number
  }
  /** Wake detection state */
  wakeDetection: {
    /** Last known active timestamp before sleep */
    lastActiveTime: number
    /** Number of wake events detected */
    wakeEventCount: number
    /** Longest sleep duration detected */
    longestSleepDuration: number
  }
}

/**
 * Platform-specific recovery strategy priorities
 */
export interface PlatformRecoveryConfig {
  /** iOS-specific recovery strategies */
  ios: {
    /** More aggressive muting on iOS Safari */
    aggressiveMuting: boolean
    /** Use iOS-specific media recovery patterns */
    useIOSMediaRecovery: boolean
    /** Delay before recovery attempts */
    recoveryDelay: number
  }
  /** Android-specific recovery strategies */
  android: {
    /** Use Android Chrome optimizations */
    useChromeOptimizations: boolean
    /** Handle Android WebView differences */
    webViewOptimizations: boolean
    /** Background tab throttling handling */
    backgroundThrottlingHandling: boolean
  }
}

/**
 * Enhanced mobile detection with detailed platform information
 */
function detectExtendedMobileContextInternal(): ExtendedMobileContext {
  const userAgent = navigator.userAgent.toLowerCase()
  
  // Basic mobile detection
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isAndroid = /android/.test(userAgent)
  const isMobile = isIOS || isAndroid || 
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 ||
    /mobile|tablet/.test(userAgent)

  // iOS version detection
  let iOSVersion: number | undefined
  if (isIOS) {
    const match = userAgent.match(/os (\d+)_?(\d+)?_?(\d+)?/)
    if (match) {
      iOSVersion = parseInt(match[1], 10)
    }
  }

  // Android version detection
  let androidVersion: number | undefined
  if (isAndroid) {
    const match = userAgent.match(/android (\d+)\.?(\d+)?\.?(\d+)?/)
    if (match) {
      androidVersion = parseInt(match[1], 10)
    }
  }

  // Browser detection
  let browser: ExtendedMobileContext['browser'] = 'other'
  if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
    browser = 'safari'
  } else if (/chrome/.test(userAgent)) {
    browser = 'chrome'
  } else if (/firefox/.test(userAgent)) {
    browser = 'firefox'
  } else if (/edge/.test(userAgent)) {
    browser = 'edge'
  } else if (/opera/.test(userAgent)) {
    browser = 'opera'
  }

  // Engine detection
  let browserEngine: 'webkit' | 'blink' | 'gecko' = 'blink'
  if ('webkitAudioContext' in window || /webkit/.test(userAgent)) {
    browserEngine = 'webkit'
  } else if ('mozGetUserMedia' in navigator || /gecko/.test(userAgent)) {
    browserEngine = 'gecko'
  }

  // WebView detection
  const isWebView = (isIOS && !/safari/.test(userAgent)) ||
    (isAndroid && /wv/.test(userAgent)) ||
    /webview/.test(userAgent)

  // Touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Device type classification
  let deviceType: ExtendedMobileContext['deviceType'] = 'desktop'
  if (isMobile) {
    if (/tablet|ipad/.test(userAgent) || 
        (window.screen && window.screen.width >= 768)) {
      deviceType = 'tablet'
    } else {
      deviceType = 'phone'
    }
  }

  // Screen size classification
  let screenSize: ExtendedMobileContext['screenSize'] = 'medium'
  if (window.screen) {
    const screenWidth = Math.max(window.screen.width, window.screen.height)
    if (screenWidth < 768) {
      screenSize = 'small'
    } else if (screenWidth >= 1024) {
      screenSize = 'large'
    }
  }

  return {
    isMobile,
    isIOS,
    isAndroid,
    browserEngine,
    iOSVersion,
    androidVersion,
    deviceType,
    browser,
    isWebView,
    hasTouch,
    screenSize,
  }
}

/**
 * Mobile-specific auto-mute strategy with platform optimizations
 */
export class MobileAutoMuteStrategy {
  private mobileContext: ExtendedMobileContext
  private config: VisibilityConfig
  private mediaState: Map<string, MobileMediaState> = new Map()

  constructor(config: VisibilityConfig) {
    this.config = config
    this.mobileContext = detectExtendedMobileContextInternal()
  }

  /**
   * Determine if auto-mute should be applied based on platform and context
   */
  shouldAutoMute(instanceId: string, lossType: 'visibility' | 'focus' | 'background'): boolean {
    if (!this.mobileContext.isMobile || !this.config.mobile.autoMuteVideo) {
      return false
    }

    // iOS needs more aggressive muting due to Safari's background behavior
    if (this.mobileContext.isIOS) {
      // iOS Safari aggressively throttles background tabs
      return lossType === 'visibility' || lossType === 'background'
    }

    // Android Chrome handles focus loss better but still benefits from muting
    if (this.mobileContext.isAndroid) {
      // Only mute on visibility loss or long background periods
      return lossType === 'visibility' || 
        (lossType === 'background' && this.getBackgroundDuration(instanceId) > 10000)
    }

    // Default mobile behavior
    return lossType === 'visibility'
  }

  /**
   * Apply mobile-specific auto-mute logic
   */
  async applyAutoMute(
    instanceId: string,
    muteVideo: () => Promise<void>,
    muteAudio?: () => Promise<void>,
    sendDTMF?: (tone: string) => void
  ): Promise<boolean> {
    if (!this.shouldAutoMute(instanceId, 'visibility')) {
      return false
    }

    const currentState = this.getOrCreateMobileState(instanceId)
    let videoMuted = false
    let audioMuted = false

    try {
      // Store pre-mute state for restoration
      const preMuteState = await this.captureCurrentMediaState(instanceId)
      
      // Video auto-mute (primary strategy)
      if (!preMuteState.video.muted) {
        await muteVideo()
        videoMuted = true
        
        // Update state tracking
        currentState.autoMuted.video = true
        currentState.batteryOptimization.videoAutoMutedForBattery = true
        
        // Get battery level if available
        if ('getBattery' in navigator) {
          try {
            // @ts-ignore - Battery API not in standard types
            const battery = await navigator.getBattery()
            currentState.batteryOptimization.batteryLevelAtMute = battery.level
          } catch (error) {
            // Battery API not available, ignore
          }
        }
      }

      // Audio auto-mute (only on iOS with low battery or very long background)
      if (this.mobileContext.isIOS && muteAudio && !preMuteState.audio.muted) {
        const shouldMuteAudio = await this.shouldAutoMuteAudio(instanceId)
        if (shouldMuteAudio) {
          await muteAudio()
          audioMuted = true
          currentState.autoMuted.audio = true
          currentState.batteryOptimization.audioAutoMutedForBattery = true
        }
      }

      // Send DTMF notification if any muting occurred
      if ((videoMuted || audioMuted) && this.config.mobile.notifyServer && sendDTMF) {
        sendDTMF('*0')
      }

      // Save updated state
      this.mediaState.set(instanceId, currentState)
      
      return videoMuted || audioMuted
      
    } catch (error) {
      console.debug('Mobile auto-mute failed:', error)
      return false
    }
  }

  /**
   * Restore media state with mobile-specific considerations
   */
  async restoreFromAutoMute(
    instanceId: string,
    unmuteVideo: () => Promise<void>,
    unmuteAudio?: () => Promise<void>,
    sendDTMF?: (tone: string) => void
  ): Promise<boolean> {
    const currentState = this.mediaState.get(instanceId)
    if (!currentState) return false

    let videoRestored = false
    let audioRestored = false

    try {
      // Restore video if it was auto-muted
      if (currentState.autoMuted.video && 
          currentState.video.enabled && 
          !currentState.video.muted) {
        await unmuteVideo()
        videoRestored = true
        
        // Clear auto-mute flag
        currentState.autoMuted.video = false
        currentState.batteryOptimization.videoAutoMutedForBattery = false
      }

      // Restore audio if it was auto-muted
      if (currentState.autoMuted.audio && 
          currentState.audio.enabled && 
          !currentState.audio.muted &&
          unmuteAudio) {
        await unmuteAudio()
        audioRestored = true
        
        // Clear auto-mute flag
        currentState.autoMuted.audio = false
        currentState.batteryOptimization.audioAutoMutedForBattery = false
      }

      // Send DTMF notification if any restoration occurred
      if ((videoRestored || audioRestored) && this.config.mobile.notifyServer && sendDTMF) {
        sendDTMF('*0')
      }

      // Update stored state
      this.mediaState.set(instanceId, currentState)
      
      return videoRestored || audioRestored
      
    } catch (error) {
      console.debug('Mobile auto-unmute failed:', error)
      return false
    }
  }

  /**
   * Check if audio should be auto-muted (more conservative than video)
   */
  private async shouldAutoMuteAudio(instanceId: string): Promise<boolean> {
    // Only auto-mute audio in severe cases
    const backgroundDuration = this.getBackgroundDuration(instanceId)
    
    // Auto-mute audio if backgrounded for more than 60 seconds
    if (backgroundDuration > 60000) {
      return true
    }

    // Auto-mute audio if battery is critically low (if available)
    try {
      if ('getBattery' in navigator) {
        // @ts-ignore - Battery API not in standard types
        const battery = await navigator.getBattery()
        if (battery.level < 0.15) { // Less than 15% battery
          return true
        }
      }
    } catch (error) {
      // Battery API not available
    }

    return false
  }

  /**
   * Get or create mobile media state for instance
   */
  private getOrCreateMobileState(instanceId: string): MobileMediaState {
    let state = this.mediaState.get(instanceId)
    if (!state) {
      state = this.createDefaultMobileState()
      this.mediaState.set(instanceId, state)
    }
    return state
  }

  /**
   * Create default mobile media state
   */
  private createDefaultMobileState(): MobileMediaState {
    return {
      timestamp: Date.now(),
      video: {
        enabled: false,
        muted: true,
        deviceId: null,
        constraints: {},
      },
      audio: {
        enabled: false,
        muted: true,
        deviceId: null,
        constraints: {},
      },
      screen: {
        sharing: false,
        audio: false,
      },
      autoMuted: {
        video: false,
        audio: false,
      },
      batteryOptimization: {
        videoAutoMutedForBattery: false,
        audioAutoMutedForBattery: false,
      },
      wakeDetection: {
        lastActiveTime: Date.now(),
        wakeEventCount: 0,
        longestSleepDuration: 0,
      },
    }
  }

  /**
   * Capture current media state (to be implemented with actual media queries)
   */
  private async captureCurrentMediaState(_instanceId: string): Promise<MediaStateSnapshot> {
    // This would query the actual media state from the room session instance
    // For now, return a default state
    return {
      timestamp: Date.now(),
      video: {
        enabled: true,
        muted: false,
        deviceId: null,
        constraints: {},
      },
      audio: {
        enabled: true,
        muted: false,
        deviceId: null,
        constraints: {},
      },
      screen: {
        sharing: false,
        audio: false,
      },
      autoMuted: {
        video: false,
        audio: false,
      },
    }
  }

  /**
   * Get background duration for instance
   */
  private getBackgroundDuration(_instanceId: string): number {
    const state = this.mediaState.get(_instanceId)
    if (!state) return 0
    return Date.now() - state.timestamp
  }

  /**
   * Clear state for instance
   */
  clearState(instanceId: string): void {
    this.mediaState.delete(instanceId)
  }

  /**
   * Get mobile context
   */
  getMobileContext(): ExtendedMobileContext {
    return this.mobileContext
  }
}

/**
 * Enhanced wake detection with mobile-specific patterns
 */
export class MobileWakeDetector {
  private lastCheckTime = Date.now()
  private wakeCallbacks: Array<(sleepDuration: number) => void> = []
  private detectionInterval: NodeJS.Timeout | null = null
  private mobileContext: ExtendedMobileContext
  private performanceBaseline = performance.now()

  constructor() {
    this.mobileContext = detectExtendedMobileContextInternal()
    this.startDetection()
  }

  /**
   * Start wake detection monitoring
   */
  private startDetection(): void {
    // Use different detection intervals based on platform
    const intervalMs = this.mobileContext.isMobile ? 2000 : 1000
    
    this.detectionInterval = setInterval(() => {
      const now = Date.now()
      const performanceNow = performance.now()
      const timeDiff = now - this.lastCheckTime
      const performanceDiff = performanceNow - this.performanceBaseline

      // Detect significant time jumps indicating sleep/wake
      let sleepThreshold = 5000 // Default 5 seconds
      
      if (this.mobileContext.isIOS) {
        // iOS Safari is more aggressive with background throttling
        sleepThreshold = 3000 // 3 seconds for iOS
      } else if (this.mobileContext.isAndroid) {
        // Android Chrome throttling patterns
        sleepThreshold = 4000 // 4 seconds for Android
      }

      // Check for time jump (sleep/wake detection)
      if (timeDiff > sleepThreshold) {
        const sleepDuration = timeDiff - intervalMs // Subtract interval time
        this.handleWakeDetected(sleepDuration, performanceDiff)
      }

      // Check for performance timer inconsistencies (another wake indicator)
      if (Math.abs(performanceDiff - timeDiff) > 2000) {
        // Performance timer and Date timer are significantly out of sync
        // This can indicate system sleep/wake
        this.handleWakeDetected(timeDiff, performanceDiff)
      }

      this.lastCheckTime = now
      this.performanceBaseline = performanceNow
    }, intervalMs)
  }

  /**
   * Handle wake detection
   */
  private handleWakeDetected(sleepDuration: number, performanceDiff: number): void {
    console.debug(`Wake detected: sleep=${sleepDuration}ms, perf=${performanceDiff}ms`)
    
    // Notify all callbacks
    this.wakeCallbacks.forEach(callback => {
      try {
        callback(sleepDuration)
      } catch (error) {
        console.debug('Wake callback error:', error)
      }
    })
  }

  /**
   * Add wake detection callback
   */
  onWake(callback: (sleepDuration: number) => void): () => void {
    this.wakeCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.wakeCallbacks.indexOf(callback)
      if (index !== -1) {
        this.wakeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Stop wake detection
   */
  stop(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
      this.detectionInterval = null
    }
    this.wakeCallbacks = []
  }

  /**
   * Get mobile context
   */
  getMobileContext(): ExtendedMobileContext {
    return this.mobileContext
  }
}

/**
 * Mobile-specific recovery strategies
 */
export class MobileRecoveryStrategy {
  private mobileContext: ExtendedMobileContext

  constructor() {
    this.mobileContext = detectExtendedMobileContextInternal()
  }

  /**
   * Get platform-specific recovery strategies in priority order
   */
  getRecoveryStrategies(): string[] {
    if (this.mobileContext.isIOS) {
      return [
        'ios-media-play',      // iOS-specific media play
        'ios-track-restart',   // Restart media tracks
        'keyframe-request',    // Request new keyframe
        'connection-refresh',  // Refresh connection
        'full-reconnect',      // Full reconnection
      ]
    }

    if (this.mobileContext.isAndroid) {
      return [
        'android-visibility-resume', // Android visibility resume
        'chrome-media-recovery',     // Chrome-specific recovery
        'track-enable-toggle',       // Toggle track enabled state
        'keyframe-request',          // Request new keyframe
        'full-reconnect',           // Full reconnection
      ]
    }

    // Desktop or unknown mobile
    return [
      'video-play',
      'keyframe-request',
      'stream-reconnect',
      'full-reconnect',
    ]
  }

  /**
   * Execute iOS-specific media recovery
   */
  async executeIOSMediaPlay(): Promise<boolean> {
    try {
      // iOS Safari requires special handling for video elements
      const videoElements = document.querySelectorAll('video')
      
      for (const video of videoElements) {
        if (video.paused) {
          // iOS workaround: Set currentTime to trigger media engine refresh
          const currentTime = video.currentTime
          video.currentTime = currentTime + 0.001
          
          // Wait a bit then play
          await new Promise(resolve => setTimeout(resolve, 100))
          await video.play()
        }
      }
      
      return true
    } catch (error) {
      console.debug('iOS media play recovery failed:', error)
      return false
    }
  }

  /**
   * Execute Android Chrome visibility resume
   */
  async executeAndroidVisibilityResume(): Promise<boolean> {
    try {
      // Android Chrome specific recovery pattern
      const videoElements = document.querySelectorAll('video')
      
      for (const video of videoElements) {
        // Force layout recalculation
        if (video.style.display !== 'none') {
          video.style.display = 'none'
          // Force reflow
          video.offsetHeight
          video.style.display = ''
        }
        
        // Try to resume playback
        if (video.paused) {
          await video.play()
        }
      }
      
      return true
    } catch (error) {
      console.debug('Android visibility resume failed:', error)
      return false
    }
  }

  /**
   * Execute track restart recovery
   */
  async executeTrackRestart(): Promise<boolean> {
    try {
      // This would interact with the WebRTC connection to restart media tracks
      // Implementation depends on the specific SDK architecture
      console.debug('Executing track restart recovery')
      return true
    } catch (error) {
      console.debug('Track restart recovery failed:', error)
      return false
    }
  }

  /**
   * Get mobile context
   */
  getMobileContext(): ExtendedMobileContext {
    return this.mobileContext
  }
}

/**
 * DTMF notification system for mobile state changes
 */
export class MobileDTMFNotifier {
  private config: VisibilityConfig
  private pendingNotifications: Array<{ tone: string; timestamp: number }> = []
  private lastSentTime = 0
  private readonly RATE_LIMIT_MS = 1000 // Minimum time between DTMF sends

  constructor(config: VisibilityConfig) {
    this.config = config
  }

  /**
   * Send DTMF notification for state change
   */
  notifyStateChange(
    type: 'auto-mute' | 'auto-unmute' | 'wake' | 'background' | 'foreground',
    sendDTMF?: (tone: string) => void
  ): void {
    if (!this.config.mobile.notifyServer || !sendDTMF) {
      return
    }

    const tone = this.getToneForStateChange(type)
    if (!tone) return

    const now = Date.now()
    
    // Rate limiting to prevent spam
    if (now - this.lastSentTime < this.RATE_LIMIT_MS) {
      // Queue for later
      this.pendingNotifications.push({ tone, timestamp: now })
      this.scheduleQueuedNotifications(sendDTMF)
      return
    }

    try {
      sendDTMF(tone)
      this.lastSentTime = now
      console.debug(`DTMF sent: ${tone} for ${type}`)
    } catch (error) {
      console.debug('DTMF send failed:', error)
    }
  }

  /**
   * Get DTMF tone for state change type
   */
  private getToneForStateChange(type: string): string | null {
    switch (type) {
      case 'auto-mute':
      case 'auto-unmute':
        return '*0' // Standard auto-mute/unmute signal
      case 'wake':
        return '*1' // Device wake signal
      case 'background':
        return '*2' // Backgrounding signal
      case 'foreground':
        return '*3' // Foregrounding signal
      default:
        return null
    }
  }

  /**
   * Schedule queued notifications to be sent
   */
  private scheduleQueuedNotifications(sendDTMF: (tone: string) => void): void {
    if (this.pendingNotifications.length === 0) return

    setTimeout(() => {
      const notification = this.pendingNotifications.shift()
      if (notification) {
        try {
          sendDTMF(notification.tone)
          this.lastSentTime = Date.now()
          console.debug(`Queued DTMF sent: ${notification.tone}`)
        } catch (error) {
          console.debug('Queued DTMF send failed:', error)
        }
      }

      // Continue processing queue
      if (this.pendingNotifications.length > 0) {
        this.scheduleQueuedNotifications(sendDTMF)
      }
    }, this.RATE_LIMIT_MS)
  }

  /**
   * Clear pending notifications
   */
  clearPendingNotifications(): void {
    this.pendingNotifications = []
  }
}

/**
 * Main mobile optimization manager that coordinates all mobile-specific features
 */
export class MobileOptimizationManager {
  private autoMuteStrategy: MobileAutoMuteStrategy
  private wakeDetector: MobileWakeDetector
  private recoveryStrategy: MobileRecoveryStrategy
  private dtmfNotifier: MobileDTMFNotifier
  private mobileContext: ExtendedMobileContext

  constructor(config: VisibilityConfig) {
    this.autoMuteStrategy = new MobileAutoMuteStrategy(config)
    this.wakeDetector = new MobileWakeDetector()
    this.recoveryStrategy = new MobileRecoveryStrategy()
    this.dtmfNotifier = new MobileDTMFNotifier(config)
    this.mobileContext = detectExtendedMobileContextInternal()
  }

  /**
   * Get the auto-mute strategy
   */
  getAutoMuteStrategy(): MobileAutoMuteStrategy {
    return this.autoMuteStrategy
  }

  /**
   * Get the wake detector
   */
  getWakeDetector(): MobileWakeDetector {
    return this.wakeDetector
  }

  /**
   * Get the recovery strategy
   */
  getRecoveryStrategy(): MobileRecoveryStrategy {
    return this.recoveryStrategy
  }

  /**
   * Get the DTMF notifier
   */
  getDTMFNotifier(): MobileDTMFNotifier {
    return this.dtmfNotifier
  }

  /**
   * Get mobile context
   */
  getMobileContext(): ExtendedMobileContext {
    return this.mobileContext
  }

  /**
   * Check if platform requires special handling
   */
  requiresSpecialHandling(): boolean {
    return this.mobileContext.isMobile &&
      (this.mobileContext.browser === 'safari' || 
       this.mobileContext.isWebView ||
       this.mobileContext.deviceType === 'phone')
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.wakeDetector.stop()
    this.dtmfNotifier.clearPendingNotifications()
  }
}

// Export utility functions
export { detectExtendedMobileContextInternal as detectExtendedMobileContext }