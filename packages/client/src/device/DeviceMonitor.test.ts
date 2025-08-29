/**
 * DeviceMonitor Test Suite
 * Comprehensive tests for the device monitoring functionality
 */

import { DeviceMonitor } from './DeviceMonitor'
import type { DeviceChanges, DeviceChangeEvent } from './types'

// Mock devices for testing
const mockDevices: MediaDeviceInfo[] = [
  {
    deviceId: 'camera1',
    kind: 'videoinput',
    label: 'Front Camera',
    groupId: 'group1',
    toJSON: () => ({}),
  } as MediaDeviceInfo,
  {
    deviceId: 'camera2',
    kind: 'videoinput',
    label: 'Back Camera',
    groupId: 'group2',
    toJSON: () => ({}),
  } as MediaDeviceInfo,
  {
    deviceId: 'mic1',
    kind: 'audioinput',
    label: 'Built-in Microphone',
    groupId: 'group1',
    toJSON: () => ({}),
  } as MediaDeviceInfo,
  {
    deviceId: 'speaker1',
    kind: 'audiooutput',
    label: 'Built-in Speaker',
    groupId: 'group1',
    toJSON: () => ({}),
  } as MediaDeviceInfo,
]

const mockNewDevice: MediaDeviceInfo = {
  deviceId: 'camera3',
  kind: 'videoinput',
  label: 'External Camera',
  groupId: 'group3',
  toJSON: () => ({}),
} as MediaDeviceInfo

// Mock navigator.mediaDevices
const mockEnumerateDevices = jest.fn()
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      enumerateDevices: mockEnumerateDevices,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    },
  },
  writable: true,
})

// Mock document for visibility API
Object.defineProperty(global, 'document', {
  value: {
    visibilityState: 'visible',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
})

// Mock window for focus events
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
})

// Utility to wait for promises/timers
const waitForAsync = (ms = 10) =>
  new Promise((resolve) => setTimeout(resolve, ms))

