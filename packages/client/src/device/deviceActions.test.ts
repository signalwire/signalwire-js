/**
 * Device Actions Test Suite
 * Tests for Redux actions used in device preference management
 */

import {
  devicePreferenceUpdateAction,
  devicePreferenceClearAction,
  deviceRecoveryTriggerAction,
  deviceChangeDetectedAction,
  deviceMonitoringStartedAction,
  deviceMonitoringStoppedAction,
  deviceUnavailableAction,
  deviceRecoverySuccessAction,
  deviceRecoveryFailureAction,
  deviceStateChangedAction,
  devicePreferencesLoadedAction,
  devicePreferencesSavedAction,
  devicePreferencesClearedAction,
  deviceEnumerationErrorAction,
} from './deviceActions'
import type { DeviceType, DevicePreference, RecoveryResult } from './types'

describe('Device Actions', () => {
  describe('devicePreferenceUpdateAction', () => {
    it('should create action to update device preference', () => {
      const payload = {
        deviceType: 'camera' as DeviceType,
        deviceId: 'camera1',
        preference: {
          priority: 1,
          isFallback: false,
          metadata: { custom: 'data' },
        } as Partial<DevicePreference>,
      }

      const action = devicePreferenceUpdateAction(payload)

      expect(action).toEqual({
        type: 'device.preference.update',
        payload,
      })
    })

    it('should create action to update device preference without preference object', () => {
      const payload = {
        deviceType: 'microphone' as DeviceType,
        deviceId: 'mic1',
      }

      const action = devicePreferenceUpdateAction(payload)

      expect(action).toEqual({
        type: 'device.preference.update',
        payload,
      })
    })

    it('should handle all device types', () => {
      const deviceTypes: DeviceType[] = ['camera', 'microphone', 'speaker']

      deviceTypes.forEach((deviceType) => {
        const payload = {
          deviceType,
          deviceId: `${deviceType}1`,
          preference: { priority: 1 },
        }

        const action = devicePreferenceUpdateAction(payload)

        expect(action.type).toBe('device.preference.update')
        expect(action.payload.deviceType).toBe(deviceType)
      })
    })
  })

  describe('devicePreferenceClearAction', () => {
    it('should create action to clear specific device type preferences', () => {
      const payload = {
        deviceType: 'camera' as DeviceType,
      }

      const action = devicePreferenceClearAction(payload)

      expect(action).toEqual({
        type: 'device.preference.clear',
        payload,
      })
    })

    it('should create action to clear all preferences', () => {
      const payload = {}

      const action = devicePreferenceClearAction(payload)

      expect(action).toEqual({
        type: 'device.preference.clear',
        payload,
      })
    })
  })

  describe('deviceRecoveryTriggerAction', () => {
    it('should create action to trigger device recovery', () => {
      const payload = {
        deviceType: 'speaker' as DeviceType,
        reason: 'Device disconnected',
      }

      const action = deviceRecoveryTriggerAction(payload)

      expect(action).toEqual({
        type: 'device.recovery.trigger',
        payload,
      })
    })

    it('should create action to trigger device recovery without reason', () => {
      const payload = {
        deviceType: 'microphone' as DeviceType,
      }

      const action = deviceRecoveryTriggerAction(payload)

      expect(action).toEqual({
        type: 'device.recovery.trigger',
        payload,
      })
    })
  })

  describe('deviceChangeDetectedAction', () => {
    it('should create action for device added', () => {
      const mockDevice: MediaDeviceInfo = {
        deviceId: 'camera2',
        kind: 'videoinput',
        label: 'External Camera',
        groupId: 'group2',
        toJSON: () => ({}),
      } as MediaDeviceInfo

      const payload = {
        deviceType: 'camera' as DeviceType,
        changeType: 'added' as const,
        deviceId: 'camera2',
        deviceInfo: mockDevice,
      }

      const action = deviceChangeDetectedAction(payload)

      expect(action).toEqual({
        type: 'device.change.detected',
        payload,
      })
    })

    it('should create action for device removed', () => {
      const payload = {
        deviceType: 'microphone' as DeviceType,
        changeType: 'removed' as const,
        deviceId: 'mic1',
      }

      const action = deviceChangeDetectedAction(payload)

      expect(action).toEqual({
        type: 'device.change.detected',
        payload,
      })
    })

    it('should create action for device changed', () => {
      const mockDevice: MediaDeviceInfo = {
        deviceId: 'speaker1',
        kind: 'audiooutput',
        label: 'Updated Speaker Name',
        groupId: 'group1',
        toJSON: () => ({}),
      } as MediaDeviceInfo

      const payload = {
        deviceType: 'speaker' as DeviceType,
        changeType: 'changed' as const,
        deviceId: 'speaker1',
        deviceInfo: mockDevice,
      }

      const action = deviceChangeDetectedAction(payload)

      expect(action).toEqual({
        type: 'device.change.detected',
        payload,
      })
    })
  })

  describe('deviceMonitoringStartedAction', () => {
    it('should create action for monitoring started', () => {
      const payload = {
        pollingInterval: 5000,
        nativeEventsSupported: true,
      }

      const action = deviceMonitoringStartedAction(payload)

      expect(action).toEqual({
        type: 'device.monitoring.started',
        payload,
      })
    })

    it('should create action for monitoring started without native events', () => {
      const payload = {
        pollingInterval: 10000,
        nativeEventsSupported: false,
      }

      const action = deviceMonitoringStartedAction(payload)

      expect(action).toEqual({
        type: 'device.monitoring.started',
        payload,
      })
    })
  })

  describe('deviceMonitoringStoppedAction', () => {
    it('should create action for monitoring stopped with reason', () => {
      const payload = {
        reason: 'User requested stop',
      }

      const action = deviceMonitoringStoppedAction(payload)

      expect(action).toEqual({
        type: 'device.monitoring.stopped',
        payload,
      })
    })

    it('should create action for monitoring stopped without reason', () => {
      const payload = {}

      const action = deviceMonitoringStoppedAction(payload)

      expect(action).toEqual({
        type: 'device.monitoring.stopped',
        payload,
      })
    })
  })

  describe('deviceUnavailableAction', () => {
    it('should create action for device unavailable', () => {
      const payload = {
        deviceType: 'camera' as DeviceType,
        deviceId: 'camera1',
        reason: 'Device disconnected',
      }

      const action = deviceUnavailableAction(payload)

      expect(action).toEqual({
        type: 'device.unavailable',
        payload,
      })
    })

    it('should create action for device unavailable without reason', () => {
      const payload = {
        deviceType: 'microphone' as DeviceType,
        deviceId: 'mic1',
      }

      const action = deviceUnavailableAction(payload)

      expect(action).toEqual({
        type: 'device.unavailable',
        payload,
      })
    })
  })

  describe('deviceRecoverySuccessAction', () => {
    it('should create action for successful recovery', () => {
      const mockResult: RecoveryResult = {
        success: true,
        deviceId: 'camera2',
        method: 'preference',
        attempts: 1,
        duration: 150,
      }

      const payload = {
        deviceType: 'camera' as DeviceType,
        result: mockResult,
      }

      const action = deviceRecoverySuccessAction(payload)

      expect(action).toEqual({
        type: 'device.recovery.success',
        payload,
      })
    })

    it('should create action for recovery with fallback method', () => {
      const mockResult: RecoveryResult = {
        success: true,
        deviceId: 'mic2',
        method: 'fallback',
        attempts: 2,
        duration: 300,
      }

      const payload = {
        deviceType: 'microphone' as DeviceType,
        result: mockResult,
      }

      const action = deviceRecoverySuccessAction(payload)

      expect(action.payload.result.method).toBe('fallback')
      expect(action.payload.result.attempts).toBe(2)
    })
  })

  describe('deviceRecoveryFailureAction', () => {
    it('should create action for recovery failure', () => {
      const error = new Error('No devices available')
      const payload = {
        deviceType: 'speaker' as DeviceType,
        error,
        attempts: 3,
      }

      const action = deviceRecoveryFailureAction(payload)

      expect(action).toEqual({
        type: 'device.recovery.failure',
        payload,
      })
    })

    it('should preserve error object properties', () => {
      const error = new Error('Recovery timeout')
      error.name = 'TimeoutError'

      const payload = {
        deviceType: 'camera' as DeviceType,
        error,
        attempts: 5,
      }

      const action = deviceRecoveryFailureAction(payload)

      expect(action.payload.error.message).toBe('Recovery timeout')
      expect(action.payload.error.name).toBe('TimeoutError')
    })
  })

  describe('deviceStateChangedAction', () => {
    it('should create action for device state change with all properties', () => {
      const payload = {
        deviceType: 'camera' as DeviceType,
        deviceId: 'camera1',
        isAvailable: true,
        isActive: true,
        label: 'Front Camera',
        error: null,
      }

      const action = deviceStateChangedAction(payload)

      expect(action).toEqual({
        type: 'device.state.changed',
        payload,
      })
    })

    it('should create action for device state change with error', () => {
      const error = new Error('Device access denied')
      const payload = {
        deviceType: 'microphone' as DeviceType,
        deviceId: null,
        isAvailable: false,
        isActive: false,
        error,
      }

      const action = deviceStateChangedAction(payload)

      expect(action.payload.error).toBe(error)
      expect(action.payload.isAvailable).toBe(false)
    })

    it('should create action for device state change with minimal properties', () => {
      const payload = {
        deviceType: 'speaker' as DeviceType,
        deviceId: 'speaker1',
        isAvailable: true,
        isActive: false,
      }

      const action = deviceStateChangedAction(payload)

      expect(action.type).toBe('device.state.changed')
      expect(action.payload.label).toBeUndefined()
      expect(action.payload.error).toBeUndefined()
    })
  })

  describe('devicePreferencesLoadedAction', () => {
    it('should create action for preferences loaded', () => {
      const preferences = {
        camera: [
          {
            deviceId: 'camera1',
            label: 'Front Camera',
            priority: 1,
            isFallback: false,
          },
        ],
        microphone: [
          {
            deviceId: 'mic1',
            label: 'Built-in Microphone',
            priority: 1,
            isFallback: true,
          },
        ],
        speaker: [],
      } as Record<DeviceType, DevicePreference[]>

      const payload = { preferences }

      const action = devicePreferencesLoadedAction(payload)

      expect(action).toEqual({
        type: 'device.preferences.loaded',
        payload,
      })
    })

    it('should handle empty preferences', () => {
      const preferences = {
        camera: [],
        microphone: [],
        speaker: [],
      } as Record<DeviceType, DevicePreference[]>

      const payload = { preferences }

      const action = devicePreferencesLoadedAction(payload)

      expect(action.payload.preferences.camera).toHaveLength(0)
      expect(action.payload.preferences.microphone).toHaveLength(0)
      expect(action.payload.preferences.speaker).toHaveLength(0)
    })
  })

  describe('devicePreferencesSavedAction', () => {
    it('should create action for preferences saved', () => {
      const preferences = {
        camera: [
          {
            deviceId: 'camera1',
            label: 'Front Camera',
            priority: 1,
            isFallback: false,
            metadata: { source: 'user-selection' },
          },
        ],
        microphone: [],
        speaker: [],
      } as Record<DeviceType, DevicePreference[]>

      const payload = { preferences }

      const action = devicePreferencesSavedAction(payload)

      expect(action).toEqual({
        type: 'device.preferences.saved',
        payload,
      })
    })
  })

  describe('devicePreferencesClearedAction', () => {
    it('should create action for specific types cleared', () => {
      const payload = {
        types: ['camera', 'microphone'] as DeviceType[],
      }

      const action = devicePreferencesClearedAction(payload)

      expect(action).toEqual({
        type: 'device.preferences.cleared',
        payload,
      })
    })

    it('should create action for all preferences cleared', () => {
      const payload = {}

      const action = devicePreferencesClearedAction(payload)

      expect(action).toEqual({
        type: 'device.preferences.cleared',
        payload,
      })
    })
  })

  describe('deviceEnumerationErrorAction', () => {
    it('should create action for enumeration error', () => {
      const error = new Error('Permission denied')
      const timestamp = Date.now()
      const payload = {
        error,
        timestamp,
      }

      const action = deviceEnumerationErrorAction(payload)

      expect(action).toEqual({
        type: 'device.enumeration.error',
        payload,
      })
    })

    it('should preserve error details in enumeration error', () => {
      const error = new Error('NotFoundError')
      error.name = 'NotFoundError'
      const timestamp = 1640995200000

      const payload = {
        error,
        timestamp,
      }

      const action = deviceEnumerationErrorAction(payload)

      expect(action.payload.error.message).toBe('NotFoundError')
      expect(action.payload.error.name).toBe('NotFoundError')
      expect(action.payload.timestamp).toBe(1640995200000)
    })
  })

  describe('Action Type Consistency', () => {
    it('should have consistent action type format', () => {
      const actions = [
        devicePreferenceUpdateAction,
        devicePreferenceClearAction,
        deviceRecoveryTriggerAction,
        deviceChangeDetectedAction,
        deviceMonitoringStartedAction,
        deviceMonitoringStoppedAction,
        deviceUnavailableAction,
        deviceRecoverySuccessAction,
        deviceRecoveryFailureAction,
        deviceStateChangedAction,
        devicePreferencesLoadedAction,
        devicePreferencesSavedAction,
        devicePreferencesClearedAction,
        deviceEnumerationErrorAction,
      ]

      actions.forEach((actionCreator) => {
        const action = actionCreator({} as any)
        expect(action.type).toMatch(/^device\./)
        expect(typeof action.type).toBe('string')
        expect(action.type.length).toBeGreaterThan(0)
      })
    })

    it('should have unique action types', () => {
      const actionCreators = [
        devicePreferenceUpdateAction,
        devicePreferenceClearAction,
        deviceRecoveryTriggerAction,
        deviceChangeDetectedAction,
        deviceMonitoringStartedAction,
        deviceMonitoringStoppedAction,
        deviceUnavailableAction,
        deviceRecoverySuccessAction,
        deviceRecoveryFailureAction,
        deviceStateChangedAction,
        devicePreferencesLoadedAction,
        devicePreferencesSavedAction,
        devicePreferencesClearedAction,
        deviceEnumerationErrorAction,
      ]

      const actionTypes = actionCreators.map(
        (creator) => creator({} as any).type
      )
      const uniqueTypes = new Set(actionTypes)

      expect(uniqueTypes.size).toBe(actionTypes.length)
    })
  })

  describe('Payload Validation', () => {
    it('should handle payloads with required properties', () => {
      // Test that actions with required properties work correctly
      expect(() => {
        devicePreferenceUpdateAction({
          deviceType: 'camera',
          deviceId: 'camera1',
        })
      }).not.toThrow()

      expect(() => {
        deviceRecoveryTriggerAction({
          deviceType: 'microphone',
        })
      }).not.toThrow()

      expect(() => {
        deviceChangeDetectedAction({
          deviceType: 'speaker',
          changeType: 'added',
          deviceId: 'speaker1',
        })
      }).not.toThrow()
    })

    it('should handle payload objects correctly', () => {
      const payload = {
        deviceType: 'camera' as DeviceType,
        deviceId: 'camera1',
        preference: { priority: 1 },
      }

      const action = devicePreferenceUpdateAction(payload)

      // Action should contain the payload
      expect(action.payload.deviceId).toBe('camera1')
      expect(action.payload.preference!.priority).toBe(1)
      expect(action.payload.deviceType).toBe('camera')
    })
  })
})
