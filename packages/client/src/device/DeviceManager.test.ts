/**
 * DeviceManager Test Suite
 * Tests for the device preference management functionality
 */

import { EventEmitter } from '@signalwire/core'
import { DeviceManager } from './DeviceManager'
import { MemoryStorageAdapter } from './DevicePreferenceStorage'
import type { BaseRoomSessionConnection } from '../BaseRoomSession'
import type { DevicePreferenceConfig } from './types'

// Mock BaseRoomSessionConnection
class MockRoomSession extends EventEmitter<any> implements Partial<BaseRoomSessionConnection> {
  updateCamera = jest.fn().mockResolvedValue(undefined)
  updateMicrophone = jest.fn().mockResolvedValue(undefined)
  updateSpeaker = jest.fn().mockResolvedValue(undefined)
}

// Mock navigator.mediaDevices
const mockDevices: MediaDeviceInfo[] = [
  {
    deviceId: 'camera1',
    kind: 'videoinput',
    label: 'Front Camera',
    groupId: 'group1',
    toJSON: () => ({})
  } as MediaDeviceInfo,
  {
    deviceId: 'camera2',
    kind: 'videoinput',
    label: 'Back Camera',
    groupId: 'group2',
    toJSON: () => ({})
  } as MediaDeviceInfo,
  {
    deviceId: 'mic1',
    kind: 'audioinput',
    label: 'Built-in Microphone',
    groupId: 'group1',
    toJSON: () => ({})
  } as MediaDeviceInfo,
  {
    deviceId: 'speaker1',
    kind: 'audiooutput',
    label: 'Built-in Speaker',
    groupId: 'group1',
    toJSON: () => ({})
  } as MediaDeviceInfo,
]

