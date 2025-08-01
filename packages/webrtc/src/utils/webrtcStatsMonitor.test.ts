/**
 * Unit tests for WebRTCStatsMonitor
 * 
 * Tests the WebRTC statistics monitoring functionality including
 * network quality assessment and performance tracking.
 */

import { WebRTCStatsMonitor } from './webrtcStatsMonitor'

// Mock RTCPeerConnection
const mockGetStats = jest.fn()
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()
const mockPeerConnection = {
  getStats: mockGetStats,
  connectionState: 'connected',
  iceConnectionState: 'connected',
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener
} as unknown as RTCPeerConnection

// Mock RTCStatsReport
const createMockStatsReport = (inboundRtp?: any, candidatePair?: any): RTCStatsReport => {
  const map = new Map()
  
  if (inboundRtp) {
    map.set('inbound-rtp-video', {
      type: 'inbound-rtp',
      kind: 'video',
      packetsReceived: inboundRtp.packetsReceived || 1000,
      bytesReceived: inboundRtp.bytesReceived || 500000,
      packetsLost: inboundRtp.packetsLost || 5,
      jitter: inboundRtp.jitter || 0.01,
      ...inboundRtp
    })
  }
  
  if (candidatePair) {
    map.set('candidate-pair', {
      type: 'candidate-pair',
      state: 'succeeded',
      currentRoundTripTime: candidatePair.currentRoundTripTime || 0.05,
      availableOutgoingBitrate: candidatePair.availableOutgoingBitrate || 1000000,
      availableIncomingBitrate: candidatePair.availableIncomingBitrate || 1000000,
      ...candidatePair
    })
  }
  
  return map as RTCStatsReport
}

