/**
 * Comprehensive unit tests for eventChannel functions
 */

import { sagaHelpers } from '@signalwire/core'
import {
  createVisibilityChannel,
  createDeviceChangeChannel,
  createCombinedVisibilityChannel,
  detectMobileContext,
  detectDeviceChanges,
  checkVisibilityAPISupport,
  getCurrentVisibilityState,
  getCurrentFocusState,
} from './eventChannel'
import { VisibilityConfig, DEFAULT_VISIBILITY_CONFIG } from './types'

// Mock sagaHelpers.eventChannel while preserving other exports
jest.mock('@signalwire/core', () => ({
  ...jest.requireActual('@signalwire/core'),
  sagaHelpers: {
    eventChannel: jest.fn(),
  },
}))

// Mock DOM APIs
const mockDocument = {
  hidden: false,
  visibilityState: 'visible' as DocumentVisibilityState,
  hasFocus: jest.fn(() => true),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}

const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  ontouchstart: undefined as any,
}

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  maxTouchPoints: 0,
  mediaDevices: {
    enumerateDevices: jest.fn(() => Promise.resolve([])),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ondevicechange: null,
  },
  mozGetUserMedia: undefined as any,
}

// Mock global objects
beforeAll(() => {
  // @ts-ignore
  global.document = mockDocument
  // @ts-ignore
  global.window = mockWindow
  // @ts-ignore
  global.navigator = mockNavigator
  
  jest.useFakeTimers()
})

afterAll(() => {
  jest.useRealTimers()
})

beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks()
  mockDocument.hidden = false
  mockDocument.visibilityState = 'visible'
  mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  mockNavigator.maxTouchPoints = 0
  delete mockWindow.ontouchstart
  delete mockNavigator.mozGetUserMedia
  delete (mockWindow as any).webkitAudioContext
  mockNavigator.mediaDevices.ondevicechange = null
})

describe('detectMobileContext', () => {
  test('detects desktop browser correctly', () => {
    const context = detectMobileContext()
    
    expect(context).toEqual({
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      browserEngine: 'blink',
    })
  })

  test('detects iOS devices', () => {
    mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    
    const context = detectMobileContext()
    
    expect(context.isIOS).toBe(true)
    expect(context.isMobile).toBe(true)
    expect(context.isAndroid).toBe(false)
  })

  test('detects iPad devices', () => {
    mockNavigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
    
    const context = detectMobileContext()
    
    expect(context.isIOS).toBe(true)
    expect(context.isMobile).toBe(true)
  })

  test('detects Android devices', () => {
    mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G973F)'
    
    const context = detectMobileContext()
    
    expect(context.isAndroid).toBe(true)
    expect(context.isMobile).toBe(true)
    expect(context.isIOS).toBe(false)
  })

  test('detects mobile through touch support', () => {
    mockWindow.ontouchstart = {}
    
    const context = detectMobileContext()
    
    expect(context.isMobile).toBe(true)
  })

  test('detects mobile through max touch points', () => {
    mockNavigator.maxTouchPoints = 2
    
    const context = detectMobileContext()
    
    expect(context.isMobile).toBe(true)
  })

  test('detects webkit browser engine', () => {
    ;(mockWindow as any).webkitAudioContext = {}
    
    const context = detectMobileContext()
    
    expect(context.browserEngine).toBe('webkit')
  })

  test('detects gecko browser engine', () => {
    mockNavigator.mozGetUserMedia = {}
    
    const context = detectMobileContext()
    
    expect(context.browserEngine).toBe('gecko')
  })

  test('defaults to blink engine', () => {
    const context = detectMobileContext()
    
    expect(context.browserEngine).toBe('blink')
  })
})

