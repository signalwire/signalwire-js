/**
 * Tests for device management functionality
 * @jest-environment jsdom
 */

import { DeviceManager, DeviceManagementTarget, isDeviceManagementSupported } from './deviceManagement'
import { DEFAULT_VISIBILITY_CONFIG } from './types'
import {
  enumerateDevices,
  getMicrophoneDevices,
  getCameraDevices,
  getSpeakerDevices,
  getSpeakerById,
  supportsMediaOutput,
} from '@signalwire/webrtc'

// Mock the webrtc module functions
jest.mock('@signalwire/webrtc', () => ({
  enumerateDevices: jest.fn(),
  getMicrophoneDevices: jest.fn(),
  getCameraDevices: jest.fn(),
  getSpeakerDevices: jest.fn(),
  getSpeakerById: jest.fn(),
  supportsMediaOutput: jest.fn(),
}))

const mockEnumerateDevices = enumerateDevices as jest.MockedFunction<typeof enumerateDevices>
const mockGetMicrophoneDevices = getMicrophoneDevices as jest.MockedFunction<typeof getMicrophoneDevices>
const mockGetCameraDevices = getCameraDevices as jest.MockedFunction<typeof getCameraDevices>
const mockGetSpeakerDevices = getSpeakerDevices as jest.MockedFunction<typeof getSpeakerDevices>
const mockGetSpeakerById = getSpeakerById as jest.MockedFunction<typeof getSpeakerById>
const mockSupportsMediaOutput = supportsMediaOutput as jest.MockedFunction<typeof supportsMediaOutput>

// Mock other WebRTC APIs
const mockGetUserMedia = jest.fn()
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

// Mock devices
const mockAudioInput: MediaDeviceInfo = {
  deviceId: 'audioinput1',
  kind: 'audioinput',
  label: 'Default Microphone',
  groupId: 'group1',
  toJSON: () => ({})
}

const mockVideoInput: MediaDeviceInfo = {
  deviceId: 'videoinput1', 
  kind: 'videoinput',
  label: 'Default Camera',
  groupId: 'group2',
  toJSON: () => ({})
}

const mockAudioOutput: MediaDeviceInfo = {
  deviceId: 'audiooutput1',
  kind: 'audiooutput', 
  label: 'Default Speaker',
  groupId: 'group3',
  toJSON: () => ({})
}

const mockDevices = [mockAudioInput, mockVideoInput, mockAudioOutput]

// Mock MediaStreamTrack
const createMockTrack = (kind: 'audio' | 'video', deviceId: string): MediaStreamTrack => ({
  id: `${kind}track-${deviceId}`,
  kind,
  label: `${kind} track`,
  enabled: true,
  muted: false,
  readyState: 'live',
  getSettings: () => ({ deviceId }),
  getConstraints: () => ({}),
  getCapabilities: () => ({}),
  clone: jest.fn(),
  stop: jest.fn(),
  applyConstraints: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  onended: null,
  onmute: null,
  onunmute: null,
})

// Mock MediaStream
const createMockStream = (audioDeviceId?: string, videoDeviceId?: string): MediaStream => {
  const tracks: MediaStreamTrack[] = []
  
  if (audioDeviceId) {
    tracks.push(createMockTrack('audio', audioDeviceId))
  }
  
  if (videoDeviceId) {
    tracks.push(createMockTrack('video', videoDeviceId))
  }

  return {
    id: 'mockstream',
    active: true,
    getAudioTracks: () => tracks.filter(t => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter(t => t.kind === 'video'),
    getTracks: () => tracks,
    getTrackById: (id: string) => tracks.find(t => t.id === id) || null,
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    clone: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    onaddtrack: null,
    onremovetrack: null,
  } as MediaStream
}

// Mock target
const createMockTarget = (localStream?: MediaStream): DeviceManagementTarget => ({
  id: 'test-session',
  localStream: localStream || null,
  updateAudioDevice: jest.fn(),
  updateVideoDevice: jest.fn(),
  updateSpeaker: jest.fn(),
})

// Mock storage
const mockStorage = new Map<string, string>()

// Setup mocks
beforeAll(() => {
  // Mock navigator.mediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      enumerateDevices: mockEnumerateDevices,
      getUserMedia: mockGetUserMedia,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }
  })

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: {
      getItem: (key: string) => mockStorage.get(key) || null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
    }
  })

  // Mock document.hidden
  Object.defineProperty(document, 'hidden', {
    writable: true,
    value: false
  })
})

