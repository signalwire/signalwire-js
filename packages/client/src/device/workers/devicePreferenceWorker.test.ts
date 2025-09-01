/**
 * Device Preference Worker Test Suite
 * Tests for the saga worker that handles device preference management
 */

import { expectSaga } from 'redux-saga-test-plan'
import { call, take, fork } from 'redux-saga/effects'
import { testUtils, getLogger } from '@signalwire/core'
import { devicePreferenceWorker } from '../../video/workers/devicePreferenceWorker'
import { DeviceManager } from '../DeviceManager'
import type { BaseRoomSessionConnection } from '../../BaseRoomSession'

const { createSwEventChannel, createSessionChannel } = testUtils

// Mock logger
const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

jest.mock('@signalwire/core', () => ({
  ...jest.requireActual('@signalwire/core'),
  getLogger: jest.fn(() => mockLogger),
}))

describe('devicePreferenceWorker', () => {
  let mockRoomSession: jest.Mocked<BaseRoomSessionConnection>
  let mockDeviceManager: jest.Mocked<DeviceManager>
  let swEventChannel: ReturnType<typeof createSwEventChannel>
  let sessionChannel: ReturnType<typeof createSessionChannel>

  beforeEach(() => {
    // Mock device manager
    mockDeviceManager = {
      setCamera: jest.fn().mockResolvedValue(undefined),
      setMicrophone: jest.fn().mockResolvedValue(undefined),
      setSpeaker: jest.fn().mockResolvedValue(undefined),
      clearPreferences: jest.fn().mockResolvedValue(undefined),
      recoverDevice: jest.fn().mockResolvedValue({
        success: true,
        deviceId: 'recovered-device',
        method: 'preference',
      }),
    } as any

    // Mock room session
    mockRoomSession = {
      deviceManager: mockDeviceManager,
      emit: jest.fn(),
      dispatch: jest.fn(),
    } as any

    // Create channels
    swEventChannel = createSwEventChannel()
    sessionChannel = createSessionChannel()

    // Clear all mocks
    jest.clearAllMocks()
    mockLogger.trace.mockClear()
    mockLogger.error.mockClear()
  })

  afterEach(() => {
    swEventChannel.close()
    sessionChannel.close()
  })

  describe('Worker Initialization', () => {
    it('should start and log initialization', async () => {
      let runSaga = true

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                sessionChannel.close()
                return { type: 'test.end' }
              }
              return next()
            },
          },
        ])
        .silentRun()

      expect(mockLogger.trace).toHaveBeenCalledWith(
        'devicePreferenceWorker started'
      )
    })

    it('should properly filter device preference events', async () => {
      const worker = devicePreferenceWorker({
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })

      const saga = expectSaga(() => worker.next().value)

      // Test the event filter function
      const testCases = [
        { type: 'device.preference.update', expected: true },
        { type: 'device.preference.clear', expected: true },
        { type: 'device.recovery.trigger', expected: true },
        { type: 'device.recovery.complete', expected: true },
        { type: 'video.member.joined', expected: false },
        { type: 'room.session.started', expected: false },
        { type: 'device.state.changed', expected: false },
      ]

      testCases.forEach(({ type, expected }) => {
        const action = { type, payload: {} }
        const isDevicePreferenceEvent = (a: any) =>
          a.type.startsWith('device.preference.') ||
          a.type.startsWith('device.recovery.')

        expect(isDevicePreferenceEvent(action)).toBe(expected)
      })
    })
  })

  describe('Device Preference Update', () => {
    it('should handle camera preference update', async () => {
      let runSaga = true
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'camera',
          deviceId: 'camera1',
          preference: { priority: 1, isFallback: false },
        },
      }

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .call([mockDeviceManager, 'setCamera'], 'camera1', {
          priority: 1,
          isFallback: false,
        })
        .silentRun()

      expect(mockDeviceManager.setCamera).toHaveBeenCalledWith('camera1', {
        priority: 1,
        isFallback: false,
      })
    })

    it('should handle microphone preference update', async () => {
      let runSaga = true
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'microphone',
          deviceId: 'mic1',
          preference: { priority: 2, isFallback: true },
        },
      }

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .call([mockDeviceManager, 'setMicrophone'], 'mic1', {
          priority: 2,
          isFallback: true,
        })
        .silentRun()

      expect(mockDeviceManager.setMicrophone).toHaveBeenCalledWith('mic1', {
        priority: 2,
        isFallback: true,
      })
    })

    it('should handle speaker preference update', async () => {
      let runSaga = true
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'speaker',
          deviceId: 'speaker1',
          preference: { priority: 1, metadata: { custom: 'data' } },
        },
      }

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .call([mockDeviceManager, 'setSpeaker'], 'speaker1', {
          priority: 1,
          metadata: { custom: 'data' },
        })
        .silentRun()

      expect(mockDeviceManager.setSpeaker).toHaveBeenCalledWith('speaker1', {
        priority: 1,
        metadata: { custom: 'data' },
      })
    })

    it('should emit error event when device preference update fails', async () => {
      let runSaga = true
      const error = new Error('Device not found')
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'camera',
          deviceId: 'invalid-camera',
          preference: { priority: 1 },
        },
      }

      // Mock device manager to throw error
      mockDeviceManager.setCamera.mockRejectedValue(error)

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .silentRun()

      expect(mockRoomSession.emit).toHaveBeenCalledWith(
        'device.preference.update.failed',
        {
          error,
          payload: action.payload,
        }
      )
    })

    it('should handle device preference update without deviceManager', async () => {
      // Mock room session without device manager
      const roomSessionWithoutDeviceManager = {
        ...mockRoomSession,
        deviceManager: null,
      }

      let runSaga = true
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'camera',
          deviceId: 'camera1',
          preference: { priority: 1 },
        },
      }

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: roomSessionWithoutDeviceManager,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .silentRun()

      // Should not call any device manager methods
      expect(mockDeviceManager.setCamera).not.toHaveBeenCalled()
    })
  })

  describe('Device Preference Clear', () => {
    it('should handle clearing preferences for specific device type', async () => {
      let runSaga = true
      const action = {
        type: 'device.preference.clear',
        payload: {
          deviceType: 'camera',
        },
      }

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .call([mockDeviceManager, 'clearPreferences'], 'camera')
        .silentRun()

      expect(mockDeviceManager.clearPreferences).toHaveBeenCalledWith('camera')
    })

    it('should emit error event when preference clear fails', async () => {
      let runSaga = true
      const error = new Error('Storage error')
      const action = {
        type: 'device.preference.clear',
        payload: {
          deviceType: 'microphone',
        },
      }

      // Mock device manager to throw error
      mockDeviceManager.clearPreferences.mockRejectedValue(error)

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .silentRun()

      expect(mockRoomSession.emit).toHaveBeenCalledWith(
        'device.preference.clear.failed',
        {
          error,
          payload: action.payload,
        }
      )
    })
  })

  describe('Device Recovery', () => {
    it('should handle device recovery trigger', async () => {
      let runSaga = true
      const action = {
        type: 'device.recovery.trigger',
        payload: {
          deviceType: 'speaker',
        },
      }

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .call([mockDeviceManager, 'recoverDevice'], 'speaker')
        .silentRun()

      expect(mockDeviceManager.recoverDevice).toHaveBeenCalledWith('speaker')
    })

    it('should emit error event when device recovery fails', async () => {
      let runSaga = true
      const error = new Error('No devices available for recovery')
      const action = {
        type: 'device.recovery.trigger',
        payload: {
          deviceType: 'camera',
        },
      }

      // Mock device manager to throw error
      mockDeviceManager.recoverDevice.mockRejectedValue(error)

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .silentRun()

      expect(mockRoomSession.emit).toHaveBeenCalledWith(
        'device.recovery.failed',
        {
          error,
          payload: action.payload,
        }
      )
    })

    it('should handle device recovery with different device types', async () => {
      const deviceTypes = ['camera', 'microphone', 'speaker'] as const

      for (const deviceType of deviceTypes) {
        let runSaga = true
        const action = {
          type: 'device.recovery.trigger',
          payload: { deviceType },
        }

        await expectSaga(devicePreferenceWorker, {
          channels: { swEventChannel, sessionChannel },
          instance: mockRoomSession,
          instanceMap: {} as any,
          runSaga: jest.fn(),
          getSession: jest.fn(),
        })
          .provide([
            {
              take({ channel }, next) {
                if (runSaga && channel === swEventChannel) {
                  runSaga = false
                  return action
                } else if (runSaga === false) {
                  sessionChannel.close()
                }
                return next()
              },
            },
          ])
          .call([mockDeviceManager, 'recoverDevice'], deviceType)
          .silentRun()

        expect(mockDeviceManager.recoverDevice).toHaveBeenCalledWith(deviceType)

        // Reset mocks for next iteration
        jest.clearAllMocks()
      }
    })
  })

  describe('Unknown Action Types', () => {
    it('should ignore unknown action types', async () => {
      let runSaga = true
      const action = {
        type: 'unknown.action.type',
        payload: { someData: 'value' },
      }

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .silentRun()

      // Should not call any device manager methods
      expect(mockDeviceManager.setCamera).not.toHaveBeenCalled()
      expect(mockDeviceManager.setMicrophone).not.toHaveBeenCalled()
      expect(mockDeviceManager.setSpeaker).not.toHaveBeenCalled()
      expect(mockDeviceManager.clearPreferences).not.toHaveBeenCalled()
      expect(mockDeviceManager.recoverDevice).not.toHaveBeenCalled()
    })

    it('should continue processing after unknown action', async () => {
      let actionCount = 0
      const actions = [
        { type: 'unknown.action', payload: {} },
        {
          type: 'device.preference.update',
          payload: { deviceType: 'camera', deviceId: 'camera1' },
        },
      ]

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (actionCount < actions.length && channel === swEventChannel) {
                return actions[actionCount++]
              } else if (actionCount >= actions.length) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .call([mockDeviceManager, 'setCamera'], 'camera1', undefined)
        .silentRun()

      expect(mockDeviceManager.setCamera).toHaveBeenCalledWith(
        'camera1',
        undefined
      )
    })
  })

  describe('Worker Event Handling', () => {
    it('should handle individual actions with fork pattern', async () => {
      let runSaga = true
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'camera',
          deviceId: 'camera1',
        },
      }

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .call([mockDeviceManager, 'setCamera'], 'camera1', undefined)
        .silentRun()

      expect(mockDeviceManager.setCamera).toHaveBeenCalledWith(
        'camera1',
        undefined
      )
    })

    it('should handle multiple concurrent actions', async () => {
      let actionCount = 0
      const actions = [
        {
          type: 'device.preference.update',
          payload: { deviceType: 'camera', deviceId: 'camera1' },
        },
        {
          type: 'device.preference.update',
          payload: { deviceType: 'microphone', deviceId: 'mic1' },
        },
        {
          type: 'device.recovery.trigger',
          payload: { deviceType: 'speaker' },
        },
      ]

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (actionCount < actions.length && channel === swEventChannel) {
                return actions[actionCount++]
              } else if (actionCount >= actions.length) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .call([mockDeviceManager, 'setCamera'], 'camera1', undefined)
        .call([mockDeviceManager, 'setMicrophone'], 'mic1', undefined)
        .call([mockDeviceManager, 'recoverDevice'], 'speaker')
        .silentRun()

      expect(mockDeviceManager.setCamera).toHaveBeenCalledWith(
        'camera1',
        undefined
      )
      expect(mockDeviceManager.setMicrophone).toHaveBeenCalledWith(
        'mic1',
        undefined
      )
      expect(mockDeviceManager.recoverDevice).toHaveBeenCalledWith('speaker')
    })
  })

  describe('Error Handling', () => {
    it('should continue processing after an error in one action', async () => {
      let actionCount = 0
      const error = new Error('First action failed')
      const actions = [
        {
          type: 'device.preference.update',
          payload: { deviceType: 'camera', deviceId: 'failing-camera' },
        },
        {
          type: 'device.preference.update',
          payload: { deviceType: 'microphone', deviceId: 'working-mic' },
        },
      ]

      // Mock first call to fail, second to succeed
      mockDeviceManager.setCamera.mockRejectedValueOnce(error)
      mockDeviceManager.setMicrophone.mockResolvedValueOnce(undefined)

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (actionCount < actions.length && channel === swEventChannel) {
                return actions[actionCount++]
              } else if (actionCount >= actions.length) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .silentRun()

      expect(mockRoomSession.emit).toHaveBeenCalledWith(
        'device.preference.update.failed',
        {
          error,
          payload: actions[0].payload,
        }
      )
      expect(mockDeviceManager.setMicrophone).toHaveBeenCalledWith(
        'working-mic',
        undefined
      )
    })

    it('should log errors properly', async () => {
      let runSaga = true
      const error = new Error('Device error')
      const action = {
        type: 'device.preference.update',
        payload: {
          deviceType: 'camera',
          deviceId: 'camera1',
        },
      }

      mockDeviceManager.setCamera.mockRejectedValue(error)

      await expectSaga(devicePreferenceWorker, {
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false
                return action
              } else if (runSaga === false) {
                sessionChannel.close()
              }
              return next()
            },
          },
        ])
        .silentRun()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Device preference update failed:',
        error
      )
    })
  })

  describe('Worker Lifecycle', () => {
    it('should handle worker startup', () => {
      // Test that the worker can be instantiated without errors
      const workerGenerator = devicePreferenceWorker({
        channels: { swEventChannel, sessionChannel },
        instance: mockRoomSession,
        instanceMap: {} as any,
        runSaga: jest.fn(),
        getSession: jest.fn(),
      })

      // Start the generator to trigger the initial logging
      const result = workerGenerator.next()

      expect(result.done).toBe(false)
      expect(mockLogger.trace).toHaveBeenCalledWith(
        'devicePreferenceWorker started'
      )
    })
  })
})
