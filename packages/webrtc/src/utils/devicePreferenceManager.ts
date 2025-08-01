/**
 * Device Preference Manager
 * 
 * Manages device preferences and automatic device recovery for WebRTC applications.
 * Provides smart device selection with fallback strategies and persistent preferences.
 * 
 * Based on Cantina application improvements for better device management.
 */

export interface DevicePreference {
  deviceId: string
  preferredLabel?: string
  isDefault: boolean
  lastUsed?: number
}

export interface DeviceRecoveryResult {
  deviceId: string
  deviceLabel?: string
  recovered: boolean
  fallbackUsed: boolean
  recoveryMethod?: 'exact_id' | 'label_match' | 'type_default' | 'os_default'
}

export interface DeviceChangeCallback {
  (deviceId: string, deviceLabel?: string, isRecovered?: boolean): void
}

export interface DevicePreferenceConfig {
  persistPreferences: boolean
  autoRecover: boolean
  recoveryStrategy: 'exact' | 'label' | 'type' | 'smart'
  storageKey: string
  monitoringInterval: number
}

export interface DeviceValidationResult {
  isValid: boolean
  deviceId: string
  deviceLabel?: string
  error?: string
}

const DEFAULT_CONFIG: DevicePreferenceConfig = {
  persistPreferences: true,
  autoRecover: true,
  recoveryStrategy: 'smart',
  storageKey: 'signalwire_device_preferences',
  monitoringInterval: 2000 // 2 seconds
}

export class DevicePreferenceManager {
  private config: DevicePreferenceConfig
  private preferences: Map<string, DevicePreference> = new Map()
  private callbacks: Map<string, DeviceChangeCallback> = new Map()
  private monitoringInterval?: NodeJS.Timeout
  private isMonitoring = false
  private lastDeviceList: Map<string, MediaDeviceInfo[]> = new Map()

  constructor(config: Partial<DevicePreferenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadPreferences()
    this.startDeviceMonitoring()
  }

  /**
   * Set device preference for a specific device type
   */
  public setDevicePreference(
    deviceType: 'camera' | 'microphone' | 'speaker',
    deviceId: string,
    deviceLabel?: string
  ): void {
    const preference: DevicePreference = {
      deviceId,
      preferredLabel: deviceLabel,
      isDefault: deviceId === 'default' || deviceId === '',
      lastUsed: Date.now()
    }

    this.preferences.set(deviceType, preference)
    
    if (this.config.persistPreferences) {
      this.savePreferences()
    }

    console.debug(`Device preference set for ${deviceType}:`, preference)
  }

  /**
   * Get device preference for a specific device type
   */
  public getDevicePreference(deviceType: 'camera' | 'microphone' | 'speaker'): DevicePreference | null {
    return this.preferences.get(deviceType) || null
  }

  /**
   * Attempt to recover a device based on user preference
   * Priority: Exact ID match > Label match > Same type default > OS Default
   */
  public async recoverDevice(
    deviceType: 'camera' | 'microphone' | 'speaker',
    currentId: string,
    preference?: DevicePreference
  ): Promise<DeviceRecoveryResult> {
    const actualPreference = preference || this.getDevicePreference(deviceType)

    // If user prefers OS default, validate and return
    if (actualPreference?.isDefault || currentId === 'default') {
      const validationResult = await this.validateDeviceId(deviceType, 'default', 'Default')
      return {
        deviceId: validationResult.deviceId,
        deviceLabel: validationResult.deviceLabel,
        recovered: validationResult.isValid,
        fallbackUsed: false,
        recoveryMethod: 'os_default'
      }
    }

    // Try exact ID match first
    let validationResult = await this.validateDeviceId(deviceType, currentId, actualPreference?.preferredLabel)
    if (validationResult.isValid) {
      return {
        deviceId: validationResult.deviceId,
        deviceLabel: validationResult.deviceLabel,
        recovered: true,
        fallbackUsed: false,
        recoveryMethod: 'exact_id'
      }
    }

    // Try label match if we have a preferred label
    if (actualPreference?.preferredLabel) {
      const deviceByLabel = await this.findDeviceByLabel(deviceType, actualPreference.preferredLabel)
      if (deviceByLabel) {
        validationResult = await this.validateDeviceId(deviceType, deviceByLabel.deviceId, deviceByLabel.label)
        if (validationResult.isValid) {
          // Update preference with new device ID
          this.setDevicePreference(deviceType, deviceByLabel.deviceId, deviceByLabel.label)
          
          return {
            deviceId: validationResult.deviceId,
            deviceLabel: validationResult.deviceLabel,
            recovered: true,
            fallbackUsed: true,
            recoveryMethod: 'label_match'
          }
        }
      }
    }

    // Try first available device of the same type
    const firstAvailable = await this.getFirstAvailableDevice(deviceType)
    if (firstAvailable) {
      validationResult = await this.validateDeviceId(deviceType, firstAvailable.deviceId, firstAvailable.label)
      if (validationResult.isValid) {
        return {
          deviceId: validationResult.deviceId,
          deviceLabel: validationResult.deviceLabel,
          recovered: true,
          fallbackUsed: true,
          recoveryMethod: 'type_default'
        }
      }
    }

    // Fall back to OS default
    validationResult = await this.validateDeviceId(deviceType, 'default', 'Default')
    return {
      deviceId: validationResult.deviceId,
      deviceLabel: validationResult.deviceLabel,
      recovered: validationResult.isValid,
      fallbackUsed: true,
      recoveryMethod: 'os_default'
    }
  }

