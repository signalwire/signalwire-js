/**
 * VisibilityManager - Core class for managing visibility lifecycle events
 */

import { EventEmitter } from '@signalwire/core'
import {
  VisibilityConfig,
  VisibilityEvent,
  VisibilityState,
  MobileContext,
  MediaStateSnapshot,
  RecoveryStrategy,
  RecoveryStatus,
  VisibilityAPI,
  VisibilityManagerEvents,
  DEFAULT_VISIBILITY_CONFIG,
  DeviceChangeEvent,
} from './types'
import {
  createVisibilityChannel,
  createDeviceChangeChannel,
  detectMobileContext,
  getCurrentVisibilityState,
  checkVisibilityAPISupport,
} from './eventChannel'

/**
 * Interface for room session instances that can be managed
 */
interface ManagedRoomSession {
  id: string
  // Video controls
  muteVideo?: () => Promise<void>
  unmuteVideo?: () => Promise<void>
  // Audio controls  
  muteAudio?: () => Promise<void>
  unmuteAudio?: () => Promise<void>
  // Device controls
  updateVideoDevice?: (params: { deviceId: string }) => Promise<void>
  updateAudioDevice?: (params: { deviceId: string }) => Promise<void>
  // Connection controls
  reconnect?: () => Promise<void>
  // Event emission
  emit?: (event: string, ...args: any[]) => void
}

/**
 * Media state manager for preserving state across visibility changes
 */
class MediaStateManager {
  private snapshots = new Map<string, MediaStateSnapshot>()

  saveSnapshot(instanceId: string, state: Partial<MediaStateSnapshot>): void {
    const existing = this.snapshots.get(instanceId) || this.createDefaultSnapshot()
    this.snapshots.set(instanceId, {
      ...existing,
      ...state,
      timestamp: Date.now(),
    })
  }

  getSnapshot(instanceId: string): MediaStateSnapshot | null {
    return this.snapshots.get(instanceId) || null
  }

  clearSnapshot(instanceId: string): void {
    this.snapshots.delete(instanceId)
  }

  private createDefaultSnapshot(): MediaStateSnapshot {
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
    }
  }
}

/**
 * Recovery orchestrator for handling different recovery strategies
 */
class RecoveryOrchestrator {
  private recoveryStatus: RecoveryStatus = {
    inProgress: false,
    lastAttempt: null,
    lastSuccess: null,
    lastSuccessStrategy: null,
    failureCount: 0,
  }

  async executeRecoveryStrategies(
    instance: ManagedRoomSession,
    strategies: RecoveryStrategy[],
    config: VisibilityConfig
  ): Promise<boolean> {
    this.recoveryStatus.inProgress = true
    this.recoveryStatus.lastAttempt = Date.now()

    const errors: Error[] = []

    for (const strategy of strategies) {
      try {
        const success = await this.executeRecoveryStrategy(instance, strategy, config)
        if (success) {
          this.recoveryStatus.lastSuccess = Date.now()
          this.recoveryStatus.lastSuccessStrategy = strategy
          this.recoveryStatus.failureCount = 0
          this.recoveryStatus.inProgress = false
          return true
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }

      // Delay between attempts
      if (config.recovery.delayBetweenAttempts > 0) {
        await new Promise(resolve => 
          setTimeout(resolve, config.recovery.delayBetweenAttempts)
        )
      }
    }

    this.recoveryStatus.failureCount++
    this.recoveryStatus.inProgress = false
    return false
  }

  private async executeRecoveryStrategy(
    instance: ManagedRoomSession,
    strategy: RecoveryStrategy,
    _config: VisibilityConfig
  ): Promise<boolean> {
    switch (strategy) {
      case RecoveryStrategy.VideoPlay:
        return this.tryVideoPlay(instance)
        
      case RecoveryStrategy.KeyframeRequest:
        return this.requestKeyframe(instance)
        
      case RecoveryStrategy.StreamReconnection:
        return this.reconnectStream(instance)
        
      case RecoveryStrategy.Reinvite:
        return this.reinvite(instance)
        
      default:
        return false
    }
  }

  private async tryVideoPlay(_instance: ManagedRoomSession): Promise<boolean> {
    try {
      // Find video elements and try to play them
      const videoElements = document.querySelectorAll('video')
      let success = false

      for (const video of videoElements) {
        if (video.paused) {
          try {
            await video.play()
            success = true
          } catch (error) {
            console.debug('Video play failed:', error)
          }
        }
      }

      return success
    } catch (error) {
      console.debug('Video play recovery failed:', error)
      return false
    }
  }

  private async requestKeyframe(_instance: ManagedRoomSession): Promise<boolean> {
    try {
      // In a real implementation, this would send a PLI (Picture Loss Indication)
      // request through the WebRTC connection to request a new keyframe
      console.debug('Requesting keyframe for recovery')
      return true
    } catch (error) {
      console.debug('Keyframe request failed:', error)
      return false
    }
  }

  private async reconnectStream(_instance: ManagedRoomSession): Promise<boolean> {
    try {
      // This would reconnect the local media stream
      console.debug('Reconnecting media stream')
      return true
    } catch (error) {
      console.debug('Stream reconnection failed:', error)
      return false
    }
  }

  private async reinvite(instance: ManagedRoomSession): Promise<boolean> {
    try {
      if (instance.reconnect) {
        await instance.reconnect()
        return true
      }
      return false
    } catch (error) {
      console.debug('Re-INVITE failed:', error)
      return false
    }
  }

  getStatus(): RecoveryStatus {
    return { ...this.recoveryStatus }
  }
}

/**
 * Main VisibilityManager class
 */
export class VisibilityManager extends EventEmitter<VisibilityManagerEvents> implements VisibilityAPI {
  private config: VisibilityConfig
  private mobileContext: MobileContext
  private mediaStateManager: MediaStateManager
  private recoveryOrchestrator: RecoveryOrchestrator
  private visibilityChannel: ReturnType<typeof createVisibilityChannel> | null = null
  private deviceChannel: ReturnType<typeof createDeviceChangeChannel> | null = null
  private instance: ManagedRoomSession | null = null
  
