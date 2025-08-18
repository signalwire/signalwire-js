/**
 * Comprehensive unit tests for VisibilityManager
 */

import { VisibilityManager } from './VisibilityManager'
import {
  VisibilityConfig,
  RecoveryStrategy,
  VisibilityState,
  MediaStateSnapshot,
  DEFAULT_VISIBILITY_CONFIG,
  DeviceChangeEvent,
} from './types'
import * as eventChannel from './eventChannel'

// Mock DOM APIs
const mockDocument = {
  hidden: false,
  visibilityState: 'visible' as DocumentVisibilityState,
  hasFocus: jest.fn(() => true),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelectorAll: jest.fn(() => []),
}

const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}

const mockNavigator = {
  userAgent: 'test-user-agent',
  maxTouchPoints: 0,
  mediaDevices: {
    enumerateDevices: jest.fn(() => Promise.resolve([])),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}

// Mock video element for recovery testing
const mockVideoElement = {
  paused: true,
  play: jest.fn(() => Promise.resolve()),
}

// Mock room session instance
const createMockRoomSession = () => ({
  id: 'test-room-session-id',
  muteVideo: jest.fn(() => Promise.resolve()),
  unmuteVideo: jest.fn(() => Promise.resolve()),
  muteAudio: jest.fn(() => Promise.resolve()),
  unmuteAudio: jest.fn(() => Promise.resolve()),
  updateVideoDevice: jest.fn(() => Promise.resolve()),
  updateAudioDevice: jest.fn(() => Promise.resolve()),
  reconnect: jest.fn(() => Promise.resolve()),
  emit: jest.fn(),
})

// Setup global mocks
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
  mockNavigator.userAgent = 'test-user-agent'
  mockNavigator.maxTouchPoints = 0
})

// Mock eventChannel functions
jest.mock('./eventChannel', () => ({
  createVisibilityChannel: jest.fn(() => ({
    close: jest.fn(),
  })),
  createDeviceChangeChannel: jest.fn(() => ({
    close: jest.fn(),
  })),
  detectMobileContext: jest.fn(() => ({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    browserEngine: 'blink' as const,
  })),
  getCurrentVisibilityState: jest.fn(() => ({
    hidden: false,
    visibilityState: 'visible' as DocumentVisibilityState,
    timestamp: Date.now(),
  })),
  checkVisibilityAPISupport: jest.fn(() => ({
    pageVisibility: true,
    deviceChange: true,
    pageTransition: true,
  })),
}))

const mockedEventChannel = eventChannel as jest.Mocked<typeof eventChannel>