  /**
   * Register callback for device changes
   */
  public onDeviceChange(
    deviceType: 'camera' | 'microphone' | 'speaker',
    callback: DeviceChangeCallback
  ): void {
    this.callbacks.set(deviceType, callback)
  }

  /**
   * Remove device change callback
   */
  public offDeviceChange(deviceType: 'camera' | 'microphone' | 'speaker'): void {
    this.callbacks.delete(deviceType)
  }

  /**
   * Start monitoring for device changes
   */
  public startDeviceMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.checkForDeviceChanges()
    }, this.config.monitoringInterval)

    console.debug('Device monitoring started')
  }

  /**
   * Stop device monitoring
   */
  public stopDeviceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
    this.isMonitoring = false
    console.debug('Device monitoring stopped')
  }

  /**
   * Get all available devices of a specific type
   */
  public async getAvailableDevices(deviceType: 'camera' | 'microphone' | 'speaker'): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      
      let kind: string
      switch (deviceType) {
        case 'camera':
          kind = 'videoinput'
          break
        case 'microphone':
          kind = 'audioinput'
          break
        case 'speaker':
          kind = 'audiooutput'
          break
        default:
          return []
      }

      return devices.filter(device => device.kind === kind)
    } catch (error) {
      console.error('Failed to enumerate devices:', error)
      return []
    }
  }

  /**
   * Clear all device preferences
   */
  public clearPreferences(): void {
    this.preferences.clear()
    if (this.config.persistPreferences) {
      this.savePreferences()
    }
    console.debug('All device preferences cleared')
  }

  /**
   * Get current configuration
   */
  public getConfig(): DevicePreferenceConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<DevicePreferenceConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart monitoring if interval changed
    if (newConfig.monitoringInterval && this.isMonitoring) {
      this.stopDeviceMonitoring()
      this.startDeviceMonitoring()
    }
  }

  private async validateDeviceId(
    deviceType: 'camera' | 'microphone' | 'speaker',
    deviceId: string,
    expectedLabel?: string
  ): Promise<DeviceValidationResult> {
    try {
      // For default device, always consider valid
      if (deviceId === 'default' || deviceId === '') {
        return {
          isValid: true,
          deviceId: 'default',
          deviceLabel: 'Default'
        }
      }

      // Check if device exists in enumerated devices
      const devices = await this.getAvailableDevices(deviceType)
      const device = devices.find(d => d.deviceId === deviceId)

      if (device) {
        return {
          isValid: true,
          deviceId: device.deviceId,
          deviceLabel: device.label || expectedLabel
        }
      }

      // Device not found
      return {
        isValid: false,
        deviceId,
        error: `Device with ID ${deviceId} not found`
      }
    } catch (error) {
      return {
        isValid: false,
        deviceId,
        error: `Validation failed: ${error}`
      }
    }
  }

  private async findDeviceByLabel(
    deviceType: 'camera' | 'microphone' | 'speaker',
    targetLabel: string
  ): Promise<{ deviceId: string; label: string } | null> {
    try {
      const devices = await this.getAvailableDevices(deviceType)
      
      // First try exact match
      let device = devices.find(d => d.label === targetLabel)
      if (device) {
        return { deviceId: device.deviceId, label: device.label }
      }

      // Try partial match (case insensitive)
      const normalizedTarget = targetLabel.toLowerCase()
      device = devices.find(d => 
        d.label.toLowerCase().includes(normalizedTarget) ||
        normalizedTarget.includes(d.label.toLowerCase())
      )

      if (device) {
        return { deviceId: device.deviceId, label: device.label }
      }

      return null
    } catch (error) {
      console.error('Failed to find device by label:', error)
      return null
    }
  }

  private async getFirstAvailableDevice(
    deviceType: 'camera' | 'microphone' | 'speaker'
  ): Promise<{ deviceId: string; label: string } | null> {
    try {
      const devices = await this.getAvailableDevices(deviceType)
      if (devices.length > 0) {
        const device = devices[0]
        return { deviceId: device.deviceId, label: device.label }
      }
      return null
    } catch (error) {
      console.error('Failed to get first available device:', error)
      return null
    }
  }

  private async checkForDeviceChanges(): Promise<void> {
    if (!this.config.autoRecover) return

    try {
      const deviceTypes: Array<'camera' | 'microphone' | 'speaker'> = ['camera', 'microphone', 'speaker']
      
      for (const deviceType of deviceTypes) {
        const currentDevices = await this.getAvailableDevices(deviceType)
        const previousDevices = this.lastDeviceList.get(deviceType) || []
        
        // Check if device list changed
        if (this.hasDeviceListChanged(currentDevices, previousDevices)) {
          console.debug(`${deviceType} device list changed`)
          this.lastDeviceList.set(deviceType, currentDevices)
          
          // Check if preferred device is still available
          const preference = this.getDevicePreference(deviceType)
          if (preference && !preference.isDefault) {
            const deviceStillAvailable = currentDevices.find(d => d.deviceId === preference.deviceId)
            
            if (!deviceStillAvailable) {
              console.debug(`Preferred ${deviceType} device no longer available, attempting recovery`)
              await this.attemptDeviceRecovery(deviceType, preference)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking for device changes:', error)
    }
  }

  private hasDeviceListChanged(current: MediaDeviceInfo[], previous: MediaDeviceInfo[]): boolean {
    if (current.length !== previous.length) return true
    
    const currentIds = new Set(current.map(d => d.deviceId))
    const previousIds = new Set(previous.map(d => d.deviceId))
    
    // Check if any device IDs changed
    for (const id of currentIds) {
      if (!previousIds.has(id)) return true
    }
    
    for (const id of previousIds) {
      if (!currentIds.has(id)) return true
    }
    
    return false
  }

  private async attemptDeviceRecovery(
    deviceType: 'camera' | 'microphone' | 'speaker',
    preference: DevicePreference
  ): Promise<void> {
    try {
      const recoveryResult = await this.recoverDevice(deviceType, preference.deviceId, preference)
      
      if (recoveryResult.recovered) {
        const callback = this.callbacks.get(deviceType)
        if (callback) {
          callback(recoveryResult.deviceId, recoveryResult.deviceLabel, true)
        }
        
        console.debug(`Device recovery successful for ${deviceType}:`, recoveryResult)
      } else {
        console.warn(`Device recovery failed for ${deviceType}:`, recoveryResult)
      }
    } catch (error) {
      console.error(`Device recovery error for ${deviceType}:`, error)
    }
  }

  private loadPreferences(): void {
    if (!this.config.persistPreferences) return

    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        Object.entries(data).forEach(([deviceType, preference]) => {
          this.preferences.set(deviceType, preference as DevicePreference)
        })
        console.debug('Device preferences loaded from storage')
      }
    } catch (error) {
      console.error('Failed to load device preferences:', error)
    }
  }

  private savePreferences(): void {
    if (!this.config.persistPreferences) return

    try {
      const data: Record<string, DevicePreference> = {}
      this.preferences.forEach((preference, deviceType) => {
        data[deviceType] = preference
      })
      
      localStorage.setItem(this.config.storageKey, JSON.stringify(data))
      console.debug('Device preferences saved to storage')
    } catch (error) {
      console.error('Failed to save device preferences:', error)
    }
  }

  /**
   * Cleanup and stop all monitoring
   */
  public destroy(): void {
    this.stopDeviceMonitoring()
    this.callbacks.clear()
    console.debug('DevicePreferenceManager destroyed')
  }
}