  // State tracking
  private currentVisibilityState: VisibilityState
  private backgroundStartTime: number | null = null
  private isInitialized = false

  constructor(
    instance?: ManagedRoomSession,
    config: Partial<VisibilityConfig> = {}
  ) {
    super()
    
    this.config = { ...DEFAULT_VISIBILITY_CONFIG, ...config }
    this.instance = instance || null
    this.mobileContext = detectMobileContext()
    this.mediaStateManager = new MediaStateManager()
    this.recoveryOrchestrator = new RecoveryOrchestrator()
    this.currentVisibilityState = getCurrentVisibilityState()

    if (this.config.enabled) {
      this.initialize()
    }
  }

  /**
   * Initialize the visibility manager
   */
  private initialize(): void {
    if (this.isInitialized) return

    const apiSupport = checkVisibilityAPISupport()
    if (!apiSupport.pageVisibility) {
      console.warn('Page Visibility API not supported')
      return
    }

    this.isInitialized = true
    this.setupEventChannels()
  }

  /**
   * Setup event channels for monitoring
   */
  private setupEventChannels(): void {
    this.visibilityChannel = createVisibilityChannel(this.config)
    
    if (this.config.devices.reEnumerateOnFocus) {
      this.deviceChannel = createDeviceChangeChannel(this.config)
    }
  }

  /**
   * Handle visibility events (to be called by saga worker)
   */
  async handleVisibilityEvent(event: VisibilityEvent): Promise<void> {
    switch (event.type) {
      case 'visibility':
        await this.handleVisibilityChange(event.state)
        break
        
      case 'focus':
        await this.handleFocusGained(event.wasHidden, event.hiddenDuration)
        break
        
      case 'blur':
        await this.handleFocusLost()
        break
        
      case 'pageshow':
        await this.handlePageShow(event.persisted)
        break
        
      case 'pagehide':
        await this.handlePageHide(event.persisted)
        break
        
      case 'wake':
        await this.handleDeviceWake(event.sleepDuration)
        break
    }
  }

  /**
   * Handle device change events
   */
  async handleDeviceChangeEvent(event: DeviceChangeEvent): Promise<void> {
    this.emit('visibility.devices.changed', {
      added: event.changes.added,
      removed: event.changes.removed,
    })

    if (this.instance && this.config.devices.restorePreferences) {
      await this.handleDeviceRecovery()
    }
  }

