/**
 * VisibilityManager - Core class for managing visibility lifecycle events
 */

import { EventEmitter, getLogger } from '@signalwire/core'
import type RTCPeer from '@signalwire/webrtc/src/RTCPeer'
import { BaseRoomSession } from '../BaseRoomSession'
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
import {
  executeKeyframeRequestRecovery,
  executeStreamReconnectionRecovery,
} from './recoveryStrategies'

/**
 * Interface for room session instances that can be managed
 * Based on BaseRoomSession with additional capabilities
 */
interface ManagedRoomSession {
  id: string
  // Video controls (multiple method names for compatibility)
  muteVideo?: () => Promise<void>
  unmuteVideo?: () => Promise<void>
  videoMute?: () => Promise<void>
  videoUnmute?: () => Promise<void>
  // Audio controls (multiple method names for compatibility)  
  muteAudio?: () => Promise<void>
  unmuteAudio?: () => Promise<void>
  audioMute?: () => Promise<void>
  audioUnmute?: () => Promise<void>
  // Device controls
  updateVideoDevice?: (params: { deviceId: string }) => Promise<void>
  updateAudioDevice?: (params: { deviceId: string }) => Promise<void>
  // Connection controls
  reconnect?: () => Promise<void>
  // Layout controls
  setLayout?: (params: { name: string }) => Promise<void>
  // Event emission (simplified)
  emit?: (event: string, ...args: any[]) => void
  // WebRTC peer connection
  peer?: RTCPeer<any>
  // Video overlays for accessing video elements
  localVideoOverlay?: { domElement?: Element }
  overlayMap?: Map<string, { domElement?: Element }>
  // Screen share state
  screenShareList?: any[]
  // Media state properties
  audioMuted?: boolean
  videoMuted?: boolean
  // Device IDs
  cameraId?: string | null
  microphoneId?: string | null
  // Track constraints
  cameraConstraints?: any
  microphoneConstraints?: any
  // Member state (for CallSession)
  member?: { audioMuted?: boolean; videoMuted?: boolean }
  selfMember?: { audioMuted?: boolean; videoMuted?: boolean }
}

/**
 * Media state manager for preserving state across visibility changes
 */
class MediaStateManager {
  private snapshots = new Map<string, MediaStateSnapshot>()
  private logger = getLogger()

  /**
   * Capture the current media state from a room session instance
   */
  captureCurrentMediaState(instance: ManagedRoomSession): MediaStateSnapshot {
    const snapshot = this.createDefaultSnapshot()
    
    try {
      // Capture audio state
      // Check multiple possible property/method names for compatibility
      const audioMuted = this.getAudioMutedState(instance)
      const audioEnabled = !audioMuted
      
      snapshot.audio = {
        enabled: audioEnabled,
        muted: audioMuted,
        deviceId: this.getAudioDeviceId(instance),
        constraints: this.getAudioConstraints(instance),
      }

      // Capture video state
      const videoMuted = this.getVideoMutedState(instance)
      const videoEnabled = !videoMuted
      
      snapshot.video = {
        enabled: videoEnabled,
        muted: videoMuted,
        deviceId: this.getVideoDeviceId(instance),
        constraints: this.getVideoConstraints(instance),
      }

      // Capture screen share state
      snapshot.screen = {
        sharing: this.getScreenShareState(instance),
        audio: false, // Could be enhanced to check screen share audio
      }

      // Preserve auto-muted flags if they exist
      const existingSnapshot = this.snapshots.get(instance.id)
      if (existingSnapshot?.autoMuted) {
        snapshot.autoMuted = existingSnapshot.autoMuted
      }

      this.logger.debug('Captured media state:', snapshot)
    } catch (error) {
      this.logger.error('Error capturing media state:', error)
    }

    return snapshot
  }

