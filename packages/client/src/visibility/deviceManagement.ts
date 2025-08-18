/**
 * Device Management for Visibility Lifecycle
 * 
 * This module handles device change detection, re-enumeration, preference storage,
 * and device recovery for the visibility lifecycle management feature.
 * 
 * Key features:
 * - Device change detection using devicechange event or polling fallback
 * - Device re-enumeration on focus/visibility restore
 * - Device preference storage and restoration
 * - Device recovery after visibility changes
 * - Integration with BaseRoomSession device management methods
 */

import { eventChannel } from '@redux-saga/core'
import { call, takeEvery } from '@redux-saga/core/effects'
import { getLogger } from '@signalwire/core'
import type { SagaIterator } from '@redux-saga/types'
import type { EventChannel } from '@redux-saga/core'
import {
  enumerateDevices,
  getMicrophoneDevices,
  getCameraDevices,
  getSpeakerDevices,
  supportsMediaOutput,
} from '@signalwire/webrtc'
import {
  VisibilityConfig,
  DeviceChangeEvent,
  DeviceChangeInfo,
} from './types'

const logger = getLogger()

/**
 * Device preference information
 */
export interface DevicePreferences {
  /** Preferred audio input device ID */
  audioInput: string | null
  /** Preferred video input device ID */
  videoInput: string | null
  /** Preferred audio output device ID */
  audioOutput: string | null
  /** Timestamp when preferences were last updated */
  lastUpdated: number
}

/**
 * Device change detection result
 */
export interface DeviceChangeResult {
  /** Devices that were added */
  added: MediaDeviceInfo[]
  /** Devices that were removed */
  removed: MediaDeviceInfo[]
  /** All current devices */
  current: MediaDeviceInfo[]
  /** Whether any changes were detected */
  hasChanges: boolean
}

/**
 * Device recovery result
 */
export interface DeviceRecoveryResult {
  /** Whether audio device was recovered */
  audioRecovered: boolean
  /** Whether video device was recovered */
  videoRecovered: boolean
  /** Whether speaker device was recovered */
  speakerRecovered: boolean
  /** Any errors that occurred during recovery */
  errors: Error[]
}

/**
 * Interface for room session device management integration
 */
export interface DeviceManagementTarget {
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

/**
 * Device management class for visibility lifecycle
 */
export class DeviceManager {
  private previousDevices: MediaDeviceInfo[] = []
  private deviceChangeChannel: EventChannel<DeviceChangeEvent> | null = null
  private pollingInterval: NodeJS.Timeout | null = null
  private preferences: DevicePreferences | null = null
  private target: DeviceManagementTarget
  private config: VisibilityConfig
  private storageKey: string

  constructor(target: DeviceManagementTarget, config: VisibilityConfig) {
    this.target = target
    this.config = config
    this.storageKey = `sw_device_preferences_${target.id}`
    this.loadPreferences()
  }

  /**
   * Initialize device monitoring
   */
  async initialize(): Promise<void> {
    logger.debug('Initializing device management')
    
    try {
      // Initial device enumeration
      await this.enumerateDevices()
      
      // Start monitoring if enabled
      if (this.config.devices.reEnumerateOnFocus) {
        this.startDeviceMonitoring()
      }
    } catch (error) {
      logger.error('Failed to initialize device management:', error)
    }
  }