  /**
   * Handle visibility state changes
   */
  private async handleVisibilityChange(state: VisibilityState): Promise<void> {
    const wasHidden = this.currentVisibilityState.hidden
    this.currentVisibilityState = state

    if (state.hidden && !wasHidden) {
      // Became hidden
      this.backgroundStartTime = state.timestamp
      await this.handleBackgrounding()
    } else if (!state.hidden && wasHidden) {
      // Became visible
      const backgroundDuration = this.backgroundStartTime 
        ? state.timestamp - this.backgroundStartTime 
        : 0
      this.backgroundStartTime = null
      await this.handleForegrounding(backgroundDuration)
    }

    this.emit('visibility.changed', {
      state: state.hidden ? 'hidden' : 'visible',
      timestamp: state.timestamp,
    })
  }

  /**
   * Handle focus gained
   */
  private async handleFocusGained(wasHidden: boolean, hiddenDuration: number): Promise<void> {
    this.emit('visibility.focus.gained', { wasHidden, hiddenDuration })

    if (this.instance && wasHidden && hiddenDuration > this.config.throttling.resumeDelay) {
      // Delay recovery to allow browser to stabilize
      setTimeout(() => {
        this.triggerRecovery('focus_gained')
      }, this.config.throttling.resumeDelay)
    }

    if (this.config.devices.reEnumerateOnFocus) {
      await this.handleDeviceRecovery()
    }
  }

  /**
   * Handle focus lost
   */
  private async handleFocusLost(): Promise<void> {
    let autoMuted = false

    if (this.instance && this.mobileContext.isMobile && this.config.mobile.autoMuteVideo) {
      autoMuted = await this.handleMobileAutoMute()
    }

    this.emit('visibility.focus.lost', { autoMuted })
  }

  /**
   * Handle page show
   */
  private async handlePageShow(persisted: boolean): Promise<void> {
    if (persisted && this.instance) {
      // Page was restored from cache, may need recovery
      await this.triggerRecovery('page_restored')
    }
  }

  /**
   * Handle page hide
   */
  private async handlePageHide(_persisted: boolean): Promise<void> {
    if (this.instance) {
      // Save current state before page is cached
      await this.saveCurrentMediaState()
    }
  }

  /**
   * Handle device wake from sleep
   */
  private async handleDeviceWake(sleepDuration: number): Promise<void> {
    if (this.instance && sleepDuration > 5000) {
      // Device woke from significant sleep, trigger recovery
      await this.triggerRecovery('device_wake')
    }
  }

  /**
   * Handle backgrounding behavior
   */
  private async handleBackgrounding(): Promise<void> {
    if (this.instance) {
      await this.saveCurrentMediaState()
      
      if (this.mobileContext.isMobile && this.config.mobile.autoMuteVideo) {
        await this.handleMobileAutoMute()
      }
    }
  }

  /**
   * Handle foregrounding behavior
   */
  private async handleForegrounding(backgroundDuration: number): Promise<void> {
    if (this.instance && backgroundDuration > this.config.throttling.backgroundThreshold) {
      await this.triggerRecovery('foregrounding')
      await this.restoreMediaState()
    }
  }

  /**
   * Handle mobile auto-mute logic
   */
  private async handleMobileAutoMute(): Promise<boolean> {
    if (!this.instance || !this.mobileContext.isMobile) return false

    try {
      // Auto-mute video to save battery
      if (this.instance.muteVideo) {
        await this.instance.muteVideo()
        
        // Mark as auto-muted for restoration
        this.mediaStateManager.saveSnapshot(this.instance.id, {
          autoMuted: { video: true, audio: false },
        })

        // Send DTMF notification if configured
        if (this.config.mobile.notifyServer && this.instance.emit) {
          this.instance.emit('dtmf', { tone: '*0' })
        }

        return true
      }
    } catch (error) {
      console.debug('Auto-mute failed:', error)
    }

    return false
  }