  /**
   * Restore media state to a room session instance
   */
  async restoreMediaState(instance: ManagedRoomSession, snapshot: MediaStateSnapshot): Promise<void> {
    try {
      // Restore video state
      if (snapshot.autoMuted.video && snapshot.video.enabled && !snapshot.video.muted) {
        // Video was auto-muted and should be restored
        await this.unmuteVideo(instance)
        this.logger.debug('Restored video unmute state')
      } else if (!snapshot.autoMuted.video) {
        // Restore actual video state
        if (snapshot.video.muted && !this.getVideoMutedState(instance)) {
          await this.muteVideo(instance)
          this.logger.debug('Restored video mute state')
        } else if (!snapshot.video.muted && this.getVideoMutedState(instance)) {
          await this.unmuteVideo(instance)
          this.logger.debug('Restored video unmute state')
        }
      }

      // Restore audio state
      if (snapshot.autoMuted.audio && snapshot.audio.enabled && !snapshot.audio.muted) {
        // Audio was auto-muted and should be restored
        await this.unmuteAudio(instance)
        this.logger.debug('Restored audio unmute state')
      } else if (!snapshot.autoMuted.audio) {
        // Restore actual audio state
        if (snapshot.audio.muted && !this.getAudioMutedState(instance)) {
          await this.muteAudio(instance)
          this.logger.debug('Restored audio mute state')
        } else if (!snapshot.audio.muted && this.getAudioMutedState(instance)) {
          await this.unmuteAudio(instance)
          this.logger.debug('Restored audio unmute state')
        }
      }

      // Restore device selections if changed
      if (snapshot.video.deviceId) {
        const currentVideoDevice = this.getVideoDeviceId(instance)
        if (currentVideoDevice !== snapshot.video.deviceId) {
          await this.updateVideoDevice(instance, snapshot.video.deviceId)
          this.logger.debug('Restored video device:', snapshot.video.deviceId)
        }
      }

      if (snapshot.audio.deviceId) {
        const currentAudioDevice = this.getAudioDeviceId(instance)
        if (currentAudioDevice !== snapshot.audio.deviceId) {
          await this.updateAudioDevice(instance, snapshot.audio.deviceId)
          this.logger.debug('Restored audio device:', snapshot.audio.deviceId)
        }
      }

      this.logger.debug('Media state restoration completed')
    } catch (error) {
      this.logger.error('Error restoring media state:', error)
    }
  }

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

  // Helper methods for state detection
  private getAudioMutedState(instance: any): boolean {
    // Check various possible property names
    if ('audioMuted' in instance) return instance.audioMuted
    if ('localAudioMuted' in instance) return instance.localAudioMuted
    if ('isAudioMuted' in instance) return instance.isAudioMuted
    // Check for member state
    if (instance.member && 'audioMuted' in instance.member) return instance.member.audioMuted
    if (instance.selfMember && 'audioMuted' in instance.selfMember) return instance.selfMember.audioMuted
    // Default to muted if unknown
    return true
  }

  private getVideoMutedState(instance: any): boolean {
    // Check various possible property names
    if ('videoMuted' in instance) return instance.videoMuted
    if ('localVideoMuted' in instance) return instance.localVideoMuted
    if ('isVideoMuted' in instance) return instance.isVideoMuted
    // Check for member state
    if (instance.member && 'videoMuted' in instance.member) return instance.member.videoMuted
    if (instance.selfMember && 'videoMuted' in instance.selfMember) return instance.selfMember.videoMuted
    // Default to muted if unknown
    return true
  }

  private getScreenShareState(instance: any): boolean {
    if ('screenShareList' in instance && Array.isArray(instance.screenShareList)) {
      return instance.screenShareList.length > 0
    }
    if ('isScreenSharing' in instance) return instance.isScreenSharing
    return false
  }

  private getAudioDeviceId(instance: any): string | null {
    if ('microphoneId' in instance) return instance.microphoneId
    if ('audioDeviceId' in instance) return instance.audioDeviceId
    if ('currentAudioDevice' in instance) return instance.currentAudioDevice
    return null
  }

  private getVideoDeviceId(instance: any): string | null {
    if ('cameraId' in instance) return instance.cameraId
    if ('videoDeviceId' in instance) return instance.videoDeviceId
    if ('currentVideoDevice' in instance) return instance.currentVideoDevice
    return null
  }

  private getAudioConstraints(instance: any): any {
    if ('microphoneConstraints' in instance) return instance.microphoneConstraints
    if ('audioConstraints' in instance) return instance.audioConstraints
    return {}
  }

  private getVideoConstraints(instance: any): any {
    if ('cameraConstraints' in instance) return instance.cameraConstraints
    if ('videoConstraints' in instance) return instance.videoConstraints
    return {}
  }

