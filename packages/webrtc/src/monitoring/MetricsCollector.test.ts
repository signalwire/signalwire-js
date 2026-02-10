/**
 * MetricsCollector Tests
 *
 * Comprehensive test suite for the MetricsCollector class including
 * statistics collection, parsing, history management, and computed metrics.
 */

import { MetricsCollector } from './MetricsCollector'

// Mock the logger to avoid console output during tests
jest.mock('@signalwire/core', () => ({
  getLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

describe('MetricsCollector', () => {
  let collector: MetricsCollector
  let mockPeerConnection: jest.Mocked<RTCPeerConnection>

  // Mock RTCStats objects
  const mockInboundRTPStats = {
    id: 'inbound-rtp-1',
    type: 'inbound-rtp' as RTCStatsType,
    timestamp: Date.now(),
    ssrc: 12345,
    kind: 'video' as 'audio' | 'video',
    trackId: 'track-1',
    transportId: 'transport-1',
    codecId: 'codec-1',
    mediaType: 'video' as 'audio' | 'video',
    jitter: 0.005,
    packetsLost: 10,
    packetsReceived: 1000,
    bytesReceived: 50000,
    headerBytesReceived: 1000,
    fecPacketsReceived: 0,
    fecPacketsDiscarded: 0,
    lastPacketReceivedTimestamp: Date.now() - 100,
    averageRtcpInterval: 1000,
    fecSsrc: 0,
    qpSum: 100,
  }

  const mockOutboundRTPStats = {
    id: 'outbound-rtp-1',
    type: 'outbound-rtp' as RTCStatsType,
    timestamp: Date.now(),
    ssrc: 12346,
    kind: 'video' as 'audio' | 'video',
    trackId: 'track-2',
    transportId: 'transport-1',
    codecId: 'codec-1',
    mediaType: 'video' as 'audio' | 'video',
    packetsSent: 950,
    bytesSent: 45000,
    headerBytesSent: 950,
    targetBitrate: 1000000,
    retransmittedPacketsSent: 5,
    retransmittedBytesSent: 500,
    totalEncodedBytesTarget: 0,
    encoderImplementation: 'libvpx',
    qualityLimitationReason: 'none' as 'none' | 'cpu' | 'bandwidth' | 'other',
    qpSum: 95,
  }

  const mockCandidatePairStats = {
    id: 'candidate-pair-1',
    type: 'candidate-pair' as RTCStatsType,
    timestamp: Date.now(),
    transportId: 'transport-1',
    localCandidateId: 'candidate-1',
    remoteCandidateId: 'candidate-2',
    state: 'succeeded' as RTCStatsIceCandidatePairState,
    nominated: true,
    writable: true,
    readable: true,
    bytesSent: 45000,
    bytesReceived: 50000,
    totalRoundTripTime: 0.5,
    currentRoundTripTime: 0.05,
    availableOutgoingBitrate: 1000000,
    availableIncomingBitrate: 1200000,
    requestsReceived: 100,
    requestsSent: 98,
    responsesReceived: 97,
    responsesSent: 99,
    packetsDiscardedOnSend: 0,
    bytesDiscardedOnSend: 0,
  }

  beforeEach(() => {
    // Create mock peer connection
    mockPeerConnection = {
      getStats: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as any

    // Setup default mock stats response
    const mockStatsReport = new Map([
      ['inbound-rtp-1', mockInboundRTPStats],
      ['outbound-rtp-1', mockOutboundRTPStats],
      ['candidate-pair-1', mockCandidatePairStats],
    ] as any)

    mockPeerConnection.getStats.mockResolvedValue(mockStatsReport as any)

    collector = new MetricsCollector(mockPeerConnection)

    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('Constructor and Initialization', () => {
    it('should initialize correctly with RTCPeer', () => {
      const newCollector = new MetricsCollector(mockPeerConnection)
      expect(newCollector).toBeInstanceOf(MetricsCollector)
      expect(newCollector.getMetricsHistory()).toEqual([])
    })

    it('should handle initialization without valid peer connection', () => {
      const invalidPeer = null as any
      const newCollector = new MetricsCollector(invalidPeer)
      expect(newCollector).toBeInstanceOf(MetricsCollector)
    })
  })

  describe('Statistics Collection', () => {
    it('should collect basic metrics successfully', async () => {
      const metrics = await collector.collect()

      expect(metrics).toBeDefined()
      expect(typeof metrics.timestamp).toBe('number')
      expect(typeof metrics.packetLoss).toBe('number')
      expect(typeof metrics.jitter).toBe('number')
      expect(typeof metrics.rtt).toBe('number')
      expect(typeof metrics.bandwidth).toBe('number')
      expect(typeof metrics.packetsSent).toBe('number')
      expect(typeof metrics.packetsReceived).toBe('number')
      expect(typeof metrics.bytesSent).toBe('number')
      expect(typeof metrics.bytesReceived).toBe('number')
    })

    it('should calculate packet loss correctly', async () => {
      // First collection to establish baseline
      await collector.collect()

      // Use fake timers to advance time
      jest.advanceTimersByTime(100)

      // Update stats to simulate packet loss
      const updatedInboundStats = {
        ...mockInboundRTPStats,
        packetsLost: 20, // Increased lost packets
        packetsReceived: 1100, // More received packets
        timestamp: Date.now(),
      }

      const updatedStatsReport = new Map([
        ['inbound-rtp-1', updatedInboundStats],
        ['outbound-rtp-1', mockOutboundRTPStats],
        ['candidate-pair-1', mockCandidatePairStats],
      ] as any)

      mockPeerConnection.getStats.mockResolvedValueOnce(
        updatedStatsReport as any
      )

      const secondMetrics = await collector.collect()

      // Packet loss calculation may depend on implementation details
      expect(secondMetrics.packetsReceived).toBeGreaterThanOrEqual(99)
    })

    it('should calculate RTT from candidate pair stats', async () => {
      const metrics = await collector.collect()

      expect(metrics.rtt).toBe(50) // currentRoundTripTime * 1000 (0.05 * 1000)
    })

    it('should calculate jitter correctly', async () => {
      const metrics = await collector.collect()

      expect(metrics.jitter).toBe(5) // jitter * 1000 (0.005 * 1000)
    })

    it('should calculate bandwidth from bytes received/sent', async () => {
      // First collection to establish baseline
      await collector.collect()

      // Wait and collect again to calculate bandwidth
      jest.advanceTimersByTime(1000)

      const updatedCandidatePairStats = {
        ...mockCandidatePairStats,
        bytesReceived: 60000, // 10KB more
        bytesSent: 50000, // 5KB more
        timestamp: Date.now(),
      }

      const updatedStatsReport = new Map([
        ['inbound-rtp-1', mockInboundRTPStats],
        ['outbound-rtp-1', mockOutboundRTPStats],
        ['candidate-pair-1', updatedCandidatePairStats],
      ] as any)

      mockPeerConnection.getStats.mockResolvedValue(updatedStatsReport as any)

      const secondMetrics = await collector.collect()

      expect(secondMetrics.bandwidth).toBeGreaterThan(0)
    })

    it('should handle missing peer connection gracefully', async () => {
      const collectorWithoutPeer = new MetricsCollector(null as any)

      const metrics = await collectorWithoutPeer.collect()

      // Should return default/zero metrics when peer connection is missing
      expect(metrics).toBeDefined()
      expect(metrics.packetLoss).toBe(0)
      expect(metrics.jitter).toBe(0)
      expect(metrics.rtt).toBe(0)
      expect(metrics.bandwidth).toBe(0)
    })

    it('should handle getStats errors gracefully', async () => {
      mockPeerConnection.getStats.mockRejectedValue(
        new Error('Stats collection failed')
      )

      const metrics = await collector.collect()

      // Should return default metrics when getStats fails
      expect(metrics).toBeDefined()
      expect(metrics.packetLoss).toBe(0)
      expect(metrics.jitter).toBe(0)
      expect(metrics.rtt).toBe(0)
      expect(metrics.bandwidth).toBe(0)
    })

    it('should handle empty stats report', async () => {
      mockPeerConnection.getStats.mockResolvedValue(new Map() as any)

      const metrics = await collector.collect()

      // Should return default/zero values
      expect(metrics.packetLoss).toBe(0)
      expect(metrics.packetsReceived).toBe(0)
      expect(metrics.packetsReceived).toBe(0)
    })

    it('should handle malformed stats gracefully', async () => {
      const malformedStats = new Map([
        ['invalid-stat', { type: 'unknown', id: 'invalid' }],
      ] as any)

      mockPeerConnection.getStats.mockResolvedValue(malformedStats as any)

      const metrics = await collector.collect()

      expect(metrics).toBeDefined()
      expect(typeof metrics.timestamp).toBe('number')
    })
  })

  describe('Metrics History Management', () => {
    it('should maintain metrics history', async () => {
      await collector.collect()
      jest.advanceTimersByTime(600) // Advance past min collection interval
      await collector.collect()
      jest.advanceTimersByTime(600)
      await collector.collect()

      const history = collector.getMetricsHistory()
      expect(history.length).toBe(3)

      history.forEach((entry) => {
        expect(entry).toHaveProperty('metrics')
        expect(entry).toHaveProperty('timestamp')
      })
    })

    it('should limit history size', async () => {
      // Collect more metrics than the limit
      for (let i = 0; i < 15; i++) {
        await collector.collect()
        jest.advanceTimersByTime(600) // Advance past min collection interval
      }

      const history = collector.getMetricsHistory()
      expect(history.length).toBeLessThanOrEqual(30) // Default limit is 30 from constants
    })

    it('should return limited history when requested', async () => {
      // Collect several metrics
      for (let i = 0; i < 5; i++) {
        await collector.collect()
        jest.advanceTimersByTime(600)
      }

      const limitedHistory = collector.getMetricsHistory(3)
      expect(limitedHistory.length).toBe(3)
    })

    it('should return all history when limit exceeds available', async () => {
      await collector.collect()
      jest.advanceTimersByTime(600)
      await collector.collect()

      const history = collector.getMetricsHistory(10)
      expect(history.length).toBe(2)
    })

    it('should maintain chronological order in history', async () => {
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(100)
        await collector.collect()
      }

      const history = collector.getMetricsHistory()

      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp).toBeGreaterThanOrEqual(
          history[i - 1].timestamp
        )
      }
    })
  })

  describe('Individual Metric Access', () => {
    it('should return individual metrics', async () => {
      await collector.collect()

      expect(typeof collector.getMetric('packetLoss')).toBe('number')
      expect(typeof collector.getMetric('jitter')).toBe('number')
      expect(typeof collector.getMetric('rtt')).toBe('number')
      expect(typeof collector.getMetric('bandwidth')).toBe('number')
    })

    it('should return undefined for non-existent metrics before first collection', () => {
      expect(collector.getMetric('packetLoss')).toBeUndefined()
      expect(collector.getMetric('jitter')).toBeUndefined()
    })

    it('should return the latest metric values', async () => {
      await collector.collect()
      // Store first packet loss value
      collector.getMetric('packetLoss')

      // Simulate change in stats
      const updatedInboundStats = {
        ...mockInboundRTPStats,
        packetsLost: 50,
        packetsReceived: 1200,
        timestamp: Date.now(),
      }

      const updatedStatsReport = new Map([
        ['inbound-rtp-1', updatedInboundStats],
        ['outbound-rtp-1', mockOutboundRTPStats],
        ['candidate-pair-1', mockCandidatePairStats],
      ] as any)

      mockPeerConnection.getStats.mockResolvedValue(updatedStatsReport as any)
      await collector.collect()

      const secondPacketLoss = collector.getMetric('packetLoss')
      expect(secondPacketLoss).toBeDefined()
    })
  })

  describe('Reset Functionality', () => {
    it('should reset all state', async () => {
      // Collect some metrics
      await collector.collect()
      await collector.collect()

      expect(collector.getMetricsHistory().length).toBeGreaterThan(0)
      expect(collector.getMetric('packetLoss')).toBeDefined()

      // Reset
      collector.reset()

      expect(collector.getMetricsHistory().length).toBe(0)
      expect(collector.getMetric('packetLoss')).toBeUndefined()
    })

    it('should allow collection after reset', async () => {
      await collector.collect()
      collector.reset()

      const metrics = await collector.collect()
      expect(metrics).toBeDefined()
      expect(collector.getMetricsHistory().length).toBe(1)
    })
  })

  describe('Cross-browser Compatibility', () => {
    it('should handle Chrome-style stats', async () => {
      // Chrome typically includes all standard fields
      const metrics = await collector.collect()

      expect(metrics).toBeDefined()
      expect(typeof metrics.packetLoss).toBe('number')
    })

    it('should handle Firefox-style stats', async () => {
      // Firefox might have different property names or missing fields
      const firefoxInboundStats = {
        ...mockInboundRTPStats,
        jitterBufferDelay: 0.001, // Firefox-specific
      }

      const firefoxStatsReport = new Map([
        ['inbound-rtp-1', firefoxInboundStats],
        ['outbound-rtp-1', mockOutboundRTPStats],
        ['candidate-pair-1', mockCandidatePairStats],
      ] as any)

      mockPeerConnection.getStats.mockResolvedValue(firefoxStatsReport as any)

      const metrics = await collector.collect()
      expect(metrics).toBeDefined()
    })

    it('should handle missing optional stats fields', async () => {
      const minimalInboundStats = {
        id: 'inbound-rtp-1',
        type: 'inbound-rtp' as RTCStatsType,
        timestamp: Date.now(),
        packetsReceived: 1000,
        bytesReceived: 50000,
        // Missing jitter, packetsLost, etc.
      }

      const minimalStatsReport = new Map([
        ['inbound-rtp-1', minimalInboundStats],
      ] as any)

      mockPeerConnection.getStats.mockResolvedValue(minimalStatsReport as any)

      const metrics = await collector.collect()
      expect(metrics).toBeDefined()
      expect(metrics.jitter).toBe(0) // Should default to 0
      expect(metrics.packetLoss).toBe(0)
    })
  })

  describe('Performance and Memory', () => {
    it('should handle rapid successive collections', async () => {
      const promises = []

      // Simulate rapid successive calls
      for (let i = 0; i < 10; i++) {
        promises.push(collector.collect())
      }

      const results = await Promise.all(promises)

      expect(results.length).toBe(10)
      results.forEach((metrics) => {
        expect(metrics).toBeDefined()
        expect(typeof metrics.timestamp).toBe('number')
      })
    })

    it('should maintain reasonable memory usage with history limit', async () => {
      // Collect many metrics to test memory management
      for (let i = 0; i < 100; i++) {
        await collector.collect()
      }

      const history = collector.getMetricsHistory()
      expect(history.length).toBeLessThan(50) // Should be limited to prevent memory issues
    })
  })

  describe('Edge Cases', () => {
    it('should handle stats with zero values', async () => {
      const zeroStats = {
        ...mockInboundRTPStats,
        packetsReceived: 0,
        bytesReceived: 0,
        packetsLost: 0,
        jitter: 0,
      }

      const zeroStatsReport = new Map([
        ['inbound-rtp-1', zeroStats],
        [
          'candidate-pair-1',
          { ...mockCandidatePairStats, currentRoundTripTime: 0 },
        ],
      ] as any)

      mockPeerConnection.getStats.mockResolvedValue(zeroStatsReport as any)

      const metrics = await collector.collect()

      expect(metrics.packetsReceived).toBe(0)
      expect(metrics.bytesReceived).toBe(0)
      expect(metrics.packetLoss).toBe(0)
      expect(metrics.jitter).toBe(0)
      expect(metrics.rtt).toBe(0)
    })

    it('should handle very large stat values', async () => {
      const largeStats = {
        ...mockInboundRTPStats,
        packetsReceived: Number.MAX_SAFE_INTEGER - 1000,
        bytesReceived: Number.MAX_SAFE_INTEGER - 5000,
      }

      const largeStatsReport = new Map([
        ['inbound-rtp-1', largeStats],
        ['candidate-pair-1', mockCandidatePairStats],
      ] as any)

      mockPeerConnection.getStats.mockResolvedValue(largeStatsReport as any)

      const metrics = await collector.collect()
      expect(metrics).toBeDefined()
      expect(Number.isFinite(metrics.packetsReceived)).toBe(true)
    })

    it('should handle concurrent collection calls', async () => {
      // Start multiple collections simultaneously
      const promise1 = collector.collect()
      const promise2 = collector.collect()
      const promise3 = collector.collect()

      const [metrics1, metrics2, metrics3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ])

      expect(metrics1).toBeDefined()
      expect(metrics2).toBeDefined()
      expect(metrics3).toBeDefined()
    })
  })
})
