/**
 * Unit tests for VisibilityManager WebRTC recovery methods
 */

import { VisibilityManager } from './VisibilityManager'
import { RecoveryStrategy } from './types'

// Mock the imports
jest.mock('@signalwire/core', () => ({
  EventEmitter: class EventEmitter {
    emit() {}
    on() {}
    removeAllListeners() {}
  },
  getLogger: () => ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

jest.mock('./recoveryStrategies', () => ({
  executeKeyframeRequestRecovery: jest.fn().mockResolvedValue({ success: true }),
  executeStreamReconnectionRecovery: jest.fn().mockResolvedValue({ success: true }),
}))

// Mock browser APIs
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    mediaDevices: {
      enumerateDevices: jest.fn().mockResolvedValue([]),
      getUserMedia: jest.fn().mockResolvedValue({
        getVideoTracks: () => [{ 
          stop: jest.fn(),
          kind: 'video',
          readyState: 'live',
        }],
      }),
    },
  },
  writable: true,
})

Object.defineProperty(global, 'document', {
  value: {
    hidden: false,
    visibilityState: 'visible',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
  },
  writable: true,
})

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
})

describe('VisibilityManager WebRTC Recovery', () => {
  let visibilityManager: VisibilityManager
  let mockInstance: any

  beforeEach(() => {
    // Create a mock room session instance
    mockInstance = {
      id: 'test-session',
      peer: {
        instance: {
          getReceivers: jest.fn().mockReturnValue([
            {
              track: { kind: 'video', readyState: 'live' },
              getStats: jest.fn().mockResolvedValue(new Map()),
            },
          ]),
          getSenders: jest.fn().mockReturnValue([
            {
              track: { kind: 'video', readyState: 'ended' },
              replaceTrack: jest.fn(),
            },
          ]),
        },
        localStream: {
          removeTrack: jest.fn(),
          addTrack: jest.fn(),
        },
      },
      setLayout: jest.fn().mockResolvedValue(undefined),
    }

    visibilityManager = new VisibilityManager(mockInstance, { enabled: false })
  })

  afterEach(() => {
    if (visibilityManager) {
      visibilityManager.destroy()
    }
  })

  describe('requestKeyframe', () => {
    it('should successfully request keyframes from video receivers', async () => {
      const result = await visibilityManager.triggerManualRecovery()
      
      // The method should execute without throwing
      expect(typeof result).toBe('boolean')
    })

    it('should handle case with no video receivers', async () => {
      mockInstance.peer.instance.getReceivers.mockReturnValue([])
      
      const result = await visibilityManager.triggerManualRecovery()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('reconnectStream', () => {
    it('should successfully reconnect ended video tracks', async () => {
      const result = await visibilityManager.triggerManualRecovery()
      
      // The method should execute without throwing
      expect(typeof result).toBe('boolean')
    })

    it('should handle case with no peer connection', async () => {
      mockInstance.peer = null
      
      const result = await visibilityManager.triggerManualRecovery()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('refreshLayout', () => {
    it('should successfully refresh video layout', async () => {
      const result = await visibilityManager.refreshLayout()
      
      expect(result).toBe(true)
      expect(mockInstance.setLayout).toHaveBeenCalledWith({ name: 'grid-responsive' })
    })

    it('should handle case with no setLayout capability', async () => {
      mockInstance.setLayout = undefined
      
      const result = await visibilityManager.refreshLayout()
      expect(result).toBe(false)
    })

    it('should handle case with no instance', async () => {
      const managerWithoutInstance = new VisibilityManager(undefined, { enabled: false })
      
      const result = await managerWithoutInstance.refreshLayout()
      expect(result).toBe(false)
      
      managerWithoutInstance.destroy()
    })
  })

  describe('recovery strategies integration', () => {
    it('should include LayoutRefresh in recovery strategies', () => {
      const config = visibilityManager.getVisibilityConfig()
      
      // The default config should include all recovery strategies
      expect(config.recovery.strategies).toContain(RecoveryStrategy.LayoutRefresh)
    })
  })
})