describe('detectDeviceChanges', () => {
  const createMockDevice = (id: string, kind: string, label: string): MediaDeviceInfo => ({
    deviceId: id,
    kind: kind as any,
    label,
    groupId: 'group1',
    toJSON: () => ({}),
  })

  test('detects added devices', () => {
    const previous: MediaDeviceInfo[] = [
      createMockDevice('device1', 'videoinput', 'Camera 1'),
    ]
    
    const current: MediaDeviceInfo[] = [
      createMockDevice('device1', 'videoinput', 'Camera 1'),
      createMockDevice('device2', 'audioinput', 'Microphone 1'),
    ]

    const changes = detectDeviceChanges(previous, current)
    
    expect(changes.added).toHaveLength(1)
    expect(changes.added[0].deviceId).toBe('device2')
    expect(changes.removed).toHaveLength(0)
    expect(changes.current).toEqual(current)
  })

  test('detects removed devices', () => {
    const previous: MediaDeviceInfo[] = [
      createMockDevice('device1', 'videoinput', 'Camera 1'),
      createMockDevice('device2', 'audioinput', 'Microphone 1'),
    ]
    
    const current: MediaDeviceInfo[] = [
      createMockDevice('device1', 'videoinput', 'Camera 1'),
    ]

    const changes = detectDeviceChanges(previous, current)
    
    expect(changes.added).toHaveLength(0)
    expect(changes.removed).toHaveLength(1)
    expect(changes.removed[0].deviceId).toBe('device2')
    expect(changes.current).toEqual(current)
  })

  test('detects both added and removed devices', () => {
    const previous: MediaDeviceInfo[] = [
      createMockDevice('device1', 'videoinput', 'Camera 1'),
      createMockDevice('device2', 'audioinput', 'Microphone 1'),
    ]
    
    const current: MediaDeviceInfo[] = [
      createMockDevice('device1', 'videoinput', 'Camera 1'),
      createMockDevice('device3', 'audioinput', 'Microphone 2'),
    ]

    const changes = detectDeviceChanges(previous, current)
    
    expect(changes.added).toHaveLength(1)
    expect(changes.added[0].deviceId).toBe('device3')
    expect(changes.removed).toHaveLength(1)
    expect(changes.removed[0].deviceId).toBe('device2')
  })

  test('handles empty device lists', () => {
    const changes = detectDeviceChanges([], [])
    
    expect(changes.added).toHaveLength(0)
    expect(changes.removed).toHaveLength(0)
    expect(changes.current).toEqual([])
  })

  test('handles duplicate device IDs correctly', () => {
    const previous: MediaDeviceInfo[] = [
      createMockDevice('device1', 'videoinput', 'Camera 1'),
      createMockDevice('device1', 'videoinput', 'Camera 1'), // Duplicate
    ]
    
    const current: MediaDeviceInfo[] = [
      createMockDevice('device1', 'videoinput', 'Camera 1'),
    ]

    const changes = detectDeviceChanges(previous, current)
    
    // Should not detect changes since device1 still exists
    expect(changes.added).toHaveLength(0)
    expect(changes.removed).toHaveLength(0)
  })
})

describe('checkVisibilityAPISupport', () => {
  test('detects full API support', () => {
    mockNavigator.mediaDevices.enumerateDevices = jest.fn()
    ;(mockWindow as any).onpageshow = {}
    ;(mockWindow as any).onpagehide = {}
    
    const support = checkVisibilityAPISupport()
    
    expect(support).toEqual({
      pageVisibility: true,
      deviceChange: true,
      pageTransition: true,
    })
  })

  test('detects missing Page Visibility API', () => {
    // @ts-ignore
    delete global.document.hidden
    
    const support = checkVisibilityAPISupport()
    
    expect(support.pageVisibility).toBe(false)
  })

  test('detects missing device enumeration', () => {
    delete mockNavigator.mediaDevices.enumerateDevices
    
    const support = checkVisibilityAPISupport()
    
    expect(support.deviceChange).toBe(false)
  })

  test('detects missing page transition events', () => {
    delete (mockWindow as any).onpageshow
    
    const support = checkVisibilityAPISupport()
    
    expect(support.pageTransition).toBe(false)
  })
})

describe('getCurrentVisibilityState', () => {
  test('returns current visibility state', () => {
    mockDocument.hidden = false
    mockDocument.visibilityState = 'visible'
    
    const state = getCurrentVisibilityState()
    
    expect(state.hidden).toBe(false)
    expect(state.visibilityState).toBe('visible')
    expect(state.timestamp).toBeGreaterThan(0)
  })

  test('returns hidden state', () => {
    mockDocument.hidden = true
    mockDocument.visibilityState = 'hidden'
    
    const state = getCurrentVisibilityState()
    
    expect(state.hidden).toBe(true)
    expect(state.visibilityState).toBe('hidden')
  })
})

describe('getCurrentFocusState', () => {
  test('returns current focus state', () => {
    mockDocument.hasFocus.mockReturnValue(true)
    
    const state = getCurrentFocusState()
    
    expect(state.hasFocus).toBe(true)
    expect(state.timestamp).toBeGreaterThan(0)
  })

  test('returns unfocused state', () => {
    mockDocument.hasFocus.mockReturnValue(false)
    
    const state = getCurrentFocusState()
    
    expect(state.hasFocus).toBe(false)
  })
})

