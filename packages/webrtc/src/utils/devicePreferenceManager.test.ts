/**
 * Unit tests for DevicePreferenceManager
 * 
 * Tests device preference management, recovery strategies,
 * and smart device switching functionality.
 */

import { DevicePreferenceManager } from './devicePreferenceManager'

// Mock browser APIs
const mockEnumerateDevices = jest.fn()
const mockGetUserMedia = jest.fn()

// Mock navigator.mediaDevices only if it doesn't exist or is configurable
if (!navigator.mediaDevices) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      enumerateDevices: mockEnumerateDevices,
      getUserMedia: mockGetUserMedia
    },
    configurable: true
  })
} else {
  // If it exists, mock the methods directly
  navigator.mediaDevices.enumerateDevices = mockEnumerateDevices
  navigator.mediaDevices.getUserMedia = mockGetUserMedia
}

// Mock devices
const mockCameraDevices = [
  { deviceId: 'camera1', label: 'Front Camera', kind: 'videoinput', groupId: 'group1' },
  { deviceId: 'camera2', label: 'Back Camera', kind: 'videoinput', groupId: 'group2' },
  { deviceId: 'camera3', label: 'USB Camera', kind: 'videoinput', groupId: 'group3' }
]

const mockMicrophoneDevices = [
  { deviceId: 'mic1', label: 'Built-in Microphone', kind: 'audioinput', groupId: 'group1' },
  { deviceId: 'mic2', label: 'USB Headset', kind: 'audioinput', groupId: 'group4' },
  { deviceId: 'mic3', label: 'Bluetooth Headset', kind: 'audioinput', groupId: 'group5' }
]

const mockSpeakerDevices = [
  { deviceId: 'speaker1', label: 'Built-in Speakers', kind: 'audiooutput', groupId: 'group1' },
  { deviceId: 'speaker2', label: 'USB Headset', kind: 'audiooutput', groupId: 'group4' },
  { deviceId: 'speaker3', label: 'Bluetooth Headset', kind: 'audiooutput', groupId: 'group5' }
]

const allMockDevices = [...mockCameraDevices, ...mockMicrophoneDevices, ...mockSpeakerDevices]

