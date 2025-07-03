import { RTCPeerConnectionManager } from '../RTCPeerConnectionManager'

// Mock the primitives module
jest.mock('../utils/primitives', () => ({
  RTCPeerConnection: jest.fn(() => {
    const pc = {
      addTrack: jest.fn().mockReturnValue({}),
      removeTrack: jest.fn(),
      createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      setLocalDescription: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      restartIce: jest.fn(),
      connectionState: 'new' as RTCPeerConnectionState,
      signalingState: 'stable' as RTCSignalingState,
      iceConnectionState: 'new' as RTCIceConnectionState,
      iceGatheringState: 'new' as RTCIceGatheringState,
      getSenders: jest.fn().mockReturnValue([]),
    }
    
    // Simulate ICE gathering completion after a delay
    setTimeout(() => {
      pc.iceGatheringState = 'complete' as RTCIceGatheringState
      const listeners = (pc.addEventListener as jest.Mock).mock.calls
        .filter(([event]: [string]) => event === 'icegatheringstatechange')
        .map(([, handler]: [string, Function]) => handler)
      
      listeners.forEach((handler: Function) => handler())
    }, 100)
    
    return pc
  }),
}))

// Mock the mockTracks module
jest.mock('../utils/mockTracks', () => ({
  createMockAudioTrack: jest.fn(() => ({
    stop: jest.fn(),
    kind: 'audio',
    readyState: 'live',
  })),
  createMockVideoTrack: jest.fn(() => ({
    stop: jest.fn(),
    kind: 'video',
    readyState: 'live',
  })),
  cleanupMockAudioTrack: jest.fn(),
  cleanupMockVideoTrack: jest.fn(),
}))

// Mock logger
jest.mock('@signalwire/core', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

describe('RTCPeerConnectionManager', () => {
  let manager: RTCPeerConnectionManager
  const mockConfig: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.example.com' }],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    if (manager) {
      manager.cleanup()
    }
    jest.useRealTimers()
  })

  describe('initializePool', () => {
    it('should create the specified number of connections', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 2)
      
      const initPromise = manager.initializePool()
      
      // Fast-forward timers to complete ICE gathering
      jest.advanceTimersByTime(150)
      
      await initPromise
      
      // Check that 2 connections were created
      const { RTCPeerConnection } = require('../utils/primitives')
      expect(RTCPeerConnection).toHaveBeenCalledTimes(2)
    })

    it('should set iceCandidatePoolSize in config', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 1)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      const { RTCPeerConnection } = require('../utils/primitives')
      expect(RTCPeerConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          iceCandidatePoolSize: 10,
        })
      )
    })

    it('should start maintenance worker for TURN refresh', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 1)
      
      const setIntervalSpy = jest.spyOn(global, 'setInterval')
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        240000 // 4 minutes
      )
    })
  })

  describe('getConnection', () => {
    it('should return a pre-warmed connection from the pool', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 2)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      const connection = manager.getConnection()
      
      expect(connection).toBeDefined()
      expect(connection).toHaveProperty('addTrack')
      expect(connection).toHaveProperty('createOffer')
    })

    it('should clean up mock tracks before returning connection', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 1)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      const { cleanupMockAudioTrack, cleanupMockVideoTrack } = require('../utils/mockTracks')
      
      manager.getConnection()
      
      expect(cleanupMockAudioTrack).toHaveBeenCalled()
      expect(cleanupMockVideoTrack).toHaveBeenCalled()
    })

    it('should remove event listeners before returning connection', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 1)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      const connection = manager.getConnection()
      
      // Check that event listeners were nullified
      const eventProps = [
        'onicecandidate',
        'onicegatheringstatechange',
        'oniceconnectionstatechange',
        'onconnectionstatechange',
        'onsignalingstatechange',
        'onnegotiationneeded',
        'ontrack',
        'ondatachannel',
      ]
      
      eventProps.forEach(prop => {
        expect((connection as any)[prop]).toBeNull()
      })
    })

    it('should return null when pool is empty', () => {
      manager = new RTCPeerConnectionManager(mockConfig, 0)
      
      const connection = manager.getConnection()
      
      expect(connection).toBeNull()
    })

    it('should replenish pool after providing connection', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 1)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      const { RTCPeerConnection } = require('../utils/primitives')
      const initialCallCount = RTCPeerConnection.mock.calls.length
      
      // Get connection from pool
      manager.getConnection()
      
      // Fast-forward to allow replenishment
      jest.advanceTimersByTime(150)
      
      // Check that a new connection was created
      expect(RTCPeerConnection).toHaveBeenCalledTimes(initialCallCount + 1)
    })
  })

  describe('cleanup', () => {
    it('should close all connections and clear the pool', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 2)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      
      manager.cleanup()
      
      // Check that interval was cleared
      expect(clearIntervalSpy).toHaveBeenCalled()
      
      // Get a connection should return null after cleanup
      const connection = manager.getConnection()
      expect(connection).toBeNull()
    })
  })

  describe('connection validation', () => {
    it('should not return connections in failed state', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 1)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      // Mock the connection to be in failed state
      const { RTCPeerConnection } = require('../utils/primitives')
      const mockPc = RTCPeerConnection.mock.results[0].value
      mockPc.connectionState = 'failed'
      
      const connection = manager.getConnection()
      
      expect(connection).toBeNull()
    })

    it('should not return connections with non-stable signaling state', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 1)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      // Mock the connection to be in closed state
      const { RTCPeerConnection } = require('../utils/primitives')
      const mockPc = RTCPeerConnection.mock.results[0].value
      mockPc.signalingState = 'closed'
      
      const connection = manager.getConnection()
      
      expect(connection).toBeNull()
    })
  })

  describe('TURN refresh', () => {
    it('should setup refresh timer that refreshes connections every 4 minutes', async () => {
      manager = new RTCPeerConnectionManager(mockConfig, 1)
      
      const initPromise = manager.initializePool()
      jest.advanceTimersByTime(150)
      await initPromise
      
      const { RTCPeerConnection } = require('../utils/primitives')
      const mockPc = RTCPeerConnection.mock.results[0].value
      
      // Manually set lastRefreshed to be older than 4 minutes
      // This simulates a connection that needs refresh
      const pool = (manager as any).pool
      const conn = pool.values().next().value
      if (conn) {
        conn.lastRefreshed = Date.now() - 250000 // 4.17 minutes ago
      }
      
      // Fast-forward to trigger the interval callback
      jest.advanceTimersByTime(240000)
      
      // Let async refresh operations complete
      await Promise.resolve()
      jest.advanceTimersByTime(150)
      
      // Check that restartIce was called
      expect(mockPc.restartIce).toHaveBeenCalled()
      expect(mockPc.createOffer).toHaveBeenCalledWith({ iceRestart: true })
      expect(mockPc.setLocalDescription).toHaveBeenCalled()
    })
  })
})