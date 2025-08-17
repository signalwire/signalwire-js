/**
 * DeviceRecoveryEngine Test Suite
 * Comprehensive tests for the Device Recovery Engine functionality
 */

import { DeviceRecoveryEngine } from './DeviceRecoveryEngine'
import { RecoveryStatus } from './types'
import type {
  DeviceType,
  DeviceState,
  DevicePreference,
  RecoveryResult,
  DeviceRecoveryEngineOptions,
  RecoveryStrategyDefinition
} from './types'

// Mock @signalwire/core
jest.mock('@signalwire/core', () => ({
  EventEmitter: class MockEventEmitter {
    private listeners: Map<string, Function[]> = new Map()
    
    on(event: string, listener: Function) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, [])
      }
      this.listeners.get(event)!.push(listener)
    }
    
    emit(event: string, ...args: any[]) {
      const listeners = this.listeners.get(event) || []
      listeners.forEach(listener => listener(...args))
    }
    
    removeAllListeners() {
      this.listeners.clear()
    }
  },
  getLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }),
  uuid: jest.fn(() => 'mock-uuid-123'),
  debounce: jest.fn((fn, delay) => {
    const debounced = (...args: any[]) => {
      // Immediate execution for testing
      return fn(...args)
    }
    return debounced
  })
}))

// Mock MediaDeviceInfo
const createMockDevice = (
  deviceId: string, 
  kind: MediaDeviceKind, 
  label: string, 
  groupId: string = 'default'
): MediaDeviceInfo => ({
  deviceId,
  kind,
  label,
  groupId,
  toJSON: () => ({ deviceId, kind, label, groupId })
})

// Sample devices for testing
const mockDevices = {
  camera1: createMockDevice('camera-1', 'videoinput', 'FaceTime HD Camera'),
  camera2: createMockDevice('camera-2', 'videoinput', 'USB Camera'),
  mic1: createMockDevice('mic-1', 'audioinput', 'Built-in Microphone'),
  mic2: createMockDevice('mic-2', 'audioinput', 'USB Microphone'),
  speaker1: createMockDevice('speaker-1', 'audiooutput', 'Built-in Output'),
  speaker2: createMockDevice('speaker-2', 'audiooutput', 'USB Speakers'),
  defaultSpeaker: createMockDevice('', 'audiooutput', 'Default - Built-in Output')
}