describe('DevicePreferenceManager', () => {
  let manager: DevicePreferenceManager
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockEnumerateDevices.mockResolvedValue(allMockDevices)
    mockGetUserMedia.mockResolvedValue(new MediaStream())
    
    manager = new DevicePreferenceManager({
      enableSmartRecovery: true,
      preferSameGroup: true,
      fallbackToDefault: true,
      maxRetryAttempts: 3
    })
  })
  
  afterEach(() => {
    manager.destroy()
  })

  describe('initialization', () => {
    it('should create manager with default config', () => {
      const defaultManager = new DevicePreferenceManager()
      expect(defaultManager).toBeInstanceOf(DevicePreferenceManager)
      defaultManager.destroy()
    })

    it('should create manager with custom config', () => {
      const config = {
        enableSmartRecovery: false,
        preferSameGroup: false,
        fallbackToDefault: false,
        maxRetryAttempts: 1
      }
      const customManager = new DevicePreferenceManager(config)
      expect(customManager).toBeInstanceOf(DevicePreferenceManager)
      customManager.destroy()
    })
  })

  describe('device preference management', () => {
    it('should set device preference', () => {
      manager.setDevicePreference('camera', 'camera1', 'Front Camera')
      
      const preference = manager.getDevicePreference('camera')
      expect(preference).toEqual({
        deviceId: 'camera1',
        label: 'Front Camera'
      })
    })

    it('should get device preference', () => {
      manager.setDevicePreference('microphone', 'mic2', 'USB Headset')
      
      const preference = manager.getDevicePreference('microphone')
      expect(preference?.deviceId).toBe('mic2')
      expect(preference?.label).toBe('USB Headset')
    })

    it('should return null for non-existent preference', () => {
      const preference = manager.getDevicePreference('speaker')
      expect(preference).toBeNull()
    })

    it('should clear device preference', () => {
      manager.setDevicePreference('camera', 'camera1', 'Front Camera')
      manager.clearDevicePreference('camera')
      
      const preference = manager.getDevicePreference('camera')
      expect(preference).toBeNull()
    })
  })

  describe('device recovery - camera', () => {
    it('should recover to same device if available', async () => {
      const result = await manager.recoverDevice('camera', 'camera1')
      
      expect(result.deviceId).toBe('camera1')
      expect(result.recovered).toBe(true)
      expect(result.fallbackUsed).toBe(false)
      expect(result.recoveryMethod).toBe('same_device')
    })

    it('should recover to same group device', async () => {
      const preference = { deviceId: 'camera1', label: 'Front Camera' }
      
      const result = await manager.recoverDevice('camera', 'nonexistent', preference)
      
      expect(result.recovered).toBe(true)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('same_group')
      expect(['camera1', 'camera2', 'camera3']).toContain(result.deviceId)
    })

    it('should fallback to any available device', async () => {
      // Mock scenario where preferred device and group don't exist
      mockEnumerateDevices.mockResolvedValueOnce([
        { deviceId: 'camera_new', label: 'New Camera', kind: 'videoinput', groupId: 'new_group' }
      ])
      
      const preference = { deviceId: 'nonexistent', label: 'Missing Camera' }
      
      const result = await manager.recoverDevice('camera', 'nonexistent', preference)
      
      expect(result.deviceId).toBe('camera_new')
      expect(result.recovered).toBe(true)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('available_device')
    })

    it('should fallback to OS default when no devices available', async () => {
      mockEnumerateDevices.mockResolvedValueOnce([])
      
      const result = await manager.recoverDevice('camera', 'nonexistent')
      
      expect(result.deviceId).toBe('default')
      expect(result.recovered).toBe(true)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('os_default')
    })
  })

  describe('device recovery - microphone', () => {
    it('should recover microphone with same group preference', async () => {
      const preference = { deviceId: 'mic2', label: 'USB Headset' }
      
      const result = await manager.recoverDevice('microphone', 'nonexistent', preference)
      
      expect(result.recovered).toBe(true)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('same_group')
      expect(result.deviceId).toBe('mic2') // Should find USB Headset in same group
    })

    it('should handle microphone recovery errors gracefully', async () => {
      mockEnumerateDevices.mockRejectedValueOnce(new Error('Device enumeration failed'))
      
      const result = await manager.recoverDevice('microphone', 'mic1')
      
      expect(result.deviceId).toBe('default')
      expect(result.recovered).toBe(false)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('os_default')
    })
  })

  describe('device recovery - speaker', () => {
    it('should recover speaker device', async () => {
      const result = await manager.recoverDevice('speaker', 'speaker2')
      
      expect(result.deviceId).toBe('speaker2')
      expect(result.recovered).toBe(true)
      expect(result.fallbackUsed).toBe(false)
      expect(result.recoveryMethod).toBe('same_device')
    })

    it('should handle speaker recovery with no available devices', async () => {
      const speakerlessDevices = [...mockCameraDevices, ...mockMicrophoneDevices]
      mockEnumerateDevices.mockResolvedValueOnce(speakerlessDevices)
      
      const result = await manager.recoverDevice('speaker', 'nonexistent')
      
      expect(result.deviceId).toBe('default')
      expect(result.recovered).toBe(true)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('os_default')
    })
  })

  describe('device change monitoring', () => {
    it('should register device change callback', () => {
      const callback = jest.fn()
      
      manager.onDeviceChange('camera', callback)
      
      // Trigger a simulated device change
      manager.emit('device.changed', {
        deviceType: 'camera',
        deviceId: 'camera1',
        deviceLabel: 'Front Camera',
        isRecovered: true
      })
      
      expect(callback).toHaveBeenCalledWith('camera1', 'Front Camera', true)
    })

    it('should handle multiple callbacks for same device type', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      
      manager.onDeviceChange('microphone', callback1)
      manager.onDeviceChange('microphone', callback2)
      
      manager.emit('device.changed', {
        deviceType: 'microphone',
        deviceId: 'mic1',
        deviceLabel: 'Built-in Microphone',
        isRecovered: false
      })
      
      expect(callback1).toHaveBeenCalledWith('mic1', 'Built-in Microphone', false)
      expect(callback2).toHaveBeenCalledWith('mic1', 'Built-in Microphone', false)
    })

    it('should remove device change callback', () => {
      const callback = jest.fn()
      
      manager.onDeviceChange('speaker', callback)
      manager.offDeviceChange('speaker', callback)
      
      manager.emit('device.changed', {
        deviceType: 'speaker',
        deviceId: 'speaker1',
        deviceLabel: 'Built-in Speakers',
        isRecovered: true
      })
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('smart recovery features', () => {
    it('should prefer same group devices when enabled', async () => {
      // Set up preference for USB Headset (group4)
      const preference = { deviceId: 'mic2', label: 'USB Headset' }
      
      const result = await manager.recoverDevice('microphone', 'nonexistent', preference)
      
      expect(result.recovered).toBe(true)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('same_group')
      expect(result.deviceId).toBe('mic2') // Should find USB Headset in same group
    })

    it('should disable smart recovery when configured', async () => {
      const noSmartRecoveryManager = new DevicePreferenceManager({
        enableSmartRecovery: false,
        preferSameGroup: false,
        fallbackToDefault: true
      })
      
      const preference = { deviceId: 'nonexistent', label: 'Missing Device' }
      const result = await noSmartRecoveryManager.recoverDevice('camera', 'nonexistent', preference)
      
      expect(result.deviceId).toBe('default')
      expect(result.recoveryMethod).toBe('os_default')
      
      noSmartRecoveryManager.destroy()
    })

    it('should respect max retry attempts', async () => {
      const limitedManager = new DevicePreferenceManager({
        maxRetryAttempts: 1
      })
      
      // Mock device enumeration to fail first time, succeed second time
      mockEnumerateDevices
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(allMockDevices)
      
      const result = await limitedManager.recoverDevice('camera', 'camera1')
      
      // Should fallback to default after max retries exceeded
      expect(result.deviceId).toBe('default')
      expect(result.recoveryMethod).toBe('os_default')
      
      limitedManager.destroy()
    })
  })

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        enableSmartRecovery: false,
        preferSameGroup: false,
        maxRetryAttempts: 1
      }
      
      manager.updateConfig(newConfig)
      
      expect(() => manager.updateConfig(newConfig)).not.toThrow()
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const callback = jest.fn()
      manager.onDeviceChange('camera', callback)
      
      manager.destroy()
      
      // Should not crash and should cleanup callbacks
      expect(() => manager.destroy()).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle device enumeration errors', async () => {
      mockEnumerateDevices.mockRejectedValue(new Error('Permission denied'))
      
      const result = await manager.recoverDevice('camera', 'camera1')
      
      expect(result.deviceId).toBe('default')
      expect(result.recovered).toBe(false)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('os_default')
    })

    it('should handle invalid device types gracefully', async () => {
      const result = await manager.recoverDevice('invalid' as any, 'device1')
      
      expect(result.deviceId).toBe('default')
      expect(result.recovered).toBe(false)
      expect(result.fallbackUsed).toBe(true)
      expect(result.recoveryMethod).toBe('os_default')
    })
  })
})