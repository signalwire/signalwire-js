/**
 * Device Monitor
 * Provides continuous monitoring of media device changes with EventEmitter-based architecture
 */

import { EventEmitter, getLogger } from '@signalwire/core'
import type {
  DeviceMonitorEvents,
  DeviceChanges,
  DeviceChangeEvent
} from './types'

/**
 * Configuration options for DeviceMonitor
 */
export interface DeviceMonitorOptions {
  /**
   * Polling interval in milliseconds (default: 2000)
   */
  pollingInterval?: number

  /**
   * Debounce delay for native events in milliseconds (default: 100)
   */
  debounceDelay?: number

  /**
   * Whether to use native devicechange events when available (default: true)
   */
  useNativeEvents?: boolean

  /**
   * Whether to monitor on visibility changes (default: true)
   */
  monitorOnVisibilityChange?: boolean

  /**
   * Whether to monitor on focus changes (default: true)
   */
  monitorOnFocusChange?: boolean

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean
}

/**
 * DeviceMonitor class
 * Monitors media device changes and emits events when devices are added, removed, or changed
 */
export class DeviceMonitor extends EventEmitter<DeviceMonitorEvents> {
  private readonly logger = getLogger()
  private readonly options: Required<DeviceMonitorOptions>

  /**
   * Monitoring state
   */
  private isMonitoring = false
  private pollingTimer: NodeJS.Timeout | null = null
  private debounceTimer: NodeJS.Timeout | null = null

  /**
   * Device state tracking
   */
  private lastKnownDevices: MediaDeviceInfo[] = []

  /**
   * Event listeners for cleanup
   */
  private boundHandlers = {
    deviceChange: this.handleNativeDeviceChange.bind(this),
    visibilityChange: this.handleVisibilityChange.bind(this),
    focusChange: this.handleFocusChange.bind(this),
    blurChange: this.handleBlurChange.bind(this)
  }

  /**
   * Browser capability detection
   */
  private readonly nativeEventsSupported: boolean
  private readonly visibilityApiSupported: boolean

  /**
   * Default configuration
   */
  private static readonly DEFAULT_OPTIONS: Required<DeviceMonitorOptions> = {
    pollingInterval: 2000,
    debounceDelay: 100,
    useNativeEvents: true,
    monitorOnVisibilityChange: true,
    monitorOnFocusChange: true,
    debug: false
  }

  /**
   * Create a new DeviceMonitor instance
   * @param options - Configuration options
   */
  constructor(options: DeviceMonitorOptions = {}) {
    super()

    this.options = {
      ...DeviceMonitor.DEFAULT_OPTIONS,
      ...options
    }

    // Detect browser capabilities
    this.nativeEventsSupported = this.detectNativeEventSupport()
    this.visibilityApiSupported = this.detectVisibilityApiSupported()

    this.logger.debug('[DeviceMonitor] Initialized with options:', this.options)
    this.logger.debug('[DeviceMonitor] Capabilities:', {
      nativeEventsSupported: this.nativeEventsSupported,
      visibilityApiSupported: this.visibilityApiSupported
    })
  }

  /**
   * Start device monitoring
   * @returns Promise that resolves when monitoring starts
   */
  async start(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.debug('[DeviceMonitor] Already monitoring')
      return
    }

    this.logger.debug('[DeviceMonitor] Starting device monitoring')