describe('createVisibilityChannel', () => {
  let channel: ReturnType<typeof createVisibilityChannel>
  let emittedEvents: any[]

  beforeEach(() => {
    emittedEvents = []
    
    // Mock eventChannel to capture emitted events
    ;(sagaHelpers.eventChannel as jest.MockedFunction<typeof sagaHelpers.eventChannel>).mockImplementation((channelFactory) => {
      const mockEmitter = (event: any) => {
        emittedEvents.push(event)
      }
      const cleanup = channelFactory(mockEmitter)
      return {
        close: cleanup,
        take: jest.fn(),
      } as any
    })
  })

  afterEach(() => {
    if (channel) {
      channel.close()
    }
  })

  test('creates channel and sets up event listeners', () => {
    channel = createVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    expect(mockDocument.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(mockWindow.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function))
    expect(mockWindow.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function))
    expect(mockWindow.addEventListener).toHaveBeenCalledWith('pageshow', expect.any(Function))
    expect(mockWindow.addEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function))
  })

  test('emits visibility change events', () => {
    channel = createVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    // Get the visibilitychange handler
    const handler = mockDocument.addEventListener.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1] as Function
    
    // Simulate visibility change
    mockDocument.hidden = true
    mockDocument.visibilityState = 'hidden'
    handler()
    
    expect(emittedEvents).toHaveLength(1)
    expect(emittedEvents[0]).toMatchObject({
      type: 'visibility',
      state: {
        hidden: true,
        visibilityState: 'hidden',
      },
    })
  })

  test('emits focus events with duration calculation', () => {
    channel = createVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    // Get the blur and focus handlers
    const blurHandler = mockWindow.addEventListener.mock.calls.find(
      call => call[0] === 'blur'
    )?.[1] as Function
    const focusHandler = mockWindow.addEventListener.mock.calls.find(
      call => call[0] === 'focus'
    )?.[1] as Function
    
    // Simulate blur then focus
    blurHandler()
    jest.advanceTimersByTime(3000)
    focusHandler()
    
    expect(emittedEvents).toHaveLength(2)
    expect(emittedEvents[0]).toMatchObject({
      type: 'blur',
      autoMuted: false,
    })
    expect(emittedEvents[1]).toMatchObject({
      type: 'focus',
      wasHidden: false,
      hiddenDuration: 3000,
    })
  })

  test('emits page transition events', () => {
    channel = createVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    // Get page show handler
    const pageShowHandler = mockWindow.addEventListener.mock.calls.find(
      call => call[0] === 'pageshow'
    )?.[1] as Function
    
    // Simulate pageshow event
    const mockEvent = { persisted: true }
    pageShowHandler(mockEvent)
    
    expect(emittedEvents).toHaveLength(1)
    expect(emittedEvents[0]).toMatchObject({
      type: 'pageshow',
      persisted: true,
    })
  })

  test('sets up wake detection interval', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval')
    
    channel = createVisibilityChannel({ enabled: true } as VisibilityConfig)
    
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000)
    
    setIntervalSpy.mockRestore()
  })

  test('detects device wake from sleep', () => {
    channel = createVisibilityChannel({ enabled: true } as VisibilityConfig)
    
    // Advance time significantly to simulate sleep
    jest.advanceTimersByTime(10000)
    
    // The wake detection should have fired
    expect(emittedEvents.some(event => event.type === 'wake')).toBe(true)
    const wakeEvent = emittedEvents.find(event => event.type === 'wake')
    expect(wakeEvent.sleepDuration).toBeGreaterThan(5000)
  })

  test('cleanup removes all event listeners', () => {
    channel = createVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    
    channel.close()
    
    expect(mockDocument.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('focus', expect.any(Function))
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('blur', expect.any(Function))
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('pageshow', expect.any(Function))
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function))
    expect(clearIntervalSpy).toHaveBeenCalled()
    
    clearIntervalSpy.mockRestore()
  })

  test('does not set up wake detection when disabled', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval')
    
    channel = createVisibilityChannel({ enabled: false } as VisibilityConfig)
    
    expect(setIntervalSpy).not.toHaveBeenCalled()
    
    setIntervalSpy.mockRestore()
  })
})