  /**
   * Cleanup device monitoring
   */
  cleanup(): void {
    logger.debug('Cleaning up device management')
    
    if (this.deviceChangeChannel) {
      this.deviceChangeChannel.close()
      this.deviceChangeChannel = null
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  /**
   * Create device change monitoring channel
   */
  createDeviceChangeChannel(): EventChannel<DeviceChangeEvent> {
    return eventChannel((emitter) => {
      let pollingInterval: NodeJS.Timeout | null = null

      const checkDevices = async () => {
        try {
          const devices = await enumerateDevices()
          const changes = this.detectDeviceChanges(this.previousDevices, devices)
          
          if (changes.hasChanges) {
            emitter({
              type: 'devicechange',
              changes,
              timestamp: Date.now(),
            })
          }

          this.previousDevices = devices
        } catch (error) {
          logger.warn('Device enumeration failed:', error)
        }
      }

      // Initial enumeration
      checkDevices()

      // Setup monitoring
      if (navigator.mediaDevices && 'ondevicechange' in navigator.mediaDevices) {
        // Use native devicechange event if available
        logger.debug('Using native devicechange event')
        navigator.mediaDevices.addEventListener('devicechange', checkDevices)
      } else {
        // Fallback to polling
        logger.debug('Using polling fallback for device changes')
        pollingInterval = setInterval(
          checkDevices,
          this.config.devices.pollingInterval || 3000
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
   * Start device monitoring
   */
  private startDeviceMonitoring(): void {
    if (this.deviceChangeChannel) {
      return // Already monitoring
    }

    this.deviceChangeChannel = this.createDeviceChangeChannel()
  }

  /**
   * Detect changes between device lists
   */
  private detectDeviceChanges(
    previousDevices: MediaDeviceInfo[],
    currentDevices: MediaDeviceInfo[]
  ): DeviceChangeResult {
    const prevIds = new Set(previousDevices.map(d => d.deviceId))
    const currIds = new Set(currentDevices.map(d => d.deviceId))

    const added = currentDevices.filter(d => !prevIds.has(d.deviceId))
    const removed = previousDevices.filter(d => !currIds.has(d.deviceId))

    return {
      added,
      removed,
      current: currentDevices,
      hasChanges: added.length > 0 || removed.length > 0
    }
  }

  /**
   * Re-enumerate devices
   */
  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await enumerateDevices()
      this.previousDevices = devices
      return devices
    } catch (error) {
      logger.error('Failed to enumerate devices:', error)
      return []
    }
  }

  /**
   * Save current device preferences
   */
  async saveCurrentDevicePreferences(): Promise<void> {
    try {
      const preferences: DevicePreferences = {
        audioInput: await this.getCurrentAudioInputDevice(),
        videoInput: await this.getCurrentVideoInputDevice(),
        audioOutput: await this.getCurrentAudioOutputDevice(),
        lastUpdated: Date.now(),
      }

      this.preferences = preferences
      this.storePreferences(preferences)
      
      logger.debug('Saved device preferences:', preferences)
    } catch (error) {
      logger.error('Failed to save device preferences:', error)
    }
  }

  /**
   * Get current audio input device from stream
   */
  private async getCurrentAudioInputDevice(): Promise<string | null> {
    try {
      if (!this.target.localStream) return null

      const audioTracks = this.target.localStream.getAudioTracks()
      if (audioTracks.length === 0) return null

      const settings = audioTracks[0].getSettings()
      return settings.deviceId || null
    } catch (error) {
      logger.warn('Failed to get current audio input device:', error)
      return null
    }
  }

  /**
   * Get current video input device from stream
   */
  private async getCurrentVideoInputDevice(): Promise<string | null> {
    try {
      if (!this.target.localStream) return null

      const videoTracks = this.target.localStream.getVideoTracks()
      if (videoTracks.length === 0) return null

      const settings = videoTracks[0].getSettings()
      return settings.deviceId || null
    } catch (error) {
      logger.warn('Failed to get current video input device:', error)
      return null
    }
  }

  /**
   * Get current audio output device
   */
  private async getCurrentAudioOutputDevice(): Promise<string | null> {
    try {
      if (!supportsMediaOutput()) return null

      // Try to get from audio element if available
      const audioEl = (this.target as any).audioEl || (this.target as any).getAudioEl?.()
      if (audioEl && audioEl.sinkId) {
        return audioEl.sinkId as string
      }

      return null
    } catch (error) {
      logger.warn('Failed to get current audio output device:', error)
      return null
    }
  }

  /**
   * Restore device preferences after focus/visibility restore
   */
  async restoreDevicePreferences(): Promise<DeviceRecoveryResult> {
    logger.debug('Restoring device preferences')
    
    const result: DeviceRecoveryResult = {
      audioRecovered: false,
      videoRecovered: false,
      speakerRecovered: false,
      errors: [],
    }

    if (!this.preferences || !this.config.devices.restorePreferences) {
      return result
    }

    // Re-enumerate devices first
    const currentDevices = await this.enumerateDevices()

    try {
      // Restore audio input device
      if (this.preferences.audioInput && this.target.updateAudioDevice) {
        const audioDevice = currentDevices.find(
          d => d.deviceId === this.preferences!.audioInput && d.kind === 'audioinput'
        )

        if (audioDevice) {
          await this.target.updateAudioDevice({ deviceId: audioDevice.deviceId })
          result.audioRecovered = true
          logger.debug('Restored audio input device:', audioDevice.label)
        } else {
          // Preferred device not available, use default
          await this.target.updateAudioDevice({ deviceId: 'default' })
          logger.debug('Audio input device not found, using default')
        }
      }

      // Restore video input device
      if (this.preferences.videoInput && this.target.updateVideoDevice) {
        const videoDevice = currentDevices.find(
          d => d.deviceId === this.preferences!.videoInput && d.kind === 'videoinput'
        )

        if (videoDevice) {
          await this.target.updateVideoDevice({ deviceId: videoDevice.deviceId })
          result.videoRecovered = true
          logger.debug('Restored video input device:', videoDevice.label)
        } else {
          // Preferred device not available, use default
          await this.target.updateVideoDevice({ deviceId: 'default' })
          logger.debug('Video input device not found, using default')
        }
      }

      // Restore audio output device
      if (this.preferences.audioOutput && this.target.updateSpeaker && supportsMediaOutput()) {
        const speakerDevice = currentDevices.find(
          d => d.deviceId === this.preferences!.audioOutput && d.kind === 'audiooutput'
        )

        if (speakerDevice) {
          await this.target.updateSpeaker({ deviceId: speakerDevice.deviceId })
          result.speakerRecovered = true
          logger.debug('Restored audio output device:', speakerDevice.label)
        } else {
          // Preferred device not available, use default
          await this.target.updateSpeaker({ deviceId: 'default' })
          logger.debug('Audio output device not found, using default')
        }
      }

    } catch (error) {
      result.errors.push(error as Error)
      logger.error('Error restoring device preferences:', error)
    }

    return result
  }

  /**
   * Verify that current media streams are active and working
   */
  async verifyMediaStreams(): Promise<boolean> {
    try {
      if (!this.target.localStream) {
        logger.debug('No local stream to verify')
        return true
      }

      const stream = this.target.localStream
      
      // Check audio tracks
      const audioTracks = stream.getAudioTracks()
      for (const track of audioTracks) {
        if (track.readyState !== 'live' || track.muted) {
          logger.warn('Audio track not live or muted:', track.label, {
            readyState: track.readyState,
            muted: track.muted,
            enabled: track.enabled
          })
          return false
        }
      }

      // Check video tracks
      const videoTracks = stream.getVideoTracks()
      for (const track of videoTracks) {
        if (track.readyState !== 'live' || track.muted) {
          logger.warn('Video track not live or muted:', track.label, {
            readyState: track.readyState,
            muted: track.muted,
            enabled: track.enabled
          })
          return false
        }
      }

      logger.debug('Media streams verified successfully')
      return true

    } catch (error) {
      logger.error('Error verifying media streams:', error)
      return false
    }
  }

  /**
   * Handle device change event
   */
  async handleDeviceChange(event: DeviceChangeEvent): Promise<void> {
    logger.debug('Handling device change:', event.changes)

    // Update device list
    this.previousDevices = event.changes.current

    // Check if preferred devices are still available
    if (this.preferences && this.config.devices.restorePreferences) {
      await this.checkPreferredDevicesAvailable(event.changes)
    }

    // Verify streams are still active
    const streamsValid = await this.verifyMediaStreams()
    if (!streamsValid) {
      logger.debug('Stream verification failed after device change, attempting recovery')
      await this.restoreDevicePreferences()
    }
  }

  /**
   * Check if preferred devices are still available after device change
   */
  private async checkPreferredDevicesAvailable(changes: DeviceChangeInfo): Promise<void> {
    if (!this.preferences) return

    const removedIds = changes.removed.map(d => d.deviceId)
    let needsRecovery = false

    // Check if preferred audio input was removed
    if (this.preferences.audioInput && removedIds.includes(this.preferences.audioInput)) {
      logger.debug('Preferred audio input device was removed')
      needsRecovery = true
    }

    // Check if preferred video input was removed
    if (this.preferences.videoInput && removedIds.includes(this.preferences.videoInput)) {
      logger.debug('Preferred video input device was removed')
      needsRecovery = true
    }

    // Check if preferred audio output was removed
    if (this.preferences.audioOutput && removedIds.includes(this.preferences.audioOutput)) {
      logger.debug('Preferred audio output device was removed')
      needsRecovery = true
    }

    if (needsRecovery) {
      await this.restoreDevicePreferences()
    }
  }

  /**
   * Handle focus gained event - re-enumerate and restore devices
   */
  async handleFocusGained(): Promise<DeviceRecoveryResult> {
    logger.debug('Handling focus gained - re-enumerating devices')

    // Re-enumerate devices
    await this.enumerateDevices()

    // Restore device preferences
    const result = await this.restoreDevicePreferences()

    // Verify streams
    const streamsValid = await this.verifyMediaStreams()
    if (!streamsValid) {
      logger.debug('Stream verification failed after focus, attempting additional recovery')
      // Could trigger additional recovery strategies here
    }

    return result
  }

  /**
   * Get available devices by kind
   */
  async getDevicesByKind(kind: 'audioinput' | 'videoinput' | 'audiooutput'): Promise<MediaDeviceInfo[]> {
    try {
      switch (kind) {
        case 'audioinput':
          return await getMicrophoneDevices()
        case 'videoinput':
          return await getCameraDevices()
        case 'audiooutput':
          return await getSpeakerDevices()
        default:
          return []
      }
    } catch (error) {
      logger.error(`Failed to get ${kind} devices:`, error)
      return []
    }
  }

  /**
   * Get current device preferences
   */
  getPreferences(): DevicePreferences | null {
    return this.preferences
  }

  /**
   * Update device preferences
   */
  updatePreferences(preferences: Partial<DevicePreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...preferences,
      lastUpdated: Date.now(),
    } as DevicePreferences

    this.storePreferences(this.preferences)
  }

  /**
   * Load device preferences from storage
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        this.preferences = JSON.parse(stored)
        logger.debug('Loaded device preferences:', this.preferences)
      }
    } catch (error) {
      logger.warn('Failed to load device preferences:', error)
      this.preferences = null
    }
  }

  /**
   * Store device preferences to storage
   */
  private storePreferences(preferences: DevicePreferences): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(preferences))
    } catch (error) {
      logger.warn('Failed to store device preferences:', error)
    }
  }
}

/**
 * Saga worker for device management
 */
export function* deviceManagementWorker(
  deviceManager: DeviceManager
): SagaIterator {
  try {
    // Initialize device management
    yield call([deviceManager, 'initialize'])

    // Listen for device change events if monitoring is enabled
    if (deviceManager['deviceChangeChannel']) {
      yield takeEvery(deviceManager['deviceChangeChannel'], function* (event: DeviceChangeEvent) {
        yield call([deviceManager, 'handleDeviceChange'], event)
      })
    }

  } catch (error) {
    logger.error('Device management worker error:', error)
  }
}

/**
 * Utility function to create device manager for BaseRoomSession
 */
export function createDeviceManager(
  target: DeviceManagementTarget,
  config: VisibilityConfig
): DeviceManager {
  return new DeviceManager(target, config)
}

/**
 * Check if device management is supported
 */
export function isDeviceManagementSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.enumerateDevices === 'function' &&
    typeof Storage !== 'undefined'
  )
}

/**
 * Get device management capabilities
 */
export function getDeviceManagementCapabilities(): {
  enumeration: boolean
  deviceChangeEvent: boolean
  mediaOutput: boolean
  localStorage: boolean
} {
  return {
    enumeration: !!(navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function'),
    deviceChangeEvent: !!(navigator.mediaDevices && 'ondevicechange' in navigator.mediaDevices),
    mediaOutput: supportsMediaOutput(),
    localStorage: typeof Storage !== 'undefined',
  }
}