  /**
   * Save current media state
   */
  private async saveCurrentMediaState(): Promise<void> {
    if (!this.instance) return

    // In a real implementation, this would query the actual media state
    // from the room session instance
    const _snapshot: Partial<MediaStateSnapshot> = {
      timestamp: Date.now(),
      video: {
        enabled: true, // Would query actual state
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

    this.mediaStateManager.saveSnapshot(this.instance.id, _snapshot)
  }

  /**
   * Restore media state
   */
  private async restoreMediaState(): Promise<void> {
    if (!this.instance) return

    const _snapshot = this.mediaStateManager.getSnapshot(this.instance.id)
    if (!_snapshot) return

    try {
      // Restore video state if it was auto-muted
      if (_snapshot.autoMuted.video && 
          _snapshot.video.enabled && 
          !_snapshot.video.muted &&
          this.instance.unmuteVideo) {
        await this.instance.unmuteVideo()
        
        if (this.config.mobile.notifyServer && this.instance.emit) {
          this.instance.emit('dtmf', { tone: '*0' })
        }
      }

      // Restore audio state if it was auto-muted
      if (_snapshot.autoMuted.audio && 
          _snapshot.audio.enabled && 
          !_snapshot.audio.muted &&
          this.instance.unmuteAudio) {
        await this.instance.unmuteAudio()
      }

      // Restore device selections
      if (_snapshot.video.deviceId && this.instance.updateVideoDevice) {
        await this.instance.updateVideoDevice({ deviceId: _snapshot.video.deviceId })
      }
      if (_snapshot.audio.deviceId && this.instance.updateAudioDevice) {
        await this.instance.updateAudioDevice({ deviceId: _snapshot.audio.deviceId })
      }

    } catch (error) {
      console.debug('Media state restoration failed:', error)
    }
  }

  /**
   * Handle device recovery after focus/wake
   */
  private async handleDeviceRecovery(): Promise<void> {
    try {
      // Re-enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      
      // In a real implementation, would check device preferences
      // and reapply them if devices changed
      console.debug('Devices re-enumerated:', devices.length)
      
    } catch (error) {
      console.debug('Device recovery failed:', error)
    }
  }

  /**
   * Trigger recovery process
   */
  private async triggerRecovery(reason: string): Promise<boolean> {
    if (!this.instance) return false

    const strategies = this.config.recovery.strategies.map(s => RecoveryStrategy[s])
    
    this.emit('visibility.recovery.started', { reason, strategies })

    const startTime = Date.now()
    const success = await this.recoveryOrchestrator.executeRecoveryStrategies(
      this.instance,
      this.config.recovery.strategies,
      this.config
    )

    const duration = Date.now() - startTime

    if (success) {
      const strategy = this.recoveryOrchestrator.getStatus().lastSuccessStrategy
      this.emit('visibility.recovery.success', {
        strategy: strategy ? RecoveryStrategy[strategy] : 'unknown',
        duration,
      })
    } else {
      this.emit('visibility.recovery.failed', {
        strategies,
        errors: [], // Would collect actual errors
      })
    }

    return success
  }

  // Public API methods

  async pauseForBackground(): Promise<void> {
    await this.handleBackgrounding()
  }

  async resumeFromBackground(): Promise<void> {
    const duration = this.getBackgroundDuration()
    await this.handleForegrounding(duration)
  }

  isBackgrounded(): boolean {
    return this.currentVisibilityState.hidden
  }

  getVisibilityState(): VisibilityState {
    return { ...this.currentVisibilityState }
  }

  getBackgroundDuration(): number {
    if (!this.backgroundStartTime) return 0
    return Date.now() - this.backgroundStartTime
  }

  updateVisibilityConfig(config: Partial<VisibilityConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getVisibilityConfig(): VisibilityConfig {
    return { ...this.config }
  }

  async triggerManualRecovery(): Promise<boolean> {
    return this.triggerRecovery('manual')
  }

  getRecoveryStatus(): RecoveryStatus {
    return this.recoveryOrchestrator.getStatus()
  }

  /**
   * Get the visibility event channel for saga workers
   */
  getVisibilityChannel(): ReturnType<typeof createVisibilityChannel> | null {
    return this.visibilityChannel
  }

  /**
   * Get the device change event channel for saga workers
   */
  getDeviceChannel(): ReturnType<typeof createDeviceChangeChannel> | null {
    return this.deviceChannel
  }

  /**
   * Get mobile context information
   */
  getMobileContext(): MobileContext {
    return { ...this.mobileContext }
  }

  /**
   * Check if visibility APIs are supported
   */
  static checkSupport() {
    return checkVisibilityAPISupport()
  }

  /**
   * Cleanup and destroy the manager
   */
  destroy(): void {
    if (this.visibilityChannel) {
      this.visibilityChannel.close()
      this.visibilityChannel = null
    }
    
    if (this.deviceChannel) {
      this.deviceChannel.close()
      this.deviceChannel = null
    }

    this.isInitialized = false
    this.removeAllListeners()
  }
}