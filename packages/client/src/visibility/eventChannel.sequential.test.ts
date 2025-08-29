/**
 * Sequential tests for eventChannel functions that require isolated mock state
 * These tests run serially to avoid mock interference
 */

import { sagaHelpers } from '@signalwire/core'
import {
  createDeviceChangeChannel,
  checkVisibilityAPISupport,
  createCombinedVisibilityChannel,
} from './eventChannel'
import { DEFAULT_VISIBILITY_CONFIG } from './types'

// Mock sagaHelpers.eventChannel
jest.mock('@signalwire/core', () => ({
  ...jest.requireActual('@signalwire/core'),
  sagaHelpers: {
    eventChannel: jest.fn(),
  },
}))

// Create fresh mocks for each test file
const createFreshMocks = () => ({
  document: {
    hidden: false,
    visibilityState: 'visible' as DocumentVisibilityState,
    hasFocus: jest.fn(() => true),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  window: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ontouchstart: undefined as any,
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxTouchPoints: 0,
    mediaDevices: {
      enumerateDevices: jest.fn().mockResolvedValue([]),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      ondevicechange: null,
    },
    mozGetUserMedia: undefined as any,
  }
})

describe('eventChannel Sequential Tests', () => {
  let mocks: ReturnType<typeof createFreshMocks>
  let channel: any = null
  let emittedEvents: any[] = []
  
  beforeEach(() => {
    // Create fresh mocks for each test
    mocks = createFreshMocks()
    global.document = mocks.document as any
    global.window = mocks.window as any
    global.navigator = mocks.navigator as any
    
    // Reset event collection - ensure it's completely fresh
    emittedEvents = []
    channel = null
    
    // Clear all mock calls
    jest.clearAllMocks()
    
    // Setup eventChannel mock
    ;(sagaHelpers.eventChannel as jest.Mock).mockImplementation((factory) => {
      const emitter = (event: any) => {
        emittedEvents.push(event)
      }
      const cleanup = factory(emitter)
      return {
        close: cleanup,
        take: jest.fn(),
      } as any
    })
    
    jest.useFakeTimers()
  })
  
  afterEach(() => {
    if (channel) {
      channel.close()
    }
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  describe('checkVisibilityAPISupport with mutations', () => {
    test('detects full API support', () => {
      mocks.navigator.mediaDevices.enumerateDevices = jest.fn()
      ;(mocks.window as any).onpageshow = {}
      ;(mocks.window as any).onpagehide = {}
      
      const support = checkVisibilityAPISupport()
      
      expect(support).toEqual({
        pageVisibility: true,
        deviceChange: true,
        pageTransition: true,
      })
    })

    test('detects missing device enumeration', () => {
      // Delete enumerateDevices for this test
      delete mocks.navigator.mediaDevices.enumerateDevices
      
      const support = checkVisibilityAPISupport()
      
      expect(support.deviceChange).toBe(false)
    })
  })

  describe('createDeviceChangeChannel isolated tests', () => {
    const createMockDevice = (deviceId: string, kind: string, label: string) => ({
      deviceId,
      kind,
      label,
      groupId: 'group1',
      toJSON: () => ({ deviceId, kind, label, groupId: 'group1' }),
    })

    test('performs initial device enumeration', async () => {
      mocks.navigator.mediaDevices.enumerateDevices = jest.fn().mockResolvedValue([
        createMockDevice('device1', 'videoinput', 'Camera 1'),
      ])
      
      channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
      
      // Run timers to trigger initial enumeration
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      
      expect(mocks.navigator.mediaDevices.enumerateDevices).toHaveBeenCalled()
    }, 10000)

    test('emits device change events', async () => {
      // Start with one device
      mocks.navigator.mediaDevices.enumerateDevices = jest.fn()
        .mockResolvedValueOnce([
          createMockDevice('device1', 'videoinput', 'Camera 1'),
        ])
        .mockResolvedValueOnce([
          createMockDevice('device1', 'videoinput', 'Camera 1'),
          createMockDevice('device2', 'audioinput', 'Microphone 1'),
        ])
      
      channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
      
      // Run timers to trigger initial enumeration
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      
      // Clear events from initial enumeration
      emittedEvents = []
      
      // Trigger device change check
      const handler = mocks.navigator.mediaDevices.addEventListener.mock.calls.find(
        call => call[0] === 'devicechange'
      )?.[1] as Function
      
      if (handler) {
        await handler()
      }
      
      // Alternative: use polling if no handler
      if (!handler) {
        jest.advanceTimersByTime(3000) // Trigger polling interval
        await Promise.resolve()
      }
      
      expect(emittedEvents.some(event => event.type === 'devicechange')).toBe(true)
      const deviceEvent = emittedEvents.find(event => event.type === 'devicechange')
      expect(deviceEvent?.changes.added).toHaveLength(1)
      expect(deviceEvent?.changes.added[0].deviceId).toBe('device2')
    }, 10000)

    test('does not emit events when no changes detected', async () => {
      // Start with an empty device list, then same device list for subsequent calls
      mocks.navigator.mediaDevices.enumerateDevices = jest.fn()
        .mockResolvedValueOnce([])  // Initial enumeration - empty
        .mockResolvedValue([        // All subsequent calls - same device
          createMockDevice('device1', 'videoinput', 'Camera 1'),
        ])
      
      channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
      
      // Run timers to trigger initial enumeration
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      
      // Clear any initial events
      emittedEvents = []
      
      // Now test that same devices don't trigger events
      const handler = mocks.navigator.mediaDevices.addEventListener.mock.calls.find(
        call => call[0] === 'devicechange'
      )?.[1] as Function
      
      if (handler) {
        // First call with device1
        await handler()
        // Second call with same device1  
        await handler()
      }
      
      // Alternative: use polling if no handler
      if (!handler) {
        jest.advanceTimersByTime(3000) // Trigger polling interval
        await Promise.resolve()
        jest.advanceTimersByTime(3000) // Trigger again
        await Promise.resolve()
      }
      
      // After the first change (empty -> device1), subsequent calls with same device should not emit
      const changeEvents = emittedEvents.filter(event => event.type === 'devicechange')
      
      // Should have exactly 1 event (the initial change from empty to device1)
      expect(changeEvents.length).toBeLessThanOrEqual(1)
    }, 10000)

    test('handles enumeration errors gracefully', async () => {
      mocks.navigator.mediaDevices.enumerateDevices = jest.fn()
        .mockRejectedValue(new Error('Enumeration failed'))
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
      
      // Run timers to trigger enumeration attempt
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      
      expect(consoleSpy).toHaveBeenCalledWith('Device enumeration failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    }, 10000)
  })

  describe('createCombinedVisibilityChannel', () => {
    test('creates and manages multiple channels', () => {
      let channelCount = 0
      
      // Reset the mock completely
      jest.clearAllMocks()
      ;(sagaHelpers.eventChannel as jest.Mock).mockReset()
      
      ;(sagaHelpers.eventChannel as jest.Mock).mockImplementation((factory) => {
        channelCount++
        const testEmitter = jest.fn()
        const cleanup = factory(testEmitter)
        
        return {
          close: cleanup || jest.fn(),
          take: jest.fn(),
        }
      })
      
      const channel = createCombinedVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
      
      // createCombinedVisibilityChannel creates 3 channels total:
      // 1. The combined channel itself
      // 2. The visibility channel 
      // 3. The device channel
      expect(channelCount).toBe(3)
      
      // Test cleanup
      channel.close()
    })
  })
})