describe('DeviceRecoveryEngine', () => {
  let engine: DeviceRecoveryEngine
  let mockEnumerateDevices: jest.Mock
  let mockIsDeviceAvailable: jest.Mock
  
  const allDevices = Object.values(mockDevices)
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockEnumerateDevices = jest.fn().mockResolvedValue(allDevices)
    mockIsDeviceAvailable = jest.fn().mockResolvedValue(true)
    
    engine = new DeviceRecoveryEngine({
      enumerateDevices: mockEnumerateDevices,
      isDeviceAvailable: mockIsDeviceAvailable,
      debug: false
    })
  })
  
  afterEach(() => {
    engine.destroy()
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with default options', () => {
      const defaultEngine = new DeviceRecoveryEngine()
      expect(defaultEngine).toBeInstanceOf(DeviceRecoveryEngine)
      defaultEngine.destroy()
    })

    it('should merge custom options with defaults', () => {
      const customEngine = new DeviceRecoveryEngine({
        maxRecoveryAttempts: 10,
        debounceDelay: 1000,
        debug: true
      })
      expect(customEngine).toBeInstanceOf(DeviceRecoveryEngine)
      customEngine.destroy()
    })

    it('should register default recovery strategies', () => {
      // Test that strategies are available by trying to use them
      expect(async () => {
        await engine.tryStrategy('exact-id-match', 'camera')
      }).not.toThrow()
    })
  })

  describe('Device Recovery - Basic Functionality', () => {
    it('should recover device using exact ID match strategy', async () => {
      const currentState: DeviceState = {
        deviceId: 'camera-1',
        isAvailable: false,
        isActive: false,
        lastUpdated: Date.now()
      }

      const result = await engine.recoverDevice('camera', currentState)

      expect(result.success).toBe(true)
      expect(result.deviceId).toBe('camera-1')
      expect(result.method).toBe('preference')
      expect(mockEnumerateDevices).toHaveBeenCalled()
      expect(mockIsDeviceAvailable).toHaveBeenCalledWith('camera-1', 'camera')
    })

    it('should recover device using label match strategy', async () => {
      const currentState: DeviceState = {
        deviceId: 'old-camera-id',
        label: 'FaceTime HD Camera',
        isAvailable: false,
        isActive: false,
        lastUpdated: Date.now()
      }

      const result = await engine.recoverDevice('camera', currentState)

      expect(result.success).toBe(true)
      expect(result.deviceId).toBe('camera-1')
      expect(result.method).toBe('preference')
    })

    it('should recover device using same-type fallback strategy', async () => {
      // Use a non-existent device to force fallback strategy
      const currentState: DeviceState = {
        deviceId: 'non-existent-camera',
        label: 'Non-existent Camera',
        isAvailable: false,
        isActive: false,
        lastUpdated: Date.now()
      }
      
      const preferences: DevicePreference[] = [
        {
          deviceId: 'camera-2',
          label: 'USB Camera',
          priority: 1
        }
      ]

      const result = await engine.recoverDevice('camera', currentState, preferences)

      expect(result.success).toBe(true)
      expect(result.deviceId).toBe('camera-2')
      expect(result.method).toBe('fallback')
    })

    it('should recover device using OS default strategy', async () => {
      // Test the OS default strategy directly
      const result = await engine.tryStrategy('os-default', 'speaker')

      expect(result.success).toBe(true)
      expect(result.deviceId).toBe('')
      expect(result.confidence).toBe(0.3)
    })

    it('should fail recovery when no devices are available', async () => {
      mockEnumerateDevices.mockResolvedValue([])

      const result = await engine.recoverDevice('camera')

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.method).toBe('custom')
    })
  })

  describe('Recovery Strategies', () => {
    describe('Exact ID Match Strategy', () => {
      it('should succeed when device ID exists', async () => {
        const result = await engine.tryStrategy('exact-id-match', 'camera', {
          deviceId: 'camera-1',
          isAvailable: true,
          isActive: false,
          lastUpdated: Date.now()
        })

        expect(result.success).toBe(true)
        expect(result.deviceId).toBe('camera-1')
        expect(result.confidence).toBe(1.0)
      })

      it('should fail when device ID does not exist', async () => {
        const result = await engine.tryStrategy('exact-id-match', 'camera', {
          deviceId: 'non-existent-camera',
          isAvailable: true,
          isActive: false,
          lastUpdated: Date.now()
        })

        expect(result.success).toBe(false)
        expect(result.reason).toBe('Exact device ID not found')
      })

      it('should fail when no current state provided', async () => {
        const result = await engine.tryStrategy('exact-id-match', 'camera')

        expect(result.success).toBe(false)
        expect(result.reason).toBe('Strategy not applicable')
      })
    })

    describe('Label Match Strategy', () => {
      it('should succeed when label matches', async () => {
        const result = await engine.tryStrategy('label-match', 'camera', {
          deviceId: 'old-id',
          label: 'FaceTime HD Camera',
          isAvailable: false,
          isActive: false,
          lastUpdated: Date.now()
        })

        expect(result.success).toBe(true)
        expect(result.deviceId).toBe('camera-1')
        expect(result.confidence).toBe(0.8)
      })

      it('should succeed when preference label matches', async () => {
        const preferences: DevicePreference[] = [
          { deviceId: 'any', label: 'USB Camera', priority: 1 }
        ]

        const result = await engine.tryStrategy('label-match', 'camera', undefined, preferences)

        expect(result.success).toBe(true)
        expect(result.deviceId).toBe('camera-2')
      })

      it('should fail when no matching label found', async () => {
        const result = await engine.tryStrategy('label-match', 'camera', {
          deviceId: 'old-id',
          label: 'Non-existent Camera',
          isAvailable: false,
          isActive: false,
          lastUpdated: Date.now()
        })

        expect(result.success).toBe(false)
        expect(result.reason).toBe('No device found with matching label')
      })
    })

    describe('Same-Type Fallback Strategy', () => {
      it('should prioritize preferences', async () => {
        const preferences: DevicePreference[] = [
          { deviceId: 'camera-2', label: 'USB Camera', priority: 1 },
          { deviceId: 'camera-1', label: 'FaceTime HD Camera', priority: 2 }
        ]

        const result = await engine.tryStrategy('same-type-fallback', 'camera', undefined, preferences)

        expect(result.success).toBe(true)
        expect(result.deviceId).toBe('camera-2')
        expect(result.confidence).toBe(0.6)
      })

      it('should fallback to first available device', async () => {
        const result = await engine.tryStrategy('same-type-fallback', 'camera')

        expect(result.success).toBe(true)
        expect(result.deviceId).toBe('camera-1') // First camera in mock list
        expect(result.confidence).toBe(0.4)
      })

      it('should fail when no devices of type available', async () => {
        // Test the strategy canHandle method first - it should return false
        const testEngine = new DeviceRecoveryEngine({
          enumerateDevices: jest.fn().mockResolvedValue([mockDevices.mic1]), // Only microphone
          isDeviceAvailable: mockIsDeviceAvailable
        })

        const result = await testEngine.tryStrategy('same-type-fallback', 'camera')

        expect(result.success).toBe(false)
        expect(result.reason).toBe('Strategy not applicable')
        
        testEngine.destroy()
      })
    })

    describe('OS Default Strategy', () => {
      it('should find default device with empty deviceId', async () => {
        const result = await engine.tryStrategy('os-default', 'speaker')

        expect(result.success).toBe(true)
        expect(result.deviceId).toBe('')
        expect(result.confidence).toBe(0.3)
      })

      it('should fallback to first device when no default found', async () => {
        mockEnumerateDevices.mockResolvedValue([mockDevices.speaker1, mockDevices.speaker2])

        const result = await engine.tryStrategy('os-default', 'speaker')

        expect(result.success).toBe(true)
        expect(result.deviceId).toBe('speaker-1')
        expect(result.confidence).toBe(0.2)
      })
    })
  })

  describe('Event System', () => {
    it('should emit recovery.started event', async () => {
      const startedSpy = jest.fn()
      engine.on('recovery.started', startedSpy)

      await engine.recoverDevice('camera')

      expect(startedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: expect.objectContaining({
            deviceType: 'camera'
          })
        })
      )
    })

    it('should emit recovery.succeeded event', async () => {
      const succeededSpy = jest.fn()
      engine.on('recovery.succeeded', succeededSpy)

      await engine.recoverDevice('camera')

      expect(succeededSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: expect.any(Object),
          result: expect.objectContaining({
            success: true
          })
        })
      )
    })

    it('should emit recovery.failed event', async () => {
      mockEnumerateDevices.mockRejectedValue(new Error('Enumeration failed'))
      
      const failedSpy = jest.fn()
      engine.on('recovery.failed', failedSpy)

      await engine.recoverDevice('camera')

      expect(failedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: expect.any(Object),
          error: expect.any(Error)
        })
      )
    })

    it('should emit strategy.executed event', async () => {
      const strategySpy = jest.fn()
      engine.on('strategy.executed', strategySpy)

      await engine.recoverDevice('camera')

      expect(strategySpy).toHaveBeenCalled()
    })

    it('should emit status.changed event', async () => {
      const statusSpy = jest.fn()
      engine.on('status.changed', statusSpy)

      await engine.recoverDevice('camera')

      expect(statusSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          activeRecoveries: 0,
          queuedRecoveries: 0
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle device enumeration errors', async () => {
      const enumerationError = new Error('Device access denied')
      mockEnumerateDevices.mockRejectedValue(enumerationError)

      const result = await engine.recoverDevice('camera')

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })

    it('should handle device availability check errors', async () => {
      mockIsDeviceAvailable.mockRejectedValue(new Error('Availability check failed'))

      const result = await engine.recoverDevice('camera')

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })

    it('should prevent concurrent recovery for same device type', async () => {
      const promise1 = engine.recoverDevice('camera')
      const promise2 = engine.recoverDevice('camera')

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1.success || result2.success).toBe(true)
      expect(result1.success && result2.success).toBe(false)
    })

    it('should respect maximum recovery attempts', async () => {
      const limitedEngine = new DeviceRecoveryEngine({
        maxRecoveryAttempts: 1,
        enumerateDevices: mockEnumerateDevices,
        isDeviceAvailable: mockIsDeviceAvailable
      })

      // First attempt
      await limitedEngine.recoverDevice('camera')
      
      // Second attempt should fail due to limit
      const result = await limitedEngine.recoverDevice('camera')
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Maximum recovery attempts')
      
      limitedEngine.destroy()
    })

    it('should handle strategy execution errors gracefully', async () => {
      const faultyStrategy: RecoveryStrategyDefinition = {
        name: 'faulty-strategy',
        priority: 0,
        execute: async () => {
          throw new Error('Strategy failed')
        }
      }

      engine.registerStrategy(faultyStrategy)

      const result = await engine.recoverDevice('camera')

      // Should fallback to other strategies
      expect(result.success).toBe(true)
    })
  })

  describe('Strategy Management', () => {
    it('should register custom strategy', () => {
      const customStrategy: RecoveryStrategyDefinition = {
        name: 'custom-strategy',
        priority: 0,
        execute: async () => ({
          success: true,
          deviceId: 'custom-device',
          confidence: 1.0
        })
      }

      engine.registerStrategy(customStrategy)

      expect(async () => {
        await engine.tryStrategy('custom-strategy', 'camera')
      }).not.toThrow()
    })

    it('should unregister strategy', () => {
      engine.unregisterStrategy('exact-id-match')

      expect(async () => {
        await engine.tryStrategy('exact-id-match', 'camera')
      }).rejects.toThrow('Recovery strategy \'exact-id-match\' not found')
    })

    it('should register multiple strategies', () => {
      const strategies: RecoveryStrategyDefinition[] = [
        {
          name: 'strategy-1',
          priority: 1,
          execute: async () => ({ success: false })
        },
        {
          name: 'strategy-2',
          priority: 2,
          execute: async () => ({ success: false })
        }
      ]

      engine.registerStrategies(strategies)

      expect(async () => {
        await engine.tryStrategy('strategy-1', 'camera')
      }).not.toThrow()
    })
  })

  describe('Recovery History', () => {
    it('should track recovery history', async () => {
      await engine.recoverDevice('camera')
      await engine.recoverDevice('microphone')

      const history = engine.getRecoveryHistory()

      expect(history).toHaveLength(2)
      expect(history[0].deviceType).toBe('camera')
      expect(history[1].deviceType).toBe('microphone')
    })

    it('should filter history by device type', async () => {
      await engine.recoverDevice('camera')
      await engine.recoverDevice('microphone')

      const cameraHistory = engine.getRecoveryHistory('camera')

      expect(cameraHistory).toHaveLength(1)
      expect(cameraHistory[0].deviceType).toBe('camera')
    })

    it('should clear history for specific device type', async () => {
      await engine.recoverDevice('camera')
      await engine.recoverDevice('microphone')

      engine.clearHistory('camera')
      
      const history = engine.getRecoveryHistory()
      const cameraHistory = engine.getRecoveryHistory('camera')

      expect(history).toHaveLength(1)
      expect(cameraHistory).toHaveLength(0)
      expect(history[0].deviceType).toBe('microphone')
    })

    it('should clear all history', async () => {
      await engine.recoverDevice('camera')
      await engine.recoverDevice('microphone')

      engine.clearHistory()
      
      const history = engine.getRecoveryHistory()
      expect(history).toHaveLength(0)
    })

    it('should maintain history size limit', async () => {
      const limitedEngine = new DeviceRecoveryEngine({
        maxHistorySize: 2,
        enumerateDevices: mockEnumerateDevices,
        isDeviceAvailable: mockIsDeviceAvailable
      })

      // Add 3 recovery attempts
      await limitedEngine.recoverDevice('camera')
      await limitedEngine.recoverDevice('microphone')
      await limitedEngine.recoverDevice('speaker')

      const history = limitedEngine.getRecoveryHistory()
      expect(history).toHaveLength(2)
      
      limitedEngine.destroy()
    })
  })

  describe('Recovery Status and Management', () => {
    it('should provide recovery status', () => {
      const status = engine.getRecoveryStatus()

      expect(status).toEqual({
        activeRecoveries: 0,
        queuedRecoveries: 0
      })
    })

    it('should cancel active recovery', async () => {
      const cancelledSpy = jest.fn()
      engine.on('recovery.cancelled', cancelledSpy)

      // Start a recovery but don't await it
      const recoveryPromise = engine.recoverDevice('camera')
      
      // Cancel it immediately
      engine.cancelRecovery('camera', 'Test cancellation')

      await recoveryPromise

      expect(cancelledSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: expect.any(Object),
          reason: 'Test cancellation'
        })
      )
    })
  })

  describe('Device Availability Verification', () => {
    it('should verify device availability after strategy success', async () => {
      const result = await engine.recoverDevice('camera')

      expect(result.success).toBe(true)
      expect(mockIsDeviceAvailable).toHaveBeenCalled()
    })

    it('should try next strategy if device becomes unavailable', async () => {
      mockIsDeviceAvailable
        .mockResolvedValueOnce(false) // First strategy device not available
        .mockResolvedValueOnce(true)  // Second strategy device available

      const result = await engine.recoverDevice('camera')

      expect(result.success).toBe(true)
      expect(mockIsDeviceAvailable).toHaveBeenCalledTimes(2)
    })
  })

  describe('Device Types', () => {
    it.each([
      ['camera', 'videoinput'],
      ['microphone', 'audioinput'],
      ['speaker', 'audiooutput']
    ])('should handle %s device type correctly', async (deviceType: DeviceType, expectedKind: MediaDeviceKind) => {
      const result = await engine.recoverDevice(deviceType as DeviceType)

      expect(result.success).toBe(true)
      expect(mockEnumerateDevices).toHaveBeenCalled()
    })
  })

  describe('Cleanup and Destruction', () => {
    it('should clean up resources on destroy', () => {
      const testEngine = new DeviceRecoveryEngine()
      
      testEngine.destroy()

      // Should not throw errors when trying to use destroyed engine
      expect(() => testEngine.getRecoveryStatus()).not.toThrow()
    })

    it('should cancel active recoveries on destroy', async () => {
      const cancelledSpy = jest.fn()
      engine.on('recovery.cancelled', cancelledSpy)

      // Start recovery but don't await
      const recoveryPromise = engine.recoverDevice('camera')
      
      // Destroy engine
      engine.destroy()

      await recoveryPromise

      expect(cancelledSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Engine destroyed'
        })
      )
    })
  })

  describe('Configuration Options', () => {
    it('should respect debug option', () => {
      const debugEngine = new DeviceRecoveryEngine({ debug: true })
      expect(debugEngine).toBeInstanceOf(DeviceRecoveryEngine)
      debugEngine.destroy()
    })

    it('should use custom device enumeration function', async () => {
      const customEnumerate = jest.fn().mockResolvedValue([mockDevices.camera1])
      const customEngine = new DeviceRecoveryEngine({
        enumerateDevices: customEnumerate
      })

      await customEngine.recoverDevice('camera')

      expect(customEnumerate).toHaveBeenCalled()
      customEngine.destroy()
    })

    it('should use custom device availability checker', async () => {
      const customAvailabilityCheck = jest.fn().mockResolvedValue(true)
      const customEngine = new DeviceRecoveryEngine({
        enumerateDevices: mockEnumerateDevices,
        isDeviceAvailable: customAvailabilityCheck
      })

      await customEngine.recoverDevice('camera')

      expect(customAvailabilityCheck).toHaveBeenCalled()
      customEngine.destroy()
    })
  })
})