  // Helper methods for state restoration
  private async muteAudio(instance: any): Promise<void> {
    if (instance.audioMute) return instance.audioMute()
    if (instance.muteAudio) return instance.muteAudio()
    if (instance.setAudioMuted) return instance.setAudioMuted(true)
  }

  private async unmuteAudio(instance: any): Promise<void> {
    if (instance.audioUnmute) return instance.audioUnmute()
    if (instance.unmuteAudio) return instance.unmuteAudio()
    if (instance.setAudioMuted) return instance.setAudioMuted(false)
  }

  private async muteVideo(instance: any): Promise<void> {
    if (instance.videoMute) return instance.videoMute()
    if (instance.muteVideo) return instance.muteVideo()
    if (instance.setVideoMuted) return instance.setVideoMuted(true)
  }

  private async unmuteVideo(instance: any): Promise<void> {
    if (instance.videoUnmute) return instance.videoUnmute()
    if (instance.unmuteVideo) return instance.unmuteVideo()
    if (instance.setVideoMuted) return instance.setVideoMuted(false)
  }

  private async updateAudioDevice(instance: any, deviceId: string): Promise<void> {
    if (instance.updateAudioDevice) return instance.updateAudioDevice({ deviceId })
    if (instance.setAudioDevice) return instance.setAudioDevice(deviceId)
    if (instance.updateMicrophone) return instance.updateMicrophone({ deviceId })
  }

