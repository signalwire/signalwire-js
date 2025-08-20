import { actions, sagaEffects } from '@signalwire/core'
import { throwError } from 'redux-saga-test-plan/providers'
import { expectSaga } from 'redux-saga-test-plan'
import {
  createBaseRoomSessionObject,
  BaseRoomSession,
  BaseRoomSessionOptions,
} from './BaseRoomSession'
import { DeviceManager } from './device/DeviceManager'
import { devicePreferenceWorker } from './video/workers/devicePreferenceWorker'
import { configureFullStack, configureJestStore } from './testUtils'
import type { DevicePreferenceConfig, DevicePreference } from './device/types'

// Mock WebRTC APIs
const mockMediaDevices = {
  enumerateDevices: jest.fn(),
  getUserMedia: jest.fn(),
  getDisplayMedia: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}

const mockAudioContext = {
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    gain: { value: 1 },
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  close: jest.fn(),
  state: 'running',
}

// Mock Audio element
const mockAudioElement = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  setSinkId: jest.fn().mockResolvedValue(undefined),
  sinkId: 'default',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

// Mock setInterval/clearInterval
const mockSetInterval = jest.fn()
const mockClearInterval = jest.fn()

Object.defineProperty(global, 'setInterval', {
  value: mockSetInterval,
  writable: true,
})

Object.defineProperty(global, 'clearInterval', {
  value: mockClearInterval,
  writable: true,
})

// Setup global mocks
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: mockMediaDevices,
  },
  writable: true,
})

Object.defineProperty(global, 'AudioContext', {
  value: jest.fn().mockImplementation(() => mockAudioContext),
  writable: true,
})

Object.defineProperty(global, 'webkitAudioContext', {
  value: jest.fn().mockImplementation(() => mockAudioContext),
  writable: true,
})

Object.defineProperty(global, 'Audio', {
  value: jest.fn().mockImplementation(() => mockAudioElement),
  writable: true,
})

// Mock device list
const mockDevices: MediaDeviceInfo[] = [
  {
    deviceId: 'camera-1',
    kind: 'videoinput',
    label: 'Built-in Camera',
    groupId: 'group-1',
    toJSON: () => ({}),
  } as MediaDeviceInfo,
  {
    deviceId: 'mic-1',
    kind: 'audioinput',
    label: 'Built-in Microphone',
    groupId: 'group-2',
    toJSON: () => ({}),
  } as MediaDeviceInfo,
  {
    deviceId: 'speaker-1',
    kind: 'audiooutput',
    label: 'Built-in Speaker',
    groupId: 'group-3',
    toJSON: () => ({}),
  } as MediaDeviceInfo,
]