describe('createDeviceChangeChannel', () => {
  let channel: ReturnType<typeof createDeviceChangeChannel>
  let emittedEvents: any[]

  const createMockDevice = (id: string, kind: string, label: string): MediaDeviceInfo => ({
    deviceId: id,
    kind: kind as any,
    label,
    groupId: 'group1',
    toJSON: () => ({}),
  })

  beforeEach(() => {
    emittedEvents = []
    
    // Mock eventChannel to capture emitted events
    ;(sagaHelpers.eventChannel as jest.MockedFunction<typeof sagaHelpers.eventChannel>).mockImplementation((channelFactory) => {
      const mockEmitter = (event: any) => {
        emittedEvents.push(event)
      }
      const cleanup = channelFactory(mockEmitter)
      return {
        close: cleanup,
        take: jest.fn(),
      } as any
    })

    // Reset device enumeration mock
    mockNavigator.mediaDevices.enumerateDevices.mockResolvedValue([
      createMockDevice('device1', 'videoinput', 'Camera 1'),
    ])
  })

  afterEach(() => {
    if (channel) {
      channel.close()
    }
  })

  test('performs initial device enumeration', async () => {
    channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    
    // Wait for initial enumeration
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockNavigator.mediaDevices.enumerateDevices).toHaveBeenCalled()
  })

  test('uses native devicechange event when available', () => {
    mockNavigator.mediaDevices.ondevicechange = null // Indicates support
    
    channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    
    expect(mockNavigator.mediaDevices.addEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function))
  })

  test('falls back to polling when devicechange not supported', () => {
    delete (mockNavigator.mediaDevices as any).ondevicechange
    const setIntervalSpy = jest.spyOn(global, 'setInterval')
    
    channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3000)
    
    setIntervalSpy.mockRestore()
  })

  test('uses custom polling interval', () => {
    delete (mockNavigator.mediaDevices as any).ondevicechange
    const setIntervalSpy = jest.spyOn(global, 'setInterval')
    
    const config: VisibilityConfig = {
      ...DEFAULT_VISIBILITY_CONFIG,
      devices: {
        reEnumerateOnFocus: true,
        pollingInterval: 5000,
        restorePreferences: true,
      },
    }
    
    channel = createDeviceChangeChannel(config)
    
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000)
    
    setIntervalSpy.mockRestore()
  })

  test('emits device change events', async () => {
    // Start with one device
    mockNavigator.mediaDevices.enumerateDevices.mockResolvedValueOnce([
      createMockDevice('device1', 'videoinput', 'Camera 1'),
    ])
    
    channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    
    // Wait for initial enumeration
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Add a new device
    mockNavigator.mediaDevices.enumerateDevices.mockResolvedValueOnce([
      createMockDevice('device1', 'videoinput', 'Camera 1'),
      createMockDevice('device2', 'audioinput', 'Microphone 1'),
    ])
    
    // Get the devicechange handler and trigger it
    const handler = mockNavigator.mediaDevices.addEventListener.mock.calls.find(
      call => call[0] === 'devicechange'
    )?.[1] as Function
    
    if (handler) {
      await handler()
      
      expect(emittedEvents.some(event => event.type === 'devicechange')).toBe(true)
      const deviceEvent = emittedEvents.find(event => event.type === 'devicechange')
      expect(deviceEvent.changes.added).toHaveLength(1)
      expect(deviceEvent.changes.added[0].deviceId).toBe('device2')
    }
  })

  test('does not emit events when no changes detected', async () => {
    // Same device list
    mockNavigator.mediaDevices.enumerateDevices.mockResolvedValue([
      createMockDevice('device1', 'videoinput', 'Camera 1'),
    ])
    
    channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    
    // Wait for initial enumeration
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Trigger second enumeration with same devices
    const handler = mockNavigator.mediaDevices.addEventListener.mock.calls.find(
      call => call[0] === 'devicechange'
    )?.[1] as Function
    
    if (handler) {
      await handler()
      
      // Should not emit devicechange event for same devices
      expect(emittedEvents.filter(event => event.type === 'devicechange')).toHaveLength(0)
    }
  })

  test('handles enumeration errors gracefully', async () => {
    mockNavigator.mediaDevices.enumerateDevices.mockRejectedValue(new Error('Enumeration failed'))
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    
    // Wait for initial enumeration
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(consoleSpy).toHaveBeenCalledWith('Device enumeration failed:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  test('cleanup removes listeners and intervals', () => {
    mockNavigator.mediaDevices.ondevicechange = null
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    
    channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    
    channel.close()
    
    expect(mockNavigator.mediaDevices.removeEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function))
    
    clearIntervalSpy.mockRestore()
  })

  test('cleanup handles polling mode', () => {
    delete (mockNavigator.mediaDevices as any).ondevicechange
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    
    channel = createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    
    channel.close()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
    
    clearIntervalSpy.mockRestore()
  })
})