    try {
      // Initial device scan to establish baseline
      await this.performInitialScan()

      // Set up native event listeners if supported and enabled
      if (this.nativeEventsSupported && this.options.useNativeEvents) {
        this.setupNativeEventListeners()
      }

      // Set up visibility and focus listeners if enabled
      if (this.options.monitorOnVisibilityChange && this.visibilityApiSupported) {
        this.setupVisibilityListeners()
      }

      if (this.options.monitorOnFocusChange) {
        this.setupFocusListeners()
      }

      // Start polling as primary or fallback mechanism
      this.startPolling()

      this.isMonitoring = true

      // Emit started event
      this.emit('monitor.started', {
        pollingInterval: this.options.pollingInterval,
        nativeEventsSupported: this.nativeEventsSupported && this.options.useNativeEvents
      })

      this.logger.debug('[DeviceMonitor] Device monitoring started successfully')
    } catch (error) {
      this.logger.error('[DeviceMonitor] Failed to start monitoring:', error)
      this.emitError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Stop device monitoring
   * @param reason - Optional reason for stopping
   */
  stop(reason?: string): void {
    if (!this.isMonitoring) {
      this.logger.debug('[DeviceMonitor] Not currently monitoring')
      return
    }

    this.logger.debug('[DeviceMonitor] Stopping device monitoring', reason ? `(${reason})` : '')

    // Clear timers
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    // Remove event listeners
    this.removeNativeEventListeners()
    this.removeVisibilityListeners()
    this.removeFocusListeners()

    this.isMonitoring = false

    // Emit stopped event
    this.emit('monitor.stopped', { reason })

    this.logger.debug('[DeviceMonitor] Device monitoring stopped')
  }

  /**
   * Manually trigger a device check
   * @returns Promise that resolves with detected changes
   */
  async checkDevices(): Promise<DeviceChanges | null> {
    this.logger.debug('[DeviceMonitor] Manual device check triggered')

    try {
      return await this.detectChanges()
    } catch (error) {
      this.logger.error('[DeviceMonitor] Manual device check failed:', error)
      this.emitError(error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }

  /**
   * Get current monitoring status
   * @returns true if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring
  }

  /**
   * Get last known devices
   * @returns Array of last known devices
   */
  getLastKnownDevices(): MediaDeviceInfo[] {
    return [...this.lastKnownDevices]
  }

  /**
   * Destroy the monitor and clean up resources
   */
  destroy(): void {
    this.stop('destroy')
    this.removeAllListeners()
    this.lastKnownDevices = []
    this.logger.debug('[DeviceMonitor] Destroyed')
  }

  /**
   * Perform initial device scan to establish baseline
   */
  private async performInitialScan(): Promise<void> {
    try {
      const devices = await this.enumerateDevices()
      this.lastKnownDevices = devices

      this.logger.debug(`[DeviceMonitor] Initial scan found ${devices.length} devices:`, 
        devices.map(d => `${d.kind}: ${d.label || d.deviceId}`))
    } catch (error) {
      this.logger.error('[DeviceMonitor] Initial device scan failed:', error)
      throw error
    }
  }

  /**
   * Detect device changes by comparing current devices with last known devices
   * @returns DeviceChanges object or null if no changes
   */
  async detectChanges(): Promise<DeviceChanges | null> {
    try {
      const currentDevices = await this.enumerateDevices()
      const timestamp = Date.now()

      const changes = this.compareDevices(this.lastKnownDevices, currentDevices, timestamp)

      // Update last known devices
      this.lastKnownDevices = currentDevices

      if (this.hasChanges(changes)) {
        this.logger.debug('[DeviceMonitor] Device changes detected:', changes)

        // Emit individual change events
        this.emitIndividualChanges(changes)

        // Emit aggregate change event
        this.emit('device.change', changes)

        return changes
      }

      return null
    } catch (error) {
      this.logger.error('[DeviceMonitor] Device change detection failed:', error)
      this.emitError(error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }

  /**
   * Compare two device arrays and return changes
   * @param previous - Previous device list
   * @param current - Current device list
   * @param timestamp - Timestamp of the comparison
   * @returns DeviceChanges object
   */
  private compareDevices(
    previous: MediaDeviceInfo[],
    current: MediaDeviceInfo[],
    timestamp: number
  ): DeviceChanges {
    const added: MediaDeviceInfo[] = []
    const removed: MediaDeviceInfo[] = []
    const changed: Array<{ current: MediaDeviceInfo; previous: MediaDeviceInfo }> = []

    // Find added devices
    for (const device of current) {
      const previousDevice = previous.find(d => d.deviceId === device.deviceId)
      if (!previousDevice) {
        added.push(device)
      } else if (this.hasDeviceChanged(previousDevice, device)) {
        changed.push({ current: device, previous: previousDevice })
      }
    }

    // Find removed devices
    for (const device of previous) {
      const currentDevice = current.find(d => d.deviceId === device.deviceId)
      if (!currentDevice) {
        removed.push(device)
      }
    }

    return {
      added,
      removed,
      changed,
      timestamp
    }
  }

  /**
   * Check if a device has changed between two snapshots
   * @param previous - Previous device info
   * @param current - Current device info
   * @returns true if device has changed
   */
  private hasDeviceChanged(previous: MediaDeviceInfo, current: MediaDeviceInfo): boolean {
    return (
      previous.label !== current.label ||
      previous.groupId !== current.groupId ||
      previous.kind !== current.kind
    )
  }

  /**
   * Check if changes object contains any changes
   * @param changes - DeviceChanges object
   * @returns true if there are changes
   */
  private hasChanges(changes: DeviceChanges): boolean {
    return changes.added.length > 0 || changes.removed.length > 0 || changes.changed.length > 0
  }

  /**
   * Emit individual change events for each device
   * @param changes - DeviceChanges object
   */
  private emitIndividualChanges(changes: DeviceChanges): void {
    // Emit added events
    for (const device of changes.added) {
      const event: DeviceChangeEvent = {
        type: 'added',
        device,
        timestamp: changes.timestamp
      }
      this.emit('device.added', event)
    }

    // Emit removed events
    for (const device of changes.removed) {
      const event: DeviceChangeEvent = {
        type: 'removed',
        device,
        timestamp: changes.timestamp
      }
      this.emit('device.removed', event)
    }

    // Emit changed events
    for (const { current, previous } of changes.changed) {
      const event: DeviceChangeEvent = {
        type: 'changed',
        device: current,
        previousDevice: previous,
        timestamp: changes.timestamp
      }
      this.emit('device.changed', event)
    }
  }

  /**
   * Emit error event
   * @param error - Error to emit
   */
  private emitError(error: Error): void {
    this.emit('monitor.error', {
      error,
      timestamp: Date.now()
    })
  }

  /**
   * Start polling mechanism
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
    }

    this.pollingTimer = setInterval(async () => {
      if (this.isMonitoring) {
        await this.detectChanges()
      }
    }, this.options.pollingInterval)

    this.logger.debug(`[DeviceMonitor] Polling started with ${this.options.pollingInterval}ms interval`)
  }

  /**
   * Handle native devicechange event
   */
  private handleNativeDeviceChange(): void {
    this.logger.debug('[DeviceMonitor] Native devicechange event received')

    // Debounce multiple rapid events
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(async () => {
      if (this.isMonitoring) {
        await this.detectChanges()
      }
    }, this.options.debounceDelay)
  }

  /**
   * Handle visibility change event
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && this.isMonitoring) {
      this.logger.debug('[DeviceMonitor] Page became visible, checking for device changes')
      
      // Small delay to allow devices to be re-initialized
      setTimeout(async () => {
        if (this.isMonitoring) {
          await this.detectChanges()
        }
      }, 100)
    }
  }

  /**
   * Handle window focus event
   */
  private handleFocusChange(): void {
    if (this.isMonitoring) {
      this.logger.debug('[DeviceMonitor] Window gained focus, checking for device changes')
      
      // Small delay to allow devices to be re-initialized
      setTimeout(async () => {
        if (this.isMonitoring) {
          await this.detectChanges()
        }
      }, 100)
    }
  }

  /**
   * Handle window blur event
   */
  private handleBlurChange(): void {
    // Could be used for future optimizations (e.g., reducing polling frequency)
    this.logger.debug('[DeviceMonitor] Window lost focus')
  }

  /**
   * Set up native devicechange event listeners
   */
  private setupNativeEventListeners(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', this.boundHandlers.deviceChange)
      this.logger.debug('[DeviceMonitor] Native devicechange listener added')
    }
  }

  /**
   * Remove native devicechange event listeners
   */
  private removeNativeEventListeners(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.boundHandlers.deviceChange)
      this.logger.debug('[DeviceMonitor] Native devicechange listener removed')
    }
  }

  /**
   * Set up visibility API listeners
   */
  private setupVisibilityListeners(): void {
    if (this.detectVisibilityApiSupported()) {
      document.addEventListener('visibilitychange', this.boundHandlers.visibilityChange)
      this.logger.debug('[DeviceMonitor] Visibility change listener added')
    }
  }

  /**
   * Remove visibility API listeners
   */
  private removeVisibilityListeners(): void {
    if (this.detectVisibilityApiSupported()) {
      document.removeEventListener('visibilitychange', this.boundHandlers.visibilityChange)
      this.logger.debug('[DeviceMonitor] Visibility change listener removed')
    }
  }

  /**
   * Set up window focus/blur listeners
   */
  private setupFocusListeners(): void {
    window.addEventListener('focus', this.boundHandlers.focusChange)
    window.addEventListener('blur', this.boundHandlers.blurChange)
    this.logger.debug('[DeviceMonitor] Focus/blur listeners added')
  }

  /**
   * Remove window focus/blur listeners
   */
  private removeFocusListeners(): void {
    window.removeEventListener('focus', this.boundHandlers.focusChange)
    window.removeEventListener('blur', this.boundHandlers.blurChange)
    this.logger.debug('[DeviceMonitor] Focus/blur listeners removed')
  }

  /**
   * Enumerate media devices
   * @returns Promise that resolves to array of MediaDeviceInfo
   */
  private async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('mediaDevices.enumerateDevices is not supported')
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    return Array.from(devices) // Create a copy to avoid mutation issues
  }

  /**
   * Detect if native devicechange events are supported
   * @returns true if native events are supported
   */
  private detectNativeEventSupport(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.addEventListener === 'function' &&
      typeof navigator.mediaDevices.removeEventListener === 'function'
    )
  }

  /**
   * Detect if Visibility API is supported
   * @returns true if Visibility API is supported
   */
  private detectVisibilityApiSupported(): boolean {
    return typeof document !== 'undefined' && typeof document.visibilityState !== 'undefined'
  }
}