beforeEach(() => {
  jest.clearAllMocks()
  mockStorage.clear()
  
  // Setup WebRTC mocks
  mockEnumerateDevices.mockResolvedValue([...mockDevices])
  mockGetMicrophoneDevices.mockResolvedValue([mockAudioInput])
  mockGetCameraDevices.mockResolvedValue([mockVideoInput])
  mockGetSpeakerDevices.mockResolvedValue([mockAudioOutput])
  mockSupportsMediaOutput.mockReturnValue(true)
  mockGetSpeakerById.mockResolvedValue(mockAudioOutput)
})

describe('DeviceManager', () => {
  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      await manager.initialize()

      expect(mockEnumerateDevices).toHaveBeenCalled()
    })

    it('should handle initialization errors gracefully', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)
      
      mockEnumerateDevices.mockRejectedValueOnce(new Error('Enumeration failed'))

      await expect(manager.initialize()).resolves.not.toThrow()
    })
  })

  describe('Device Change Detection', () => {
    it('should detect device additions', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      const previousDevices = [mockAudioInput]
      const currentDevices = [mockAudioInput, mockVideoInput]

      const changes = manager['detectDeviceChanges'](previousDevices, currentDevices)

      expect(changes.hasChanges).toBe(true)
      expect(changes.added).toHaveLength(1)
      expect(changes.added[0]).toBe(mockVideoInput)
      expect(changes.removed).toHaveLength(0)
    })

    it('should detect device removals', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      const previousDevices = [mockAudioInput, mockVideoInput]
      const currentDevices = [mockAudioInput]

      const changes = manager['detectDeviceChanges'](previousDevices, currentDevices)

      expect(changes.hasChanges).toBe(true)
      expect(changes.added).toHaveLength(0)
      expect(changes.removed).toHaveLength(1)
      expect(changes.removed[0]).toBe(mockVideoInput)
    })

    it('should detect no changes when devices are the same', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      const previousDevices = [mockAudioInput, mockVideoInput]
      const currentDevices = [mockAudioInput, mockVideoInput]

      const changes = manager['detectDeviceChanges'](previousDevices, currentDevices)

      expect(changes.hasChanges).toBe(false)
      expect(changes.added).toHaveLength(0)
      expect(changes.removed).toHaveLength(0)
    })
  })

  describe('Device Preferences', () => {
    it('should save current device preferences', async () => {
      const localStream = createMockStream('audioinput1', 'videoinput1')
      const target = createMockTarget(localStream)
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      await manager.saveCurrentDevicePreferences()

      const preferences = manager.getPreferences()
      expect(preferences).toBeTruthy()
      expect(preferences?.audioInput).toBe('audioinput1')
      expect(preferences?.videoInput).toBe('videoinput1')
    })

    it('should persist preferences to storage', async () => {
      const localStream = createMockStream('audioinput1', 'videoinput1')
      const target = createMockTarget(localStream)
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      await manager.saveCurrentDevicePreferences()

      const storageKey = `sw_device_preferences_${target.id}`
      const stored = mockStorage.get(storageKey)
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.audioInput).toBe('audioinput1')
      expect(parsed.videoInput).toBe('videoinput1')
    })

    it('should load preferences from storage', () => {
      const target = createMockTarget()
      const storageKey = `sw_device_preferences_${target.id}`
      
      const preferences = {
        audioInput: 'stored-audio',
        videoInput: 'stored-video',
        audioOutput: 'stored-speaker',
        lastUpdated: Date.now()
      }
      
      mockStorage.set(storageKey, JSON.stringify(preferences))

      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)
      
      const loaded = manager.getPreferences()
      expect(loaded?.audioInput).toBe('stored-audio')
      expect(loaded?.videoInput).toBe('stored-video')
      expect(loaded?.audioOutput).toBe('stored-speaker')
    })
  })

  describe('Device Recovery', () => {
    it('should restore devices when they are available', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      // Set preferences
      manager.updatePreferences({
        audioInput: 'audioinput1',
        videoInput: 'videoinput1',
      })

      const result = await manager.restoreDevicePreferences()

      expect(target.updateAudioDevice).toHaveBeenCalledWith({ deviceId: 'audioinput1' })
      expect(target.updateVideoDevice).toHaveBeenCalledWith({ deviceId: 'videoinput1' })
      expect(result.audioRecovered).toBe(true)
      expect(result.videoRecovered).toBe(true)
    })

    it('should use default when preferred device is not available', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      // Set preferences for non-existent device
      manager.updatePreferences({
        audioInput: 'nonexistent-device',
        videoInput: 'nonexistent-device',
      })

      const result = await manager.restoreDevicePreferences()

      expect(target.updateAudioDevice).toHaveBeenCalledWith({ deviceId: 'default' })
      expect(target.updateVideoDevice).toHaveBeenCalledWith({ deviceId: 'default' })
      expect(result.audioRecovered).toBe(false)
      expect(result.videoRecovered).toBe(false)
    })

    it('should handle errors during device restoration', async () => {
      const target = createMockTarget()
      target.updateAudioDevice = jest.fn().mockRejectedValue(new Error('Update failed'))
      
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      manager.updatePreferences({
        audioInput: 'audioinput1',
      })

      const result = await manager.restoreDevicePreferences()

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('Update failed')
    })
  })

  describe('Media Stream Verification', () => {
    it('should verify active streams successfully', async () => {
      const localStream = createMockStream('audioinput1', 'videoinput1')
      const target = createMockTarget(localStream)
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      const isValid = await manager.verifyMediaStreams()

      expect(isValid).toBe(true)
    })

    it('should detect inactive audio tracks', async () => {
      const localStream = createMockStream('audioinput1', 'videoinput1')
      const target = createMockTarget(localStream)
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      // Make audio track inactive
      const audioTrack = localStream.getAudioTracks()[0]
      Object.defineProperty(audioTrack, 'readyState', { value: 'ended' })

      const isValid = await manager.verifyMediaStreams()

      expect(isValid).toBe(false)
    })

    it('should detect muted video tracks', async () => {
      const localStream = createMockStream('audioinput1', 'videoinput1')
      const target = createMockTarget(localStream)
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      // Make video track muted
      const videoTrack = localStream.getVideoTracks()[0]
      Object.defineProperty(videoTrack, 'muted', { value: true })

      const isValid = await manager.verifyMediaStreams()

      expect(isValid).toBe(false)
    })

    it('should handle missing stream gracefully', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      const isValid = await manager.verifyMediaStreams()

      expect(isValid).toBe(true) // No stream is considered valid
    })
  })

  describe('Focus Handling', () => {
    it('should handle focus gained by re-enumerating and restoring', async () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      manager.updatePreferences({
        audioInput: 'audioinput1',
        videoInput: 'videoinput1',
      })

      const result = await manager.handleFocusGained()

      expect(mockEnumerateDevices).toHaveBeenCalled()
      expect(target.updateAudioDevice).toHaveBeenCalledWith({ deviceId: 'audioinput1' })
      expect(target.updateVideoDevice).toHaveBeenCalledWith({ deviceId: 'videoinput1' })
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      const target = createMockTarget()
      const manager = new DeviceManager(target, DEFAULT_VISIBILITY_CONFIG)

      manager.cleanup()

      // Should not throw and should clean up internal state
      expect(() => manager.cleanup()).not.toThrow()
    })
  })
})

describe('Utility Functions', () => {
  describe('isDeviceManagementSupported', () => {
    it('should return true when all APIs are supported', () => {
      const supported = isDeviceManagementSupported()
      expect(supported).toBe(true)
    })

    it.skip('should return false when mediaDevices is not supported', () => {
      // This test is skipped because navigator.mediaDevices is not configurable in jsdom
      // In a real scenario where mediaDevices is not supported, the function would return false
    })
  })
})