  private async updateVideoDevice(instance: any, deviceId: string): Promise<void> {
    if (instance.updateVideoDevice) return instance.updateVideoDevice({ deviceId })
    if (instance.setVideoDevice) return instance.setVideoDevice(deviceId)
    if (instance.updateCamera) return instance.updateCamera({ deviceId })
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
  
  constructor(private visibilityManager: VisibilityManager) {}

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
        
      case RecoveryStrategy.LayoutRefresh:
        return this.visibilityManager.refreshLayout()
        
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

  private async requestKeyframe(instance: ManagedRoomSession): Promise<boolean> {
    const logger = getLogger()
    try {
      logger.debug('Requesting keyframe for WebRTC recovery')
      
      // Use the existing keyframe request recovery strategy
      if (instance as BaseRoomSession) {
        const result = await executeKeyframeRequestRecovery(instance as BaseRoomSession)
        return result.success
      }
      
      // Fallback: Direct PLI request implementation
      const peer = instance.peer as RTCPeer<any>
      if (!peer?.instance) {
        logger.debug('No active RTCPeerConnection available for keyframe request')
        return false
      }

      const peerConnection = peer.instance
      const receivers = peerConnection.getReceivers()
      const videoReceivers = receivers.filter(
        (receiver) => receiver.track?.kind === 'video' && receiver.track?.readyState === 'live'
      )

      if (videoReceivers.length === 0) {
        logger.debug('No active video receivers found for keyframe request')
        return false
      }

      // Request keyframes by triggering stats collection which may induce PLI
      let pliCount = 0
      for (const receiver of videoReceivers) {
        try {
          await receiver.getStats()
          pliCount++
        } catch (error) {
          logger.debug('PLI request failed for receiver:', error)
        }
      }

      // Wait briefly for potential keyframe response
      await new Promise(resolve => setTimeout(resolve, 100))
      
      logger.debug(`Requested keyframes from ${pliCount} video receivers`)
      return pliCount > 0
    } catch (error) {
      logger.debug('Keyframe request failed:', error)
      return false
    }
  }

  private async reconnectStream(instance: ManagedRoomSession): Promise<boolean> {
    const logger = getLogger()
    try {
      logger.debug('Reconnecting media stream for WebRTC recovery')
      
      // Use the existing stream reconnection recovery strategy
      if (instance as BaseRoomSession) {
        const result = await executeStreamReconnectionRecovery(instance as BaseRoomSession)
        return result.success
      }
      
      // Fallback: Direct stream reconnection implementation
      const peer = instance.peer as RTCPeer<any>
      if (!peer?.instance) {
        logger.debug('No active RTCPeerConnection available for stream reconnection')
        return false
      }

      const peerConnection = peer.instance
      const senders = peerConnection.getSenders()
      
      let reconnectedTracks = 0
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'video') {
          try {
            const track = sender.track
            
            // Check if track needs reconnection
            if (track.readyState === 'ended' || track.muted) {
              // Get new video track with same constraints
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              })
              
              const newVideoTrack = stream.getVideoTracks()[0]
              if (newVideoTrack) {
                await sender.replaceTrack(newVideoTrack)
                
                // Update local stream reference if available
                if (peer.localStream) {
                  peer.localStream.removeTrack(track)
                  peer.localStream.addTrack(newVideoTrack)
                }
                
                // Stop the old track
                track.stop()
                reconnectedTracks++
                
                logger.debug('Successfully reconnected video track')
              }
            }
          } catch (error) {
            logger.debug('Track reconnection failed:', error)
          }
        }
      }

      logger.debug(`Reconnected ${reconnectedTracks} video tracks`)
      return reconnectedTracks > 0
    } catch (error) {
      logger.debug('Stream reconnection failed:', error)
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
  private logger = getLogger()
  
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
    this.recoveryOrchestrator = new RecoveryOrchestrator(this)
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
      // First capture current state before auto-muting
      const currentSnapshot = this.mediaStateManager.captureCurrentMediaState(this.instance)
      const wasVideoEnabled = currentSnapshot.video.enabled && !currentSnapshot.video.muted
      
      // Auto-mute video to save battery
      if (wasVideoEnabled) {
        // Try various mute methods
        if (this.instance.muteVideo) {
          await this.instance.muteVideo()
        } else if (this.instance.videoMute) {
          await this.instance.videoMute()
        }
        
        // Mark as auto-muted for restoration
        this.mediaStateManager.saveSnapshot(this.instance.id, {
          ...currentSnapshot,
          autoMuted: { video: true, audio: false },
        })

        // Send DTMF notification if configured
        if (this.config.mobile.notifyServer && this.instance.emit) {
          this.instance.emit('dtmf', { tone: '*0' })
        }

        this.logger.debug('Auto-muted video for mobile optimization')
        return true
      }
    } catch (error) {
      this.logger.error('Auto-mute failed:', error)
    }

    return false
  }

  /**
   * Save current media state
   */
  private async saveCurrentMediaState(): Promise<void> {
    if (!this.instance) return

    // Capture the actual media state from the instance
    const snapshot = this.mediaStateManager.captureCurrentMediaState(this.instance)
    
    // Save the snapshot
    this.mediaStateManager.saveSnapshot(this.instance.id, snapshot)
    
    this.logger.debug('Saved media state snapshot for instance:', this.instance.id)
  }

  /**
   * Restore media state
   */
  private async restoreMediaState(): Promise<void> {
    if (!this.instance) return

    const snapshot = this.mediaStateManager.getSnapshot(this.instance.id)
    if (!snapshot) {
      this.logger.debug('No media state snapshot found for instance:', this.instance.id)
      return
    }

    this.logger.debug('Restoring media state for instance:', this.instance.id)
    
    // Use the MediaStateManager to restore the state
    await this.mediaStateManager.restoreMediaState(this.instance, snapshot)
    
    // Send DTMF notification if configured and video was restored
    if (this.config.mobile.notifyServer && 
        snapshot.autoMuted.video && 
        snapshot.video.enabled && 
        !snapshot.video.muted &&
        this.instance.emit) {
      this.instance.emit('dtmf', { tone: '*0' })
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
   * Refresh video layout to recover from layout issues
   */
  async refreshLayout(): Promise<boolean> {
    const logger = getLogger()
    
    if (!this.instance) {
      logger.debug('No instance available for layout refresh')
      return false
    }

    try {
      logger.debug('Refreshing video layout for recovery')
      
      // Try to refresh the layout if the capability is available
      if (this.instance.setLayout) {
        // Get current layout name or use a default
        // In a real implementation, you'd store the current layout
        await this.instance.setLayout({ name: 'grid-responsive' })
        
        // Wait briefly for layout to settle
        await new Promise(resolve => setTimeout(resolve, 500))
        
        logger.debug('Layout refresh completed successfully')
        return true
      } else {
        logger.debug('Layout refresh not available - no setLayout capability')
        return false
      }
    } catch (error) {
      logger.debug('Layout refresh failed:', error)
      return false
    }
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