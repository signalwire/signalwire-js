/**
 * DeviceRecoveryEngine EventEmitter Test Suite
 * Focused tests to verify EventEmitter functionality remains unchanged
 */

import { DeviceRecoveryEngine } from './DeviceRecoveryEngine'
import { RecoveryStatus } from './types'
import type {
  DeviceType,
  DeviceState,
  DevicePreference,
  RecoveryResult,
  DeviceRecoveryEngineOptions,
} from './types'

// Mock navigator.mediaDevices for testing
const mockEnumerateDevices = jest.fn()
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    enumerateDevices: mockEnumerateDevices,
  },
  writable: true,
})

describe('DeviceRecoveryEngine EventEmitter Functionality', () => {
  let engine: DeviceRecoveryEngine
  
  const mockDevices: MediaDeviceInfo[] = [
    {
      deviceId: 'camera1',
      kind: 'videoinput',
      label: 'Front Camera',
      groupId: 'group1',
      toJSON: () => ({}),
    } as MediaDeviceInfo,
    {
      deviceId: 'mic1',
      kind: 'audioinput',
      label: 'Built-in Microphone',
      groupId: 'group1',
      toJSON: () => ({}),
    } as MediaDeviceInfo,
  ]

  beforeEach(() => {
    mockEnumerateDevices.mockResolvedValue(mockDevices)
    engine = new DeviceRecoveryEngine({
      debug: false,
      maxRecoveryAttempts: 2,
      autoRecover: true,
    })
  })

  afterEach(() => {
    engine.destroy()
    jest.clearAllMocks()
  })

  describe('Event Emission', () => {
    it('should emit recovery.started event when recovery begins', async () => {
      let capturedEventData: any = null
      const startedHandler = jest.fn((eventData) => {
        capturedEventData = JSON.parse(JSON.stringify(eventData)) // Deep clone to capture state
      })
      engine.on('recovery.started', startedHandler)

      const deviceType: DeviceType = 'camera'
      const currentState: DeviceState = {
        deviceId: 'missing-camera',
        isAvailable: false,
        isActive: false,
      }

      // Execute recovery - this will succeed due to fallback strategies
      const promise = engine.recoverDevice(deviceType, currentState)
      
      // Wait for the promise to complete
      await promise
      
      expect(startedHandler).toHaveBeenCalledTimes(1)
      expect(capturedEventData).toMatchObject({
        attempt: expect.objectContaining({
          deviceType: 'camera',
          status: RecoveryStatus.IN_PROGRESS,
        }),
      })
    })

    it('should emit recovery.succeeded event when recovery succeeds', async () => {
      const succeededHandler = jest.fn()
      engine.on('recovery.succeeded', succeededHandler)

      const deviceType: DeviceType = 'camera'
      const currentState: DeviceState = {
        deviceId: 'camera1', // This exists in our mock devices
        isAvailable: false,
        isActive: false,
      }

      const result = await engine.recoverDevice(deviceType, currentState)

      expect(result.success).toBe(true)
      expect(succeededHandler).toHaveBeenCalledTimes(1)
      expect(succeededHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: expect.objectContaining({
            deviceType: 'camera',
          }),
          result: expect.objectContaining({
            success: true,
            deviceId: 'camera1',
          }),
        })
      )
    })

    it('should emit recovery.failed event when recovery fails', async () => {
      const failedHandler = jest.fn()
      engine.on('recovery.failed', failedHandler)

      const deviceType: DeviceType = 'speaker' // No speakers in mock devices
      const currentState: DeviceState = {
        deviceId: 'missing-speaker',
        isAvailable: false,
        isActive: false,
      }

      const result = await engine.recoverDevice(deviceType, currentState)

      expect(result.success).toBe(false)
      expect(failedHandler).toHaveBeenCalledTimes(1)
      expect(failedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: expect.objectContaining({
            deviceType: 'speaker',
          }),
          error: expect.any(Error),
        })
      )
    })

    it('should emit recovery.cancelled event when recovery is cancelled', async () => {
      const cancelledHandler = jest.fn()
      engine.on('recovery.cancelled', cancelledHandler)

      const deviceType: DeviceType = 'camera'
      
      // Start a recovery (but don't await it immediately)
      const recoveryPromise = engine.recoverDevice(deviceType)
      
      // Cancel it before it completes
      engine.cancelRecovery(deviceType, 'Test cancellation')

      await recoveryPromise

      expect(cancelledHandler).toHaveBeenCalledTimes(1)
      expect(cancelledHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: expect.objectContaining({
            deviceType: 'camera',
          }),
          reason: 'Test cancellation',
        })
      )
    })

    it('should emit status.changed event when recovery status changes', async () => {
      const statusHandler = jest.fn()
      engine.on('status.changed', statusHandler)

      const deviceType: DeviceType = 'camera'
      
      await engine.recoverDevice(deviceType)

      // Should have been called at least once (when recovery completes)
      expect(statusHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          activeRecoveries: expect.any(Number),
          queuedRecoveries: expect.any(Number),
        })
      )
    })

    it('should emit strategy.executed event during recovery', async () => {
      const strategyHandler = jest.fn()
      engine.on('strategy.executed', strategyHandler)

      const deviceType: DeviceType = 'camera'
      const currentState: DeviceState = {
        deviceId: 'camera1',
        isAvailable: false,
        isActive: false,
      }

      await engine.recoverDevice(deviceType, currentState)

      expect(strategyHandler).toHaveBeenCalled()
      expect(strategyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: expect.objectContaining({
            deviceType: 'camera',
          }),
          strategy: expect.objectContaining({
            name: expect.any(String),
          }),
          result: expect.objectContaining({
            success: expect.any(Boolean),
          }),
        })
      )
    })
  })

  describe('Event Listener Management', () => {
    it('should support adding and removing event listeners', () => {
      const handler = jest.fn()
      
      engine.on('recovery.started', handler)
      expect(engine.listenerCount('recovery.started')).toBe(1)
      
      engine.off('recovery.started', handler)
      expect(engine.listenerCount('recovery.started')).toBe(0)
    })

    it('should support once listeners', async () => {
      const handler = jest.fn()
      
      engine.once('recovery.started', handler)
      
      // Trigger two recoveries
      await engine.recoverDevice('camera')
      await engine.recoverDevice('microphone')
      
      // Handler should only be called once
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should clean up all listeners on destroy', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      
      engine.on('recovery.started', handler1)
      engine.on('recovery.failed', handler2)
      
      expect(engine.listenerCount('recovery.started')).toBe(1)
      expect(engine.listenerCount('recovery.failed')).toBe(1)
      
      engine.destroy()
      
      expect(engine.listenerCount('recovery.started')).toBe(0)
      expect(engine.listenerCount('recovery.failed')).toBe(0)
    })
  })

  describe('Constructor with sessionConnection', () => {
    it('should accept optional sessionConnection parameter', () => {
      const mockSessionConnection = {
        store: {
          dispatch: jest.fn(),
        },
      } as any

      const engineWithSession = new DeviceRecoveryEngine(
        { debug: false },
        mockSessionConnection
      )

      expect(engineWithSession).toBeInstanceOf(DeviceRecoveryEngine)
      
      engineWithSession.destroy()
    })

    it('should work without sessionConnection parameter', () => {
      const engineWithoutSession = new DeviceRecoveryEngine({ debug: false })

      expect(engineWithoutSession).toBeInstanceOf(DeviceRecoveryEngine)
      
      engineWithoutSession.destroy()
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain existing API for basic recovery', async () => {
      const deviceType: DeviceType = 'camera'
      const result = await engine.recoverDevice(deviceType)

      expect(typeof result.success).toBe('boolean')
      expect(typeof result.method).toBe('string')
      expect(typeof result.attempts).toBe('number')
    })

    it('should maintain existing API for strategy execution', async () => {
      const strategyName = 'exact-id-match'
      const deviceType: DeviceType = 'camera'
      
      const result = await engine.tryStrategy(strategyName, deviceType)

      expect(typeof result.success).toBe('boolean')
    })

    it('should maintain existing API for recovery history', () => {
      const history = engine.getRecoveryHistory()
      const status = engine.getRecoveryStatus()

      expect(Array.isArray(history)).toBe(true)
      expect(typeof status.activeRecoveries).toBe('number')
      expect(typeof status.queuedRecoveries).toBe('number')
    })
  })
})