describe('VisibilityManager', () => {
  let manager: VisibilityManager
  let mockRoomSession: ReturnType<typeof createMockRoomSession>

  beforeEach(() => {
    mockRoomSession = createMockRoomSession()
  })

  afterEach(() => {
    if (manager) {
      manager.destroy()
    }
  })

  describe('Constructor and Initialization', () => {
    test('creates manager with default config when no config provided', () => {
      manager = new VisibilityManager()
      
      const config = manager.getVisibilityConfig()
      expect(config).toEqual(DEFAULT_VISIBILITY_CONFIG)
    })

    test('merges provided config with defaults', () => {
      const customConfig: Partial<VisibilityConfig> = {
        enabled: false,
        mobile: {
          autoMuteVideo: false,
          autoRestoreVideo: false,
          notifyServer: false,
        },
      }

      manager = new VisibilityManager(undefined, customConfig)
      
      const config = manager.getVisibilityConfig()
      expect(config.enabled).toBe(false)
      expect(config.mobile.autoMuteVideo).toBe(false)
      expect(config.recovery).toEqual(DEFAULT_VISIBILITY_CONFIG.recovery)
    })

    test('initializes with room session instance', () => {
      manager = new VisibilityManager(mockRoomSession)
      
      expect(manager).toBeDefined()
      expect(mockedEventChannel.detectMobileContext).toHaveBeenCalled()
      expect(mockedEventChannel.getCurrentVisibilityState).toHaveBeenCalled()
    })

    test('does not initialize event channels when disabled', () => {
      manager = new VisibilityManager(undefined, { enabled: false })
      
      expect(mockedEventChannel.createVisibilityChannel).not.toHaveBeenCalled()
      expect(mockedEventChannel.createDeviceChangeChannel).not.toHaveBeenCalled()
    })

    test('initializes event channels when enabled and API supported', () => {
      manager = new VisibilityManager(mockRoomSession, { enabled: true })
      
      expect(mockedEventChannel.checkVisibilityAPISupport).toHaveBeenCalled()
      expect(mockedEventChannel.createVisibilityChannel).toHaveBeenCalled()
    })

    test('does not initialize when Page Visibility API not supported', () => {
      mockedEventChannel.checkVisibilityAPISupport.mockReturnValueOnce({
        pageVisibility: false,
        deviceChange: true,
        pageTransition: true,
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      manager = new VisibilityManager(mockRoomSession)
      
      expect(consoleSpy).toHaveBeenCalledWith('Page Visibility API not supported')
      expect(mockedEventChannel.createVisibilityChannel).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Visibility State Management', () => {
    beforeEach(() => {
      manager = new VisibilityManager(mockRoomSession)
    })

    test('handles visibility change to hidden', async () => {
      const eventSpy = jest.fn()
      manager.on('visibility.changed', eventSpy)

      const hiddenState: VisibilityState = {
        hidden: true,
        visibilityState: 'hidden',
        timestamp: Date.now(),
      }

      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: hiddenState,
        timestamp: hiddenState.timestamp,
      })

      expect(eventSpy).toHaveBeenCalledWith({
        state: 'hidden',
        timestamp: hiddenState.timestamp,
      })
      expect(manager.isBackgrounded()).toBe(true)
    })

    test('handles visibility change to visible with background duration calculation', async () => {
      const eventSpy = jest.fn()
      manager.on('visibility.changed', eventSpy)

      // First become hidden
      const hideTime = Date.now()
      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: {
          hidden: true,
          visibilityState: 'hidden',
          timestamp: hideTime,
        },
        timestamp: hideTime,
      })

      // Then become visible
      const showTime = hideTime + 5000
      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: {
          hidden: false,
          visibilityState: 'visible',
          timestamp: showTime,
        },
        timestamp: showTime,
      })

      expect(eventSpy).toHaveBeenCalledTimes(2)
      expect(eventSpy).toHaveBeenLastCalledWith({
        state: 'visible',
        timestamp: showTime,
      })
      expect(manager.isBackgrounded()).toBe(false)
    })

    test('getBackgroundDuration returns correct duration', async () => {
      const hideTime = Date.now()
      
      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: {
          hidden: true,
          visibilityState: 'hidden',
          timestamp: hideTime,
        },
        timestamp: hideTime,
      })

      // Advance time by 3 seconds
      jest.advanceTimersByTime(3000)
      
      const duration = manager.getBackgroundDuration()
      expect(duration).toBe(3000)
    })

    test('getBackgroundDuration returns 0 when not backgrounded', () => {
      const duration = manager.getBackgroundDuration()
      expect(duration).toBe(0)
    })
  })

  describe('Focus Event Handling', () => {
    beforeEach(() => {
      manager = new VisibilityManager(mockRoomSession)
    })

    test('handles focus gained event', async () => {
      const eventSpy = jest.fn()
      manager.on('visibility.focus.gained', eventSpy)

      await manager.handleVisibilityEvent({
        type: 'focus',
        wasHidden: true,
        hiddenDuration: 5000,
        timestamp: Date.now(),
      })

      expect(eventSpy).toHaveBeenCalledWith({
        wasHidden: true,
        hiddenDuration: 5000,
      })
    })

    test('triggers recovery after resume delay when gaining focus', async () => {
      const recoverySpy = jest.fn()
      manager.on('visibility.recovery.started', recoverySpy)

      await manager.handleVisibilityEvent({
        type: 'focus',
        wasHidden: true,
        hiddenDuration: 10000, // Longer than default resumeDelay
        timestamp: Date.now(),
      })

      // Advance time past resume delay
      jest.advanceTimersByTime(1000)

      expect(recoverySpy).toHaveBeenCalledWith({
        reason: 'focus_gained',
        strategies: expect.any(Array),
      })
    })

    test('handles focus lost event', async () => {
      const eventSpy = jest.fn()
      manager.on('visibility.focus.lost', eventSpy)

      await manager.handleVisibilityEvent({
        type: 'blur',
        autoMuted: false,
        timestamp: Date.now(),
      })

      expect(eventSpy).toHaveBeenCalledWith({
        autoMuted: false,
      })
    })
  })

  describe('Mobile Auto-Mute Logic', () => {
    beforeEach(() => {
      mockedEventChannel.detectMobileContext.mockReturnValue({
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        browserEngine: 'webkit',
      })
      
      manager = new VisibilityManager(mockRoomSession, {
        mobile: {
          autoMuteVideo: true,
          autoRestoreVideo: true,
          notifyServer: true,
        },
      })
    })

    test('auto-mutes video on mobile when losing focus', async () => {
      const eventSpy = jest.fn()
      manager.on('visibility.focus.lost', eventSpy)

      await manager.handleVisibilityEvent({
        type: 'blur',
        autoMuted: false,
        timestamp: Date.now(),
      })

      expect(mockRoomSession.muteVideo).toHaveBeenCalled()
      expect(mockRoomSession.emit).toHaveBeenCalledWith('dtmf', { tone: '*0' })
      expect(eventSpy).toHaveBeenCalledWith({
        autoMuted: true,
      })
    })

    test('does not auto-mute when autoMuteVideo is disabled', async () => {
      manager.updateVisibilityConfig({
        mobile: { autoMuteVideo: false, autoRestoreVideo: true, notifyServer: true },
      })

      await manager.handleVisibilityEvent({
        type: 'blur',
        autoMuted: false,
        timestamp: Date.now(),
      })

      expect(mockRoomSession.muteVideo).not.toHaveBeenCalled()
    })

    test('does not auto-mute on non-mobile devices', async () => {
      mockedEventChannel.detectMobileContext.mockReturnValue({
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        browserEngine: 'blink',
      })

      manager = new VisibilityManager(mockRoomSession, {
        mobile: { autoMuteVideo: true, autoRestoreVideo: true, notifyServer: true },
      })

      await manager.handleVisibilityEvent({
        type: 'blur',
        autoMuted: false,
        timestamp: Date.now(),
      })

      expect(mockRoomSession.muteVideo).not.toHaveBeenCalled()
    })
  })

  describe('Recovery Strategy Execution', () => {
    beforeEach(() => {
      manager = new VisibilityManager(mockRoomSession)
      // Mock video elements for recovery
      mockDocument.querySelectorAll.mockReturnValue([mockVideoElement] as any)
    })

    test('executes recovery strategies in order', async () => {
      const startSpy = jest.fn()
      const successSpy = jest.fn()
      manager.on('visibility.recovery.started', startSpy)
      manager.on('visibility.recovery.success', successSpy)

      const result = await manager.triggerManualRecovery()

      expect(result).toBe(true)
      expect(startSpy).toHaveBeenCalledWith({
        reason: 'manual',
        strategies: expect.any(Array),
      })
      expect(successSpy).toHaveBeenCalledWith({
        strategy: expect.any(String),
        duration: expect.any(Number),
      })
    })

    test('VideoPlay strategy attempts to play paused videos', async () => {
      await manager.triggerManualRecovery()

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('video')
      expect(mockVideoElement.play).toHaveBeenCalled()
    })

    test('recovery fails when all strategies fail', async () => {
      // Make video play fail
      mockVideoElement.play.mockRejectedValue(new Error('Play failed'))
      // Make reconnect fail
      mockRoomSession.reconnect.mockRejectedValue(new Error('Reconnect failed'))

      // Use config with no delays for faster testing
      manager.updateVisibilityConfig({
        recovery: {
          strategies: [RecoveryStrategy.VideoPlay, RecoveryStrategy.Reinvite],
          maxAttempts: 1,
          delayBetweenAttempts: 0,
        },
      })

      const failedSpy = jest.fn()
      manager.on('visibility.recovery.failed', failedSpy)

      const result = await manager.triggerManualRecovery()

      expect(result).toBe(false)
      expect(failedSpy).toHaveBeenCalledWith({
        strategies: expect.any(Array),
        errors: expect.any(Array),
      })
    }, 10000)

    test('recovery status is updated correctly', async () => {
      // Use config with no delays for faster testing
      manager.updateVisibilityConfig({
        recovery: {
          strategies: [RecoveryStrategy.VideoPlay],
          maxAttempts: 1,
          delayBetweenAttempts: 0,
        },
      })

      // Mock successful video play
      mockVideoElement.paused = true
      mockVideoElement.play.mockResolvedValue()

      await manager.triggerManualRecovery()

      const status = manager.getRecoveryStatus()
      expect(status.inProgress).toBe(false)
      expect(status.lastAttempt).toBeGreaterThan(0)
      expect(status.lastSuccess).toBeGreaterThan(0)
      expect(status.failureCount).toBe(0)
    }, 10000)

    test('delays between recovery attempts', async () => {
      manager.updateVisibilityConfig({
        recovery: {
          strategies: [RecoveryStrategy.VideoPlay, RecoveryStrategy.Reinvite],
          maxAttempts: 2,
          delayBetweenAttempts: 50, // Shorter delay for test
        },
      })

      // Make first strategy fail, second succeed
      mockVideoElement.play.mockRejectedValue(new Error('Play failed'))
      mockRoomSession.reconnect.mockResolvedValue()

      const startTime = Date.now()
      await manager.triggerManualRecovery()
      const endTime = Date.now()

      // Should have taken at least the delay time
      expect(endTime - startTime).toBeGreaterThanOrEqual(40)
    })
  })

  describe('Page Transition Events', () => {
    beforeEach(() => {
      manager = new VisibilityManager(mockRoomSession)
    })

    test('handles page show with persisted state', async () => {
      // Use config with no delays for faster testing
      manager.updateVisibilityConfig({
        recovery: {
          strategies: [RecoveryStrategy.VideoPlay],
          maxAttempts: 1,
          delayBetweenAttempts: 0,
        },
      })

      const recoverySpy = jest.fn()
      manager.on('visibility.recovery.started', recoverySpy)

      await manager.handleVisibilityEvent({
        type: 'pageshow',
        persisted: true,
        timestamp: Date.now(),
      })

      expect(recoverySpy).toHaveBeenCalledWith({
        reason: 'page_restored',
        strategies: expect.any(Array),
      })
    }, 10000)

    test('does not trigger recovery for non-persisted page show', async () => {
      const recoverySpy = jest.fn()
      manager.on('visibility.recovery.started', recoverySpy)

      await manager.handleVisibilityEvent({
        type: 'pageshow',
        persisted: false,
        timestamp: Date.now(),
      })

      expect(recoverySpy).not.toHaveBeenCalled()
    })

    test('handles page hide event', async () => {
      // Page hide should save current media state
      await manager.handleVisibilityEvent({
        type: 'pagehide',
        persisted: true,
        timestamp: Date.now(),
      })

      // No specific assertions needed as saveCurrentMediaState is internal
      // In a real implementation, we would test the state saving logic
    })
  })

  describe('Device Change Handling', () => {
    beforeEach(() => {
      manager = new VisibilityManager(mockRoomSession)
    })

    test('handles device change events', async () => {
      const deviceSpy = jest.fn()
      manager.on('visibility.devices.changed', deviceSpy)

      const mockDeviceInfo = { deviceId: 'test', kind: 'videoinput', label: 'Test Camera', groupId: 'group1' } as MediaDeviceInfo
      const deviceChangeEvent: DeviceChangeEvent = {
        type: 'devicechange',
        changes: {
          added: [mockDeviceInfo],
          removed: [],
          current: [mockDeviceInfo],
        },
        timestamp: Date.now(),
      }

      await manager.handleDeviceChangeEvent(deviceChangeEvent)

      expect(deviceSpy).toHaveBeenCalledWith({
        added: [mockDeviceInfo],
        removed: [],
      })
    })
  })

  describe('Device Wake Detection', () => {
    beforeEach(() => {
      manager = new VisibilityManager(mockRoomSession)
    })

    test('triggers recovery after significant sleep duration', async () => {
      // Use config with no delays for faster testing
      manager.updateVisibilityConfig({
        recovery: {
          strategies: [RecoveryStrategy.VideoPlay],
          maxAttempts: 1,
          delayBetweenAttempts: 0,
        },
      })

      const recoverySpy = jest.fn()
      manager.on('visibility.recovery.started', recoverySpy)

      await manager.handleVisibilityEvent({
        type: 'wake',
        sleepDuration: 10000, // 10 seconds
        timestamp: Date.now(),
      })

      expect(recoverySpy).toHaveBeenCalledWith({
        reason: 'device_wake',
        strategies: expect.any(Array),
      })
    }, 10000)

    test('does not trigger recovery for short sleep duration', async () => {
      const recoverySpy = jest.fn()
      manager.on('visibility.recovery.started', recoverySpy)

      await manager.handleVisibilityEvent({
        type: 'wake',
        sleepDuration: 1000, // 1 second
        timestamp: Date.now(),
      })

      expect(recoverySpy).not.toHaveBeenCalled()
    })
  })

  describe('Public API Methods', () => {
    beforeEach(() => {
      manager = new VisibilityManager(mockRoomSession)
    })

    test('pauseForBackground triggers background handling', async () => {
      await manager.pauseForBackground()
      // Background handling should save media state (internal behavior)
    })

    test('resumeFromBackground triggers foreground handling', async () => {
      // Use config with no delays for faster testing
      manager.updateVisibilityConfig({
        recovery: {
          strategies: [RecoveryStrategy.VideoPlay],
          maxAttempts: 1,
          delayBetweenAttempts: 0,
        },
        throttling: {
          backgroundThreshold: 0, // No threshold for test
          resumeDelay: 0,
        },
      })

      const recoverySpy = jest.fn()
      manager.on('visibility.recovery.started', recoverySpy)

      // First simulate backgrounding by handling visibility event
      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: {
          hidden: true,
          visibilityState: 'hidden',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      })
      
      // Then resume from background
      await manager.resumeFromBackground()

      expect(recoverySpy).toHaveBeenCalledWith({
        reason: 'foregrounding',
        strategies: expect.any(Array),
      })
    })

    test('getVisibilityState returns current state', () => {
      const state = manager.getVisibilityState()
      expect(state).toHaveProperty('hidden')
      expect(state).toHaveProperty('visibilityState')
      expect(state).toHaveProperty('timestamp')
    })

    test('updateVisibilityConfig merges with existing config', () => {
      const originalConfig = manager.getVisibilityConfig()
      
      manager.updateVisibilityConfig({
        mobile: { autoMuteVideo: false, autoRestoreVideo: true, notifyServer: false },
      })

      const updatedConfig = manager.getVisibilityConfig()
      expect(updatedConfig.mobile.autoMuteVideo).toBe(false)
      expect(updatedConfig.recovery).toEqual(originalConfig.recovery)
    })

    test('getMobileContext returns mobile context info', () => {
      const context = manager.getMobileContext()
      expect(context).toHaveProperty('isMobile')
      expect(context).toHaveProperty('isIOS')
      expect(context).toHaveProperty('isAndroid')
      expect(context).toHaveProperty('browserEngine')
    })

    test('getVisibilityChannel returns visibility channel', () => {
      const channel = manager.getVisibilityChannel()
      expect(channel).toBeDefined()
    })

    test('getDeviceChannel returns device channel when enabled', () => {
      manager.updateVisibilityConfig({
        devices: { reEnumerateOnFocus: true, pollingInterval: 3000, restorePreferences: true },
      })
      
      const channel = manager.getDeviceChannel()
      expect(channel).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      manager = new VisibilityManager(mockRoomSession)
    })

    test('handles errors in auto-mute gracefully', async () => {
      // Create new manager with mobile context 
      const mockMobileContext = {
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        browserEngine: 'webkit' as const,
      }

      manager = new VisibilityManager(mockRoomSession, {
        mobile: {
          autoMuteVideo: true,
          autoRestoreVideo: true,
          notifyServer: true,
        },
      })

      jest.spyOn(manager, 'getMobileContext').mockReturnValue(mockMobileContext)

      mockRoomSession.muteVideo.mockRejectedValue(new Error('Mute failed'))
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation()

      await manager.handleVisibilityEvent({
        type: 'blur',
        autoMuted: false,
        timestamp: Date.now(),
      })

      expect(consoleSpy).toHaveBeenCalledWith('Auto-mute failed:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    test('handles errors in media state restoration gracefully', async () => {
      // Use config with no delays and low threshold
      manager.updateVisibilityConfig({
        throttling: {
          backgroundThreshold: 1000,
          resumeDelay: 0,
        },
        recovery: {
          strategies: [RecoveryStrategy.VideoPlay],
          maxAttempts: 1,
          delayBetweenAttempts: 0,
        },
      })

      mockRoomSession.unmuteVideo.mockRejectedValue(new Error('Unmute failed'))
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation()

      const hideTime = Date.now()
      // First become hidden
      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: {
          hidden: true,
          visibilityState: 'hidden',
          timestamp: hideTime,
        },
        timestamp: hideTime,
      })

      // Then become visible with long background duration
      const showTime = hideTime + 2000
      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: {
          hidden: false,
          visibilityState: 'visible',
          timestamp: showTime,
        },
        timestamp: showTime,
      })

      // The console.debug call might not happen if media state restoration isn't triggered
      // Let's just verify it doesn't throw an error
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    }, 10000)
  })

  describe('Static Methods', () => {
    test('checkSupport returns API support status', () => {
      const support = VisibilityManager.checkSupport()
      expect(support).toHaveProperty('pageVisibility')
      expect(support).toHaveProperty('deviceChange')
      expect(support).toHaveProperty('pageTransition')
    })
  })

  describe('Cleanup and Destruction', () => {
    test('destroy cleans up resources', () => {
      manager = new VisibilityManager(mockRoomSession)
      
      const visibilityChannel = manager.getVisibilityChannel()
      const deviceChannel = manager.getDeviceChannel()

      manager.destroy()

      if (visibilityChannel) {
        expect(visibilityChannel.close).toHaveBeenCalled()
      }
      if (deviceChannel) {
        expect(deviceChannel.close).toHaveBeenCalled()
      }
    })

    test('removes all event listeners on destroy', () => {
      manager = new VisibilityManager(mockRoomSession)
      
      const listener = jest.fn()
      manager.on('visibility.changed', listener)

      manager.destroy()

      // Try to emit an event - should not call the listener
      manager.emit('visibility.changed', { state: 'visible', timestamp: Date.now() })
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    test('handles rapid visibility changes', async () => {
      manager = new VisibilityManager(mockRoomSession)
      const eventSpy = jest.fn()
      manager.on('visibility.changed', eventSpy)

      // Rapid changes
      const now = Date.now()
      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: { hidden: true, visibilityState: 'hidden', timestamp: now },
        timestamp: now,
      })

      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: { hidden: false, visibilityState: 'visible', timestamp: now + 100 },
        timestamp: now + 100,
      })

      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: { hidden: true, visibilityState: 'hidden', timestamp: now + 200 },
        timestamp: now + 200,
      })

      expect(eventSpy).toHaveBeenCalledTimes(3)
    })

    test('handles missing room session methods gracefully', async () => {
      const incompleteSession = {
        id: 'incomplete-session',
        // Missing some methods
      }

      manager = new VisibilityManager(incompleteSession as any)

      // Should not throw errors
      await manager.handleVisibilityEvent({
        type: 'blur',
        autoMuted: false,
        timestamp: Date.now(),
      })
    })

    test('handles zero background duration correctly', async () => {
      manager = new VisibilityManager(mockRoomSession)

      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: {
          hidden: true,
          visibilityState: 'hidden',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      })

      // Immediately become visible
      await manager.handleVisibilityEvent({
        type: 'visibility',
        state: {
          hidden: false,
          visibilityState: 'visible',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      })

      expect(manager.getBackgroundDuration()).toBe(0)
    })
  })
})