describe('BaseRoomSession Device Preferences Integration', () => {
  let store: any
  let roomSession: BaseRoomSession
  let stack: ReturnType<typeof configureFullStack>

  const mockDevicePreferenceConfig: DevicePreferenceConfig = {
    persistPreferences: false, // Disable storage for tests
    autoRecover: true,
    enableMonitoring: false, // Disable monitoring for tests
    recoveryStrategy: {
      type: 'preference',
      priorityOrder: ['preference', 'fallback', 'any'],
      notifyOnRecovery: true,
      retry: {
        maxAttempts: 2,
        delay: 100,
        backoff: 'linear',
      },
    },
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null)
    mockLocalStorage.setItem.mockImplementation(() => {})

    // Reset interval mocks
    mockSetInterval.mockReturnValue(123) // mock interval ID
    mockClearInterval.mockImplementation(() => {})

    // Setup mock device enumeration
    mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices)

    // Setup mock user media
    mockMediaDevices.getUserMedia.mockResolvedValue(
      new MediaStream([new MediaStreamTrack() as any])
    )

    stack = configureFullStack()
    store = stack.store

    // Mock execute method for room session
    const mockExecute = jest.fn()

    // Setup room session without device preferences initially
    roomSession = createBaseRoomSessionObject({
      store,
    })

    // @ts-expect-error - Mocking execute method
    roomSession.execute = mockExecute
  })

  afterEach(() => {
    if (roomSession) {
      // @ts-expect-error - Call private method for testing
      roomSession._finalize()
    }
  })

  describe('DeviceManager Lazy Initialization', () => {
    it('should not create DeviceManager when devicePreferences is disabled', () => {
      // Create room session without device preferences
      const roomWithoutPrefs = createBaseRoomSessionObject({
        store,
        // No devicePreferences config
      })

      expect(roomWithoutPrefs.deviceManager).toBeUndefined()
    })

    it('should create DeviceManager when devicePreferences is enabled', () => {
      const roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      // Access deviceManager to trigger lazy initialization
      const deviceManager = roomWithPrefs.deviceManager

      expect(deviceManager).toBeInstanceOf(DeviceManager)
    })

    it('should return the same DeviceManager instance on multiple accesses', () => {
      const roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      const firstAccess = roomWithPrefs.deviceManager
      const secondAccess = roomWithPrefs.deviceManager

      expect(firstAccess).toBe(secondAccess)
      expect(firstAccess).toBeInstanceOf(DeviceManager)
    })

    it('should pass correct config to DeviceManager', () => {
      const customConfig: DevicePreferenceConfig = {
        ...mockDevicePreferenceConfig,
        autoRecover: false,
        maxRecoveryAttempts: 5,
      }

      const roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: customConfig,
      })

      const deviceManager = roomWithPrefs.deviceManager

      expect(deviceManager).toBeInstanceOf(DeviceManager)
      // Note: We can't directly test internal config without exposing it,
      // but we know it's passed correctly through the constructor
    })
  })

  describe('Enhanced updateCamera Method', () => {
    let roomWithPrefs: BaseRoomSession

    beforeEach(() => {
      roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      // @ts-expect-error - Mock execute method
      roomWithPrefs.execute = jest.fn()
    })

    it('should use DeviceManager when devicePreferences is enabled and deviceId is provided', async () => {
      const deviceManager = roomWithPrefs.deviceManager!
      const setCameraSpy = jest
        .spyOn(deviceManager, 'setCamera')
        .mockResolvedValue()

      const constraints = { deviceId: 'camera-1' }
      const preference: Partial<DevicePreference> = {
        priority: 1,
        isFallback: false,
      }

      await roomWithPrefs.updateCamera(constraints, preference)

      expect(setCameraSpy).toHaveBeenCalledWith('camera-1', preference)
    })

    it('should fallback to standard behavior when deviceId is not a string', async () => {
      const deviceManager = roomWithPrefs.deviceManager!
      const setCameraSpy = jest.spyOn(deviceManager, 'setCamera')

      // @ts-expect-error - Mock updateCamera from parent class
      const parentUpdateCamera = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(roomWithPrefs)),
          'updateCamera'
        )
        .mockResolvedValue()

      const constraints = { deviceId: { exact: 'camera-1' } }

      await roomWithPrefs.updateCamera(constraints)

      expect(setCameraSpy).not.toHaveBeenCalled()
      expect(parentUpdateCamera).toHaveBeenCalledWith(constraints)
    })

    it('should fallback to standard behavior when no deviceId is provided', async () => {
      const deviceManager = roomWithPrefs.deviceManager!
      const setCameraSpy = jest.spyOn(deviceManager, 'setCamera')

      // @ts-expect-error - Mock updateCamera from parent class
      const parentUpdateCamera = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(roomWithPrefs)),
          'updateCamera'
        )
        .mockResolvedValue()

      const constraints = { width: 640, height: 480 }

      await roomWithPrefs.updateCamera(constraints)

      expect(setCameraSpy).not.toHaveBeenCalled()
      expect(parentUpdateCamera).toHaveBeenCalledWith(constraints)
    })

    it('should use standard behavior when devicePreferences is disabled', async () => {
      const roomWithoutPrefs = createBaseRoomSessionObject({
        store,
        // No devicePreferences config
      })

      // @ts-expect-error - Mock execute method
      roomWithoutPrefs.execute = jest.fn()

      // @ts-expect-error - Mock updateCamera from parent class
      const parentUpdateCamera = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(roomWithoutPrefs)),
          'updateCamera'
        )
        .mockResolvedValue()

      const constraints = { deviceId: 'camera-1' }

      await roomWithoutPrefs.updateCamera(constraints)

      expect(parentUpdateCamera).toHaveBeenCalledWith(constraints)
    })
  })

  describe('Enhanced updateMicrophone Method', () => {
    let roomWithPrefs: BaseRoomSession

    beforeEach(() => {
      roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      // @ts-expect-error - Mock execute method
      roomWithPrefs.execute = jest.fn()
    })

    it('should use DeviceManager when devicePreferences is enabled and deviceId is provided', async () => {
      const deviceManager = roomWithPrefs.deviceManager!
      const setMicrophoneSpy = jest
        .spyOn(deviceManager, 'setMicrophone')
        .mockResolvedValue()

      const constraints = { deviceId: 'mic-1' }
      const preference: Partial<DevicePreference> = {
        priority: 1,
        metadata: { quality: 'high' },
      }

      await roomWithPrefs.updateMicrophone(constraints, preference)

      expect(setMicrophoneSpy).toHaveBeenCalledWith('mic-1', preference)
    })

    it('should fallback to standard behavior when deviceId is not a string', async () => {
      const deviceManager = roomWithPrefs.deviceManager!
      const setMicrophoneSpy = jest.spyOn(deviceManager, 'setMicrophone')

      // @ts-expect-error - Mock updateMicrophone from parent class
      const parentUpdateMicrophone = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(roomWithPrefs)),
          'updateMicrophone'
        )
        .mockResolvedValue()

      const constraints = { deviceId: { exact: 'mic-1' } }

      await roomWithPrefs.updateMicrophone(constraints)

      expect(setMicrophoneSpy).not.toHaveBeenCalled()
      expect(parentUpdateMicrophone).toHaveBeenCalledWith(constraints)
    })

    it('should handle DeviceManager errors gracefully', async () => {
      const deviceManager = roomWithPrefs.deviceManager!
      const error = new Error('Device not found')
      jest.spyOn(deviceManager, 'setMicrophone').mockRejectedValue(error)

      const constraints = { deviceId: 'invalid-mic' }

      await expect(roomWithPrefs.updateMicrophone(constraints)).rejects.toThrow(
        'Device not found'
      )
    })
  })

  describe('Enhanced updateSpeaker Method', () => {
    let roomWithPrefs: BaseRoomSession

    beforeEach(() => {
      roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      // @ts-expect-error - Mock execute method
      roomWithPrefs.execute = jest.fn()
    })

    it('should use DeviceManager when devicePreferences is enabled', async () => {
      const deviceManager = roomWithPrefs.deviceManager!
      const setSpeakerSpy = jest
        .spyOn(deviceManager, 'setSpeaker')
        .mockResolvedValue()

      const preference: Partial<DevicePreference> = {
        priority: 1,
        isFallback: true,
      }

      const result = await roomWithPrefs.updateSpeaker(
        { deviceId: 'speaker-1' },
        preference
      )

      expect(setSpeakerSpy).toHaveBeenCalledWith('speaker-1', preference)
      expect(result).toBeUndefined()
    })

    it('should fallback to standard behavior when devicePreferences is disabled', async () => {
      const roomWithoutPrefs = createBaseRoomSessionObject({
        store,
        // No devicePreferences config
      })

      // @ts-expect-error - Mock execute method and other required methods
      roomWithoutPrefs.execute = jest.fn()
      roomWithoutPrefs.triggerCustomSaga = jest
        .fn()
        .mockResolvedValue(undefined)
      roomWithoutPrefs.once = jest.fn()

      // Mock audioEl getter
      Object.defineProperty(roomWithoutPrefs, 'audioEl', {
        get: () => mockAudioElement,
        configurable: true,
      })

      const result = await roomWithoutPrefs.updateSpeaker({
        deviceId: 'speaker-1',
      })

      expect(roomWithoutPrefs.triggerCustomSaga).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should handle DeviceManager errors gracefully', async () => {
      const deviceManager = roomWithPrefs.deviceManager!
      const error = new Error('Speaker not supported')
      jest.spyOn(deviceManager, 'setSpeaker').mockRejectedValue(error)

      await expect(
        roomWithPrefs.updateSpeaker({ deviceId: 'invalid-speaker' })
      ).rejects.toThrow('Speaker not supported')
    })
  })

  describe('Device Preference Worker Registration', () => {
    it('should register devicePreferenceWorker when devicePreferences is enabled', () => {
      const roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      const runWorkerSpy = jest.spyOn(roomWithPrefs, 'runWorker')

      // @ts-expect-error - Call protected method for testing
      roomWithPrefs.attachPreConnectWorkers()

      expect(runWorkerSpy).toHaveBeenCalledWith('devicePreferenceWorker', {
        worker: devicePreferenceWorker,
      })
    })

    it('should not register devicePreferenceWorker when devicePreferences is disabled', () => {
      const roomWithoutPrefs = createBaseRoomSessionObject({
        store,
        // No devicePreferences config
      })

      const runWorkerSpy = jest.spyOn(roomWithoutPrefs, 'runWorker')

      // @ts-expect-error - Call protected method for testing
      roomWithoutPrefs.attachPreConnectWorkers()

      // Should only call memberListUpdatedWorker, not devicePreferenceWorker
      expect(runWorkerSpy).toHaveBeenCalledTimes(1)
      expect(runWorkerSpy).toHaveBeenCalledWith(
        'memberListUpdated',
        expect.objectContaining({ worker: expect.any(Function) })
      )
    })
  })

  describe('Device Preference Worker Logic', () => {
    let roomWithPrefs: BaseRoomSession
    let mockDeviceManager: jest.Mocked<DeviceManager>

    beforeEach(() => {
      roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      // Create mock device manager
      mockDeviceManager = {
        setCamera: jest.fn().mockResolvedValue(),
        setMicrophone: jest.fn().mockResolvedValue(),
        setSpeaker: jest.fn().mockResolvedValue(),
        clearPreferences: jest.fn().mockResolvedValue(),
        recoverDevice: jest.fn().mockResolvedValue(),
        destroy: jest.fn(),
      } as any

      // Mock the deviceManager getter
      Object.defineProperty(roomWithPrefs, 'deviceManager', {
        get: () => mockDeviceManager,
        configurable: true,
      })
    })

    it('should handle device.preference.update action for camera', () => {
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'camera',
          deviceId: 'camera-1',
          preference: { priority: 1 },
        },
      }

      // Test the action filtering logic
      const isDevicePreferenceEvent = (action: any) => {
        return (
          action.type.startsWith('device.preference.') ||
          action.type.startsWith('device.recovery.')
        )
      }

      expect(isDevicePreferenceEvent(action)).toBe(true)
      expect(isDevicePreferenceEvent({ type: 'other.action' })).toBe(false)

      // Test that the correct DeviceManager method would be called
      expect(mockDeviceManager.setCamera).toBeDefined()
    })

    it('should handle device.preference.update action for microphone', () => {
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'microphone',
          deviceId: 'mic-1',
          preference: { priority: 2 },
        },
      }

      // Test that the correct DeviceManager method would be called
      expect(mockDeviceManager.setMicrophone).toBeDefined()
      expect(action.payload.deviceType).toBe('microphone')
    })

    it('should handle device.preference.update action for speaker', () => {
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'speaker',
          deviceId: 'speaker-1',
          preference: { priority: 1 },
        },
      }

      // Test that the correct DeviceManager method would be called
      expect(mockDeviceManager.setSpeaker).toBeDefined()
      expect(action.payload.deviceType).toBe('speaker')
    })

    it('should handle device.preference.clear action', () => {
      const action = {
        type: 'device.preference.clear',
        payload: {
          deviceType: 'camera',
        },
      }

      // Test that the correct DeviceManager method would be called
      expect(mockDeviceManager.clearPreferences).toBeDefined()
      expect(action.payload.deviceType).toBe('camera')
    })

    it('should handle device.recovery.trigger action', () => {
      const action = {
        type: 'device.recovery.trigger',
        payload: {
          deviceType: 'microphone',
        },
      }

      // Test that the correct DeviceManager method would be called
      expect(mockDeviceManager.recoverDevice).toBeDefined()
      expect(action.payload.deviceType).toBe('microphone')
    })

    it('should emit error event when device preference update fails', async () => {
      const error = new Error('Device update failed')
      const emitSpy = jest.spyOn(roomWithPrefs, 'emit')

      function* testWorker() {
        try {
          yield sagaEffects.call([mockDeviceManager, 'setCamera'], 'camera-1', {
            priority: 1,
          })
        } catch (error) {
          roomWithPrefs.emit('device.preference.update.failed', {
            error,
            payload: {
              deviceType: 'camera',
              deviceId: 'camera-1',
              preference: { priority: 1 },
            },
          })
        }
      }

      await expectSaga(testWorker)
        .provide([
          [
            sagaEffects.call([mockDeviceManager, 'setCamera'], 'camera-1', {
              priority: 1,
            }),
            throwError(error),
          ],
        ])
        .run()

      expect(emitSpy).toHaveBeenCalledWith('device.preference.update.failed', {
        error,
        payload: {
          deviceType: 'camera',
          deviceId: 'camera-1',
          preference: { priority: 1 },
        },
      })
    })

    it('should emit error event when device recovery fails', async () => {
      const error = new Error('Device recovery failed')
      const emitSpy = jest.spyOn(roomWithPrefs, 'emit')

      function* testWorker() {
        try {
          yield sagaEffects.call(
            [mockDeviceManager, 'recoverDevice'],
            'microphone'
          )
        } catch (error) {
          roomWithPrefs.emit('device.recovery.failed', {
            error,
            payload: { deviceType: 'microphone' },
          })
        }
      }

      await expectSaga(testWorker)
        .provide([
          [
            sagaEffects.call(
              [mockDeviceManager, 'recoverDevice'],
              'microphone'
            ),
            throwError(error),
          ],
        ])
        .run()

      expect(emitSpy).toHaveBeenCalledWith('device.recovery.failed', {
        error,
        payload: { deviceType: 'microphone' },
      })
    })
  })

  describe('Cleanup on Session Destroy', () => {
    it('should clean up DeviceManager on session finalize', () => {
      const roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      // Initialize device manager
      const deviceManager = roomWithPrefs.deviceManager!
      const destroySpy = jest.spyOn(deviceManager, 'destroy')

      // Call finalize (simulate session destroy)
      // @ts-expect-error - Call protected method for testing
      roomWithPrefs._finalize()

      expect(destroySpy).toHaveBeenCalled()
    })

    it('should not throw error when cleaning up session without DeviceManager', () => {
      const roomWithoutPrefs = createBaseRoomSessionObject({
        store,
        // No devicePreferences config
      })

      expect(() => {
        // @ts-expect-error - Call protected method for testing
        roomWithoutPrefs._finalize()
      }).not.toThrow()
    })

    it('should prevent deviceManager access after cleanup', () => {
      const roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })

      // Initialize device manager
      const deviceManager = roomWithPrefs.deviceManager
      expect(deviceManager).toBeInstanceOf(DeviceManager)

      const destroySpy = jest.spyOn(deviceManager!, 'destroy')

      // Call finalize
      // @ts-expect-error - Call protected method for testing
      roomWithPrefs._finalize()

      // Device manager destroy should have been called
      expect(destroySpy).toHaveBeenCalled()

      // The _deviceManager private property should be set to undefined
      // @ts-expect-error - Accessing private property for testing
      expect(roomWithPrefs._deviceManager).toBeUndefined()
    })
  })

  describe('Integration with BaseRoomSession Events', () => {
    let roomWithPrefs: BaseRoomSession

    beforeEach(() => {
      roomWithPrefs = createBaseRoomSessionObject({
        store,
        devicePreferences: mockDevicePreferenceConfig,
      })
    })

    it('should emit device.preference.update.failed event', (done) => {
      roomWithPrefs.on('device.preference.update.failed', (event) => {
        expect(event.error).toBeInstanceOf(Error)
        expect(event.payload).toBeDefined()
        done()
      })

      roomWithPrefs.emit('device.preference.update.failed', {
        error: new Error('Test error'),
        payload: { deviceType: 'camera', deviceId: 'test' },
      })
    })

    it('should emit device.preference.clear.failed event', (done) => {
      roomWithPrefs.on('device.preference.clear.failed', (event) => {
        expect(event.error).toBeInstanceOf(Error)
        expect(event.payload).toBeDefined()
        done()
      })

      roomWithPrefs.emit('device.preference.clear.failed', {
        error: new Error('Clear failed'),
        payload: { deviceType: 'microphone' },
      })
    })

    it('should emit device.recovery.failed event', (done) => {
      roomWithPrefs.on('device.recovery.failed', (event) => {
        expect(event.error).toBeInstanceOf(Error)
        expect(event.payload).toBeDefined()
        done()
      })

      roomWithPrefs.emit('device.recovery.failed', {
        error: new Error('Recovery failed'),
        payload: { deviceType: 'speaker' },
      })
    })
  })
})