describe('createCombinedVisibilityChannel', () => {
  test('creates and manages multiple channels', () => {
    const createVisibilitySpy = jest.spyOn(require('./eventChannel'), 'createVisibilityChannel')
    const createDeviceSpy = jest.spyOn(require('./eventChannel'), 'createDeviceChangeChannel')
    
    const mockVisibilityChannel = { close: jest.fn() }
    const mockDeviceChannel = { close: jest.fn() }
    
    createVisibilitySpy.mockReturnValue(mockVisibilityChannel as any)
    createDeviceSpy.mockReturnValue(mockDeviceChannel as any)
    
    const channel = createCombinedVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    expect(createVisibilitySpy).toHaveBeenCalledWith(DEFAULT_VISIBILITY_CONFIG)
    expect(createDeviceSpy).toHaveBeenCalledWith(DEFAULT_VISIBILITY_CONFIG)
    
    // Test cleanup
    channel.close()
    
    expect(mockVisibilityChannel.close).toHaveBeenCalled()
    expect(mockDeviceChannel.close).toHaveBeenCalled()
    
    createVisibilitySpy.mockRestore()
    createDeviceSpy.mockRestore()
  })

  test('handles missing close methods gracefully', () => {
    const createVisibilitySpy = jest.spyOn(require('./eventChannel'), 'createVisibilityChannel')
    const createDeviceSpy = jest.spyOn(require('./eventChannel'), 'createDeviceChangeChannel')
    
    // Channels without close method
    createVisibilitySpy.mockReturnValue({} as any)
    createDeviceSpy.mockReturnValue({} as any)
    
    const channel = createCombinedVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    // Should not throw when calling close
    expect(() => channel.close()).not.toThrow()
    
    createVisibilitySpy.mockRestore()
    createDeviceSpy.mockRestore()
  })
})

describe('Integration with redux-saga eventChannel', () => {
  test('eventChannel is called with correct factory function', () => {
    createVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    expect(sagaHelpers.eventChannel).toHaveBeenCalledWith(expect.any(Function))
  })

  test('channel factory receives emitter function', () => {
    let capturedEmitter: any = null
    
    ;(sagaHelpers.eventChannel as jest.MockedFunction<typeof sagaHelpers.eventChannel>).mockImplementation((factory) => {
      capturedEmitter = jest.fn()
      factory(capturedEmitter)
      return { close: jest.fn() } as any
    })
    
    createVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    
    expect(capturedEmitter).toBeDefined()
    expect(typeof capturedEmitter).toBe('function')
  })
})

describe('Error Handling and Edge Cases', () => {
  test('handles missing DOM APIs gracefully', () => {
    // Mock missing APIs
    const originalWindowAdd = mockWindow.addEventListener
    const originalDocumentAdd = mockDocument.addEventListener
    
    mockWindow.addEventListener = undefined as any
    mockDocument.addEventListener = undefined as any
    
    expect(() => {
      createVisibilityChannel(DEFAULT_VISIBILITY_CONFIG)
    }).not.toThrow()
    
    // Restore
    mockWindow.addEventListener = originalWindowAdd
    mockDocument.addEventListener = originalDocumentAdd
  })

  test('handles missing mediaDevices API', () => {
    const originalMediaDevices = mockNavigator.mediaDevices
    delete mockNavigator.mediaDevices
    
    expect(() => {
      createDeviceChangeChannel(DEFAULT_VISIBILITY_CONFIG)
    }).not.toThrow()
    
    // Restore
    mockNavigator.mediaDevices = originalMediaDevices
  })

  test('handles malformed user agent strings', () => {
    mockNavigator.userAgent = ''
    
    expect(() => {
      detectMobileContext()
    }).not.toThrow()
    
    mockNavigator.userAgent = 'malformed'
    
    const context = detectMobileContext()
    expect(context.isMobile).toBe(false)
    expect(context.isIOS).toBe(false)
    expect(context.isAndroid).toBe(false)
  })

  test('handles undefined window properties', () => {
    delete mockWindow.ontouchstart
    delete (mockWindow as any).webkitAudioContext
    
    const context = detectMobileContext()
    expect(context.browserEngine).toBe('blink')
  })
})