describe('DeviceManager', () => {
  let roomSession: MockRoomSession
  let deviceManager: DeviceManager
  let config: DevicePreferenceConfig

  beforeEach(() => {
    roomSession = new MockRoomSession() as any
    config = {
      storageAdapter: new MemoryStorageAdapter(),
      global: {
        enableMonitoring: false, // Disable monitoring for tests
        persistPreferences: true
      }
    }

    // Mock navigator.mediaDevices.enumerateDevices
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        ...global.navigator?.mediaDevices,
        enumerateDevices: jest.fn().mockResolvedValue(mockDevices)
      }
    } as any

    deviceManager = new DeviceManager(roomSession as any, config)
  })

  afterEach(() => {
    deviceManager.destroy()
    jest.clearAllMocks()
  })

  describe('Device Setting', () => {
    it('should set camera device', async () => {
      await deviceManager.setCamera('camera1')

      expect(roomSession.updateCamera).toHaveBeenCalledWith({ deviceId: 'camera1' })
      
      const state = deviceManager.getDeviceState('camera')
      expect(state).toMatchObject({
        deviceId: 'camera1',
        isAvailable: true,
        isActive: true,
        label: 'Front Camera'
      })
    })

    it('should set microphone device', async () => {
      await deviceManager.setMicrophone('mic1')

      expect(roomSession.updateMicrophone).toHaveBeenCalledWith({ deviceId: 'mic1' })
      
      const state = deviceManager.getDeviceState('microphone')
      expect(state).toMatchObject({
        deviceId: 'mic1',
        isAvailable: true,
        isActive: true,
        label: 'Built-in Microphone'
      })
    })

    it('should set speaker device', async () => {
      await deviceManager.setSpeaker('speaker1')

      expect(roomSession.updateSpeaker).toHaveBeenCalledWith({ deviceId: 'speaker1' })
      
      const state = deviceManager.getDeviceState('speaker')
      expect(state).toMatchObject({
        deviceId: 'speaker1',
        isAvailable: true,
        isActive: true,
        label: 'Built-in Speaker'
      })
    })

    it('should throw error for non-existent device', async () => {
      await expect(deviceManager.setCamera('invalid-device')).rejects.toThrow('Device invalid-device not found')
    })
  })

  describe('Preferences', () => {
    it('should save device preference when setting device', async () => {
      await deviceManager.setCamera('camera1', {
        priority: 1,
        isFallback: false,
        metadata: { custom: 'data' }
      })

      const preferences = deviceManager.getPreferences('camera')
      expect(preferences).toHaveLength(1)
      expect(preferences[0]).toMatchObject({
        deviceId: 'camera1',
        label: 'Front Camera',
        priority: 1,
        isFallback: false,
        metadata: { custom: 'data' }
      })
    })

    it('should update existing preference', async () => {
      // Set initial preference
      await deviceManager.setCamera('camera1', { priority: 2 })
      
      // Update preference
      await deviceManager.setCamera('camera1', { priority: 1, isFallback: true })

      const preferences = deviceManager.getPreferences('camera')
      expect(preferences).toHaveLength(1)
      expect(preferences[0]).toMatchObject({
        deviceId: 'camera1',
        priority: 1,
        isFallback: true
      })
    })

    it('should maintain multiple preferences sorted by priority', async () => {
      await deviceManager.setCamera('camera2', { priority: 2 })
      await deviceManager.setCamera('camera1', { priority: 1 })

      const preferences = deviceManager.getPreferences('camera')
      expect(preferences).toHaveLength(2)
      expect(preferences[0].deviceId).toBe('camera1')
      expect(preferences[1].deviceId).toBe('camera2')
    })

    it('should clear preferences', async () => {
      await deviceManager.setCamera('camera1', { priority: 1 })
      await deviceManager.setMicrophone('mic1', { priority: 1 })

      await deviceManager.clearPreferences('camera')

      expect(deviceManager.getPreferences('camera')).toHaveLength(0)
      expect(deviceManager.getPreferences('microphone')).toHaveLength(1)
    })

    it('should clear all preferences when type not specified', async () => {
      await deviceManager.setCamera('camera1', { priority: 1 })
      await deviceManager.setMicrophone('mic1', { priority: 1 })

      await deviceManager.clearPreferences()

      expect(deviceManager.getPreferences('camera')).toHaveLength(0)
      expect(deviceManager.getPreferences('microphone')).toHaveLength(0)
    })
  })

  describe('Events', () => {
    it('should emit device.state.changed event', async () => {
      const handler = jest.fn()
      deviceManager.on('device.state.changed', handler)

      await deviceManager.setCamera('camera1')

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'camera',
          state: expect.objectContaining({
            deviceId: 'camera1',
            isAvailable: true,
            isActive: true
          })
        })
      )
    })

    it('should emit device.preference.updated event', async () => {
      const handler = jest.fn()
      deviceManager.on('device.preference.updated', handler)

      await deviceManager.setCamera('camera1', { priority: 1 })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'camera',
          preference: expect.objectContaining({
            deviceId: 'camera1',
            priority: 1
          })
        })
      )
    })

    it('should emit preferences.cleared event', async () => {
      const handler = jest.fn()
      deviceManager.on('preferences.cleared', handler)

      await deviceManager.setCamera('camera1')
      await deviceManager.clearPreferences('camera')

      expect(handler).toHaveBeenCalledWith({ types: ['camera'] })
    })
  })

  describe('Recovery', () => {
    it('should recover to preferred device', async () => {
      // Set up preferences
      await deviceManager.setCamera('camera1', { priority: 1 })
      await deviceManager.setCamera('camera2', { priority: 2, isFallback: true })

      // Simulate recovery
      const result = await deviceManager.recoverDevice('camera')

      expect(result.success).toBe(true)
      expect(result.deviceId).toBe('camera1')
      expect(result.method).toBe('preference')
    })

    it('should recover to fallback device when preferred unavailable', async () => {
      // Set up preferences
      await deviceManager.setCamera('camera2', { priority: 1, isFallback: true })

      // Mock camera1 as unavailable
      const limitedDevices = mockDevices.filter(d => d.deviceId !== 'camera1')
      ;(navigator.mediaDevices.enumerateDevices as jest.Mock).mockResolvedValue(limitedDevices)

      const result = await deviceManager.recoverDevice('camera')

      expect(result.success).toBe(true)
      expect(result.deviceId).toBe('camera2')
      expect(result.method).toBe('fallback')
    })

    it('should emit recovery events', async () => {
      const startHandler = jest.fn()
      const completeHandler = jest.fn()
      
      deviceManager.on('device.recovery.started', startHandler)
      deviceManager.on('device.recovery.completed', completeHandler)

      await deviceManager.setCamera('camera1')
      await deviceManager.recoverDevice('camera')

      expect(startHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'camera',
          reason: 'Manual recovery initiated'
        })
      )

      expect(completeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'camera',
          result: expect.objectContaining({
            success: true
          })
        })
      )
    })
  })

  describe('Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should start and stop monitoring', () => {
      const scanSpy = jest.spyOn(deviceManager as any, 'scanDevices')
      
      deviceManager.startMonitoring()
      expect(scanSpy).toHaveBeenCalledTimes(1) // Initial scan

      jest.advanceTimersByTime(5000)
      expect(scanSpy).toHaveBeenCalledTimes(2) // One more scan after interval

      deviceManager.stopMonitoring()
      jest.advanceTimersByTime(5000)
      expect(scanSpy).toHaveBeenCalledTimes(2) // No more scans after stop
    })

    it('should detect device changes during monitoring', async () => {
      const handler = jest.fn()
      deviceManager.on('device.monitor.change', handler)

      deviceManager.startMonitoring()
      
      // Simulate device addition
      const newDevice: MediaDeviceInfo = {
        deviceId: 'camera3',
        kind: 'videoinput',
        label: 'External Camera',
        groupId: 'group3',
        toJSON: () => ({})
      } as MediaDeviceInfo

      const updatedDevices = [...mockDevices, newDevice]
      ;(navigator.mediaDevices.enumerateDevices as jest.Mock).mockResolvedValue(updatedDevices)

      jest.advanceTimersByTime(5000)
      await Promise.resolve() // Let async operations complete

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          added: expect.arrayContaining([
            expect.objectContaining({ deviceId: 'camera3' })
          ])
        })
      )
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const stopMonitoringSpy = jest.spyOn(deviceManager, 'stopMonitoring')
      
      deviceManager.startMonitoring()
      deviceManager.destroy()

      expect(stopMonitoringSpy).toHaveBeenCalled()
      expect(deviceManager.getDeviceState('camera')).toBeUndefined()
      expect(deviceManager.getPreferences('camera')).toHaveLength(0)
    })
  })
})