describe('WebRTCStatsMonitor', () => {
  let monitor: WebRTCStatsMonitor
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStats.mockClear()
    mockAddEventListener.mockClear()
    mockRemoveEventListener.mockClear()
    monitor = new WebRTCStatsMonitor({
      enabled: true,
      pollInterval: 100,
      qualityThresholds: {
        good: { packetLoss: 1, rtt: 100, jitter: 30 },
        poor: { packetLoss: 5, rtt: 300, jitter: 100 }
      }
    })
  })
  
  afterEach(() => {
    monitor.stopMonitoring()
  })

  describe('initialization', () => {
    it('should create monitor with default config', () => {
      const defaultMonitor = new WebRTCStatsMonitor()
      expect(defaultMonitor).toBeInstanceOf(WebRTCStatsMonitor)
    })

    it('should create monitor with custom config', () => {
      const config = {
        enabled: false,
        pollInterval: 5000,
        qualityThresholds: {
          good: { packetLoss: 0.5, rtt: 50, jitter: 10 },
          poor: { packetLoss: 3, rtt: 200, jitter: 50 }
        }
      }
      const customMonitor = new WebRTCStatsMonitor(config)
      expect(customMonitor).toBeInstanceOf(WebRTCStatsMonitor)
    })
  })

  describe('monitoring lifecycle', () => {
    it('should start monitoring with peer connection', () => {
      mockGetStats.mockResolvedValue(createMockStatsReport({}, {}))
      
      monitor.startMonitoring(mockPeerConnection)
      
      expect(mockGetStats).not.toHaveBeenCalled() // Initial call happens after pollInterval
    })

    it('should stop monitoring', () => {
      monitor.startMonitoring(mockPeerConnection)
      monitor.stopMonitoring()
      
      // Should not throw and should cleanup properly
      expect(() => monitor.stopMonitoring()).not.toThrow()
    })

    it('should not start monitoring if already monitoring', () => {
      mockGetStats.mockResolvedValue(createMockStatsReport({}, {}))
      
      monitor.startMonitoring(mockPeerConnection)
      monitor.startMonitoring(mockPeerConnection) // Second call should be ignored
      
      // Should handle gracefully
      expect(monitor.isActive()).toBe(true)
    })
  })

  describe('stats collection', () => {
    it('should collect and parse stats correctly', async () => {
      const mockStats = createMockStatsReport(
        { packetsReceived: 1000, bytesReceived: 500000, packetsLost: 2, jitter: 0.015 },
        { currentRoundTripTime: 0.08, availableOutgoingBitrate: 800000 }
      )
      mockGetStats.mockResolvedValue(mockStats)

      let collectedStats: any = null
      monitor.on('stats.collected', (stats) => {
        collectedStats = stats
      })

      monitor.startMonitoring(mockPeerConnection)
      
      // Wait for stats collection
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(collectedStats).toBeTruthy()
      expect(collectedStats.packetsReceived).toBe(1000)
      expect(collectedStats.bytesReceived).toBe(500000)
      expect(collectedStats.packetsLost).toBe(2)
      expect(collectedStats.jitter).toBe(15) // Converted to milliseconds
      expect(collectedStats.roundTripTime).toBe(80) // Converted to milliseconds
    })

    it('should handle missing inbound RTP stats', async () => {
      const mockStats = createMockStatsReport(null, {})
      mockGetStats.mockResolvedValue(mockStats)

      let statsCollected = false
      monitor.on('stats.collected', () => {
        statsCollected = true
      })

      monitor.startMonitoring(mockPeerConnection)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(statsCollected).toBe(false) // Should not emit stats if no inbound RTP
    })

    it('should handle stats collection errors', async () => {
      mockGetStats.mockRejectedValue(new Error('Stats collection failed'))

      let errorEmitted = false
      monitor.on('monitoring.error', () => {
        errorEmitted = true
      })

      monitor.startMonitoring(mockPeerConnection)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Error should be handled gracefully without stopping monitoring
      expect(monitor.isActive()).toBe(true)
    })
  })

  describe('quality assessment', () => {
    it('should detect good quality', async () => {
      const mockStats = createMockStatsReport(
        { packetsReceived: 1000, packetsLost: 0, jitter: 0.005 },
        { currentRoundTripTime: 0.05 }
      )
      mockGetStats.mockResolvedValue(mockStats)

      let qualityChange: any = null
      monitor.on('quality.changed', (quality) => {
        qualityChange = quality
      })

      monitor.startMonitoring(mockPeerConnection)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(qualityChange).toBe('good')
    })

    it('should detect poor quality', async () => {
      const mockStats = createMockStatsReport(
        { packetsReceived: 1000, packetsLost: 60, jitter: 0.15 },
        { currentRoundTripTime: 0.4 }
      )
      mockGetStats.mockResolvedValue(mockStats)

      let qualityChange: any = null
      monitor.on('quality.changed', (quality) => {
        qualityChange = quality
      })

      monitor.startMonitoring(mockPeerConnection)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(qualityChange).toBe('poor')
    })

    it('should detect fair quality', async () => {
      const mockStats = createMockStatsReport(
        { packetsReceived: 1000, packetsLost: 15, jitter: 0.06 },
        { currentRoundTripTime: 0.2 }
      )
      mockGetStats.mockResolvedValue(mockStats)

      let qualityChange: any = null
      monitor.on('quality.changed', (quality) => {
        qualityChange = quality
      })

      monitor.startMonitoring(mockPeerConnection)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(qualityChange).toBe('fair')
    })
  })

  describe('issue detection', () => {
    it('should detect high packet loss', async () => {
      const mockStats = createMockStatsReport(
        { packetsReceived: 1000, packetsLost: 80 },
        {}
      )
      mockGetStats.mockResolvedValue(mockStats)

      let issueDetected: any = null
      monitor.on('network.issue', (issue) => {
        issueDetected = issue
      })

      monitor.startMonitoring(mockPeerConnection)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(issueDetected).toBeTruthy()
      expect(issueDetected.type).toBe('high_packet_loss')
    })

    it('should detect high jitter', async () => {
      const mockStats = createMockStatsReport(
        { packetsReceived: 1000, packetsLost: 1, jitter: 0.2 },
        {}
      )
      mockGetStats.mockResolvedValue(mockStats)

      let issueDetected: any = null
      monitor.on('network.issue', (issue) => {
        issueDetected = issue
      })

      monitor.startMonitoring(mockPeerConnection)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(issueDetected).toBeTruthy()
      expect(issueDetected.type).toBe('high_jitter')
    })

    it('should detect high RTT', async () => {
      const mockStats = createMockStatsReport(
        { packetsReceived: 1000, packetsLost: 1, jitter: 0.01 },
        { currentRoundTripTime: 0.6 }
      )
      mockGetStats.mockResolvedValue(mockStats)

      let issueDetected: any = null
      monitor.on('network.issue', (issue) => {
        issueDetected = issue
      })

      monitor.startMonitoring(mockPeerConnection)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(issueDetected).toBeTruthy()
      expect(issueDetected.type).toBe('high_rtt')
    })
  })

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        pollInterval: 2000,
        qualityThresholds: {
          good: { packetLoss: 0.1, rtt: 30, jitter: 5 },
          poor: { packetLoss: 2, rtt: 150, jitter: 25 }
        }
      }

      monitor.updateConfig(newConfig)
      
      // Should not throw and should accept new config
      expect(() => monitor.updateConfig(newConfig)).not.toThrow()
    })
  })

  describe('state management', () => {
    it('should report monitoring state correctly', () => {
      expect(monitor.isActive()).toBe(false)
      
      monitor.startMonitoring(mockPeerConnection)
      expect(monitor.isActive()).toBe(true)
      
      monitor.stopMonitoring()
      expect(monitor.isActive()).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      monitor.startMonitoring(mockPeerConnection)
      monitor.destroy()
      
      expect(monitor.isActive()).toBe(false)
      expect(() => monitor.destroy()).not.toThrow() // Should handle multiple destroys
    })
  })
})