describe('DeviceMonitor', () => {
  let monitor: DeviceMonitor

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()

    // Setup default mock behavior
    mockEnumerateDevices.mockResolvedValue([...mockDevices])

    // Create monitor instance
    monitor = new DeviceMonitor({
      pollingInterval: 100,
      debounceDelay: 50,
      debug: false,
    })
  })

  afterEach(async () => {
    if (monitor && monitor.isActive()) {
      monitor.destroy()
    }
    jest.useRealTimers()
  })

  describe('Constructor and Initialization', () => {
    it('should create monitor with default options', () => {
      const defaultMonitor = new DeviceMonitor()
      expect(defaultMonitor).toBeDefined()
      expect(defaultMonitor.isActive()).toBe(false)
      defaultMonitor.destroy()
    })

    it('should create monitor with custom options', () => {
      const customMonitor = new DeviceMonitor({
        pollingInterval: 5000,
        debounceDelay: 200,
        useNativeEvents: false,
        monitorOnVisibilityChange: false,
        monitorOnFocusChange: false,
        debug: true,
      })

      expect(customMonitor).toBeDefined()
      expect(customMonitor.isActive()).toBe(false)
      customMonitor.destroy()
    })

    it('should detect browser capabilities correctly', () => {
      expect(monitor).toBeDefined()
      // Browser capabilities are detected in constructor
      // The actual capabilities depend on the mock setup
    })
  })

  describe('Starting and Stopping', () => {
    it('should start monitoring successfully', async () => {
      const startedCallback = jest.fn()
      monitor.on('monitor.started', startedCallback)

      await monitor.start()

      expect(monitor.isActive()).toBe(true)
      expect(mockEnumerateDevices).toHaveBeenCalled()
      expect(startedCallback).toHaveBeenCalledWith({
        pollingInterval: 100,
        nativeEventsSupported: true,
      })
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      )
    })

    it('should not start monitoring if already started', async () => {
      await monitor.start()
      const initialCallCount = mockEnumerateDevices.mock.calls.length

      await monitor.start() // Second call should be ignored

      expect(mockEnumerateDevices.mock.calls.length).toBe(initialCallCount)
    })

    it('should stop monitoring', async () => {
      const stoppedCallback = jest.fn()
      monitor.on('monitor.stopped', stoppedCallback)

      await monitor.start()
      monitor.stop('test reason')

      expect(monitor.isActive()).toBe(false)
      expect(stoppedCallback).toHaveBeenCalledWith({ reason: 'test reason' })
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      )
    })

    it('should not error when stopping if not started', () => {
      expect(() => monitor.stop()).not.toThrow()
      expect(monitor.isActive()).toBe(false)
    })

    it('should handle start errors gracefully', async () => {
      mockEnumerateDevices.mockRejectedValueOnce(
        new Error('Device access denied')
      )

      await expect(monitor.start()).rejects.toThrow('Device access denied')
      expect(monitor.isActive()).toBe(false)
    })
  })

  describe('Device Change Detection', () => {
    beforeEach(async () => {
      await monitor.start()
    })

    it('should detect added devices', async () => {
      const changeCallback = jest.fn()
      const addedCallback = jest.fn()

      monitor.on('device.change', changeCallback)
      monitor.on('device.added', addedCallback)

      // Simulate device addition
      const newDevices = [...mockDevices, mockNewDevice]
      mockEnumerateDevices.mockResolvedValueOnce(newDevices)

      const changes = await monitor.checkDevices()

      expect(changes).toBeDefined()
      expect(changes!.added).toHaveLength(1)
      expect(changes!.added[0].deviceId).toBe('camera3')
      expect(changes!.removed).toHaveLength(0)
      expect(changes!.changed).toHaveLength(0)

      expect(changeCallback).toHaveBeenCalledWith(changes)
      expect(addedCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'added',
          device: mockNewDevice,
        })
      )
    })

    it('should detect removed devices', async () => {
      const changeCallback = jest.fn()
      const removedCallback = jest.fn()

      monitor.on('device.change', changeCallback)
      monitor.on('device.removed', removedCallback)

      // Simulate device removal
      const remainingDevices = mockDevices.slice(1) // Remove first device
      mockEnumerateDevices.mockResolvedValueOnce(remainingDevices)

      const changes = await monitor.checkDevices()

      expect(changes).toBeDefined()
      expect(changes!.added).toHaveLength(0)
      expect(changes!.removed).toHaveLength(1)
      expect(changes!.removed[0].deviceId).toBe('camera1')
      expect(changes!.changed).toHaveLength(0)

      expect(changeCallback).toHaveBeenCalledWith(changes)
      expect(removedCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'removed',
          device: mockDevices[0],
        })
      )
    })

    it('should detect changed devices', async () => {
      const changeCallback = jest.fn()
      const changedCallback = jest.fn()

      monitor.on('device.change', changeCallback)
      monitor.on('device.changed', changedCallback)

      // Simulate device change (label change)
      const changedDevices = mockDevices.map((device, index) =>
        index === 0 ? { ...device, label: 'Updated Camera Label' } : device
      )
      mockEnumerateDevices.mockResolvedValueOnce(changedDevices)

      const changes = await monitor.checkDevices()

      expect(changes).toBeDefined()
      expect(changes!.added).toHaveLength(0)
      expect(changes!.removed).toHaveLength(0)
      expect(changes!.changed).toHaveLength(1)
      expect(changes!.changed[0].current.label).toBe('Updated Camera Label')
      expect(changes!.changed[0].previous.label).toBe('Front Camera')

      expect(changeCallback).toHaveBeenCalledWith(changes)
      expect(changedCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'changed',
          device: expect.objectContaining({ label: 'Updated Camera Label' }),
          previousDevice: expect.objectContaining({ label: 'Front Camera' }),
        })
      )
    })

    it('should return null when no changes detected', async () => {
      // No device changes
      mockEnumerateDevices.mockResolvedValueOnce([...mockDevices])

      const changes = await monitor.checkDevices()

      expect(changes).toBeNull()
    })

    it('should handle enumeration errors gracefully', async () => {
      const errorCallback = jest.fn()
      monitor.on('monitor.error', errorCallback)

      mockEnumerateDevices.mockRejectedValueOnce(
        new Error('Enumeration failed')
      )

      const changes = await monitor.checkDevices()

      expect(changes).toBeNull()
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          timestamp: expect.any(Number),
        })
      )
    })
  })

  describe('Polling Mechanism', () => {
    it('should set up polling interval when started', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval')

      await monitor.start()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 100)

      setIntervalSpy.mockRestore()
    })

    it('should clear polling interval when stopped', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      await monitor.start()
      monitor.stop()

      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
    })
  })

  describe('Native Event Handling', () => {
    it('should set up native event listeners when supported', async () => {
      await monitor.start()

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      )
    })

    it('should handle native devicechange events with debouncing', async () => {
      await monitor.start()

      // Get the registered event handler
      const deviceChangeHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'devicechange'
      )?.[1]

      expect(deviceChangeHandler).toBeDefined()

      // Verify that setTimeout is used for debouncing
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')

      // Simulate devicechange event
      deviceChangeHandler()

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50)

      setTimeoutSpy.mockRestore()
    })

    it('should remove native event listeners when stopped', async () => {
      await monitor.start()
      monitor.stop()

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      )
    })
  })

  describe('Visibility and Focus Handling', () => {
    it('should set up visibility change listeners', async () => {
      await monitor.start()

      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
    })

    it('should set up focus change listeners', async () => {
      await monitor.start()

      expect(window.addEventListener).toHaveBeenCalledWith(
        'focus',
        expect.any(Function)
      )
      expect(window.addEventListener).toHaveBeenCalledWith(
        'blur',
        expect.any(Function)
      )
    })

    it('should check devices when page becomes visible', async () => {
      await monitor.start()

      const visibilityHandler = (
        document.addEventListener as jest.Mock
      ).mock.calls.find((call) => call[0] === 'visibilitychange')?.[1]

      expect(visibilityHandler).toBeDefined()

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')

      // Simulate visibility change
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      })
      visibilityHandler()

      // Verify that setTimeout is called for the visibility change delay
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100)

      setTimeoutSpy.mockRestore()
    })

    it('should check devices when window gains focus', async () => {
      await monitor.start()

      const focusHandler = (
        window.addEventListener as jest.Mock
      ).mock.calls.find((call) => call[0] === 'focus')?.[1]

      expect(focusHandler).toBeDefined()

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')

      // Simulate focus event
      focusHandler()

      // Verify that setTimeout is called for the focus change delay
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100)

      setTimeoutSpy.mockRestore()
    })

    it('should remove visibility and focus listeners when stopped', async () => {
      await monitor.start()
      monitor.stop()

      expect(document.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'focus',
        expect.any(Function)
      )
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'blur',
        expect.any(Function)
      )
    })
  })

  describe('Configuration Options', () => {
    it('should respect useNativeEvents option', async () => {
      const noNativeMonitor = new DeviceMonitor({
        useNativeEvents: false,
        pollingInterval: 100,
      })

      await noNativeMonitor.start()

      expect(mockAddEventListener).not.toHaveBeenCalled()

      noNativeMonitor.destroy()
    })

    it('should respect monitorOnVisibilityChange option', async () => {
      const noVisibilityMonitor = new DeviceMonitor({
        monitorOnVisibilityChange: false,
        pollingInterval: 100,
      })

      await noVisibilityMonitor.start()

      expect(document.addEventListener).not.toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )

      noVisibilityMonitor.destroy()
    })

    it('should respect monitorOnFocusChange option', async () => {
      const noFocusMonitor = new DeviceMonitor({
        monitorOnFocusChange: false,
        pollingInterval: 100,
      })

      await noFocusMonitor.start()

      expect(window.addEventListener).not.toHaveBeenCalledWith(
        'focus',
        expect.any(Function)
      )
      expect(window.addEventListener).not.toHaveBeenCalledWith(
        'blur',
        expect.any(Function)
      )

      noFocusMonitor.destroy()
    })
  })

  describe('Utility Methods', () => {
    it('should return correct monitoring status', async () => {
      expect(monitor.isActive()).toBe(false)

      await monitor.start()
      expect(monitor.isActive()).toBe(true)

      monitor.stop()
      expect(monitor.isActive()).toBe(false)
    })

    it('should return last known devices', async () => {
      await monitor.start()

      const lastKnown = monitor.getLastKnownDevices()
      expect(lastKnown).toEqual(mockDevices)
      expect(lastKnown).not.toBe(mockDevices) // Should be a copy
    })

    it('should return empty array when no devices scanned yet', () => {
      const lastKnown = monitor.getLastKnownDevices()
      expect(lastKnown).toEqual([])
    })
  })

  describe('Cleanup and Destruction', () => {
    it('should clean up resources on destroy', async () => {
      await monitor.start()

      const eventListenerCount = monitor.eventNames().length
      monitor.on('device.change', () => {})
      monitor.on('device.added', () => {})

      expect(monitor.eventNames().length).toBeGreaterThan(eventListenerCount)

      monitor.destroy()

      expect(monitor.isActive()).toBe(false)
      expect(monitor.eventNames().length).toBe(0)
      expect(monitor.getLastKnownDevices()).toEqual([])
    })

    it('should handle destroy when not started', () => {
      expect(() => monitor.destroy()).not.toThrow()
      expect(monitor.isActive()).toBe(false)
    })

    it('should clean up timers on destroy', async () => {
      await monitor.start()

      // Spy on clearInterval to verify cleanup
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      monitor.destroy()

      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should emit error events for enumeration failures', async () => {
      const errorCallback = jest.fn()
      monitor.on('monitor.error', errorCallback)

      await monitor.start()

      mockEnumerateDevices.mockRejectedValueOnce(
        new Error('Device access denied')
      )

      await monitor.checkDevices()

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Device access denied' }),
          timestamp: expect.any(Number),
        })
      )
    })

    it('should handle missing mediaDevices API gracefully', async () => {
      // Temporarily remove mediaDevices API
      const originalMediaDevices = navigator.mediaDevices
      // @ts-ignore
      delete navigator.mediaDevices

      const errorCallback = jest.fn()
      monitor.on('monitor.error', errorCallback)

      await expect(monitor.start()).rejects.toThrow()

      // Restore API
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        writable: true,
      })
    })
  })

  describe('Browser Compatibility', () => {
    it('should work without native event support', async () => {
      // Mock no native event support
      const originalAddEventListener = navigator.mediaDevices.addEventListener
      // @ts-ignore
      delete navigator.mediaDevices.addEventListener

      const compatMonitor = new DeviceMonitor({ pollingInterval: 100 })
      await compatMonitor.start()

      expect(compatMonitor.isActive()).toBe(true)

      compatMonitor.destroy()

      // Restore
      navigator.mediaDevices.addEventListener = originalAddEventListener
    })

    it('should work without visibility API support', async () => {
      // Mock no visibility API support
      const originalVisibilityState = document.visibilityState
      // @ts-ignore
      delete document.visibilityState

      const compatMonitor = new DeviceMonitor({ pollingInterval: 100 })
      await compatMonitor.start()

      expect(compatMonitor.isActive()).toBe(true)

      compatMonitor.destroy()

      // Restore
      Object.defineProperty(document, 'visibilityState', {
        value: originalVisibilityState,
        writable: true,
      })
    })
  })
})
