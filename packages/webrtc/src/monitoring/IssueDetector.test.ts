/**
 * IssueDetector Tests
 *
 * Comprehensive test suite for the IssueDetector class including
 * detection algorithms, threshold validation, baseline integration,
 * and issue tracking functionality.
 */

import { IssueDetector } from './IssueDetector'
import {
  NetworkIssueType,
  StatsMetrics,
  MonitoringThresholds,
  Baseline,
  ConnectionStats,
} from './interfaces'

// Mock the logger to avoid console output during tests
jest.mock('@signalwire/core', () => ({
  getLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

describe('IssueDetector', () => {
  let detector: IssueDetector
  let mockMetrics: StatsMetrics
  let mockThresholds: MonitoringThresholds
  let mockBaseline: Baseline

  beforeEach(() => {
    detector = new IssueDetector()

    mockMetrics = {
      packetLoss: 0.01,
      jitter: 5,
      rtt: 50,
      bandwidth: 1000,
      packetsSent: 100,
      packetsReceived: 99,
      bytesSent: 10000,
      bytesReceived: 9900,
      timestamp: Date.now(),
    }

    mockThresholds = {
      packetLoss: 0.05,
      jitter: 50,
      rtt: 300,
      minBandwidth: 100,
    }

    mockBaseline = {
      packetLoss: 0.005,
      packetLossStdDev: 0.002,
      jitter: 3,
      jitterStdDev: 1,
      rtt: 30,
      rttStdDev: 5,
      bandwidth: 1200,
      bandwidthStdDev: 100,
      sampleCount: 50,
      confidence: 0.9,
      timestamp: Date.now() - 60000,
    }

    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const newDetector = new IssueDetector()
      const expectedThresholds = {
        packetLoss: 0.05, // DEFAULT_THRESHOLDS.PACKET_LOSS_THRESHOLD
        jitter: 50,
        rtt: 300,
        minBandwidth: 100,
      }
      expect(newDetector.getThresholds()).toEqual(expectedThresholds)
      expect(newDetector.getActiveIssues()).toEqual([])
    })

    it('should initialize with custom configuration', () => {
      const config = {
        enableBaselineDetection: false,
        trackHistory: false,
        maxHistorySize: 10,
        resolvedThresholdMs: 5000,
      }

      const newDetector = new IssueDetector({}, config)
      expect(newDetector.getActiveIssues()).toEqual([])
    })

    it('should update thresholds correctly', () => {
      const newThresholds: MonitoringThresholds = {
        ...mockThresholds,
        packetLoss: 0.1,
        rtt: 200,
      }

      detector.updateThresholds(newThresholds)
      expect(detector.getThresholds()).toEqual(newThresholds)
    })

    it('should set baseline correctly', () => {
      detector.setBaseline(mockBaseline)

      // Baseline should affect issue detection
      const issues = detector.detectIssues(mockMetrics, mockBaseline)
      expect(Array.isArray(issues)).toBe(true)
    })
  })

  describe('Issue Detection Algorithms', () => {
    describe('Packet Loss Detection', () => {
      it('should detect high packet loss', () => {
        const highLossMetrics = {
          ...mockMetrics,
          packetLoss: 0.1, // 10% packet loss
        }

        const issues = detector.detect(highLossMetrics, mockThresholds)
        const packetLossIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_PACKET_LOSS
        )

        expect(packetLossIssue).toBeDefined()
        expect(packetLossIssue?.severity).toBeGreaterThan(0)
        expect(packetLossIssue?.value).toBe(0.1)
        expect(packetLossIssue?.threshold).toBe(0.05)
      })

      it('should not detect packet loss below threshold', () => {
        const lowLossMetrics = {
          ...mockMetrics,
          packetLoss: 0.005, // 0.5% packet loss
        }

        const issues = detector.detect(lowLossMetrics, mockThresholds)
        const packetLossIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_PACKET_LOSS
        )

        expect(packetLossIssue).toBeUndefined()
      })

      it('should handle zero packet loss', () => {
        const zeroLossMetrics = {
          ...mockMetrics,
          packetLoss: 0,
        }

        const issues = detector.detect(zeroLossMetrics, mockThresholds)
        const packetLossIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_PACKET_LOSS
        )

        expect(packetLossIssue).toBeUndefined()
      })
    })

    describe('RTT Spike Detection', () => {
      it('should detect high RTT', () => {
        const highRttMetrics = {
          ...mockMetrics,
          rtt: 500, // High RTT
        }

        const issues = detector.detect(highRttMetrics, mockThresholds)
        const rttIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_LATENCY
        )

        expect(rttIssue).toBeDefined()
        expect(rttIssue?.severity).toBeGreaterThan(0)
        expect(rttIssue?.value).toBe(500)
      })

      it('should detect RTT spike relative to baseline', () => {
        detector.setBaseline(mockBaseline)

        const spikeMetrics = {
          ...mockMetrics,
          rtt: 120, // 4x baseline RTT (30ms)
        }

        const issues = detector.detectIssues(spikeMetrics, mockBaseline)
        const rttIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_LATENCY
        )

        expect(rttIssue).toBeDefined()
        expect(rttIssue?.description).toContain('spike')
      })

      it('should not detect normal RTT', () => {
        const normalRttMetrics = {
          ...mockMetrics,
          rtt: 30, // Normal RTT
        }

        const issues = detector.detect(normalRttMetrics, mockThresholds)
        const rttIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_LATENCY
        )

        expect(rttIssue).toBeUndefined()
      })
    })

    describe('Jitter Detection', () => {
      it('should detect high jitter', () => {
        const highJitterMetrics = {
          ...mockMetrics,
          jitter: 100, // High jitter
        }

        const issues = detector.detect(highJitterMetrics, mockThresholds)
        const jitterIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_JITTER
        )

        expect(jitterIssue).toBeDefined()
        expect(jitterIssue?.severity).toBeGreaterThan(0)
        expect(jitterIssue?.value).toBe(100)
      })

      it('should detect jitter spike relative to baseline', () => {
        detector.setBaseline(mockBaseline)

        const spikeMetrics = {
          ...mockMetrics,
          jitter: 15, // 5x baseline jitter (3ms)
        }

        const issues = detector.detectIssues(spikeMetrics, mockBaseline)
        const jitterIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_JITTER
        )

        expect(jitterIssue).toBeDefined()
      })

      it('should not detect normal jitter', () => {
        const normalJitterMetrics = {
          ...mockMetrics,
          jitter: 5, // Normal jitter
        }

        const issues = detector.detect(normalJitterMetrics, mockThresholds)
        const jitterIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.HIGH_JITTER
        )

        expect(jitterIssue).toBeUndefined()
      })
    })

    describe('No Inbound Packets Detection', () => {
      it('should detect no inbound packets over time', () => {
        // First sample with packets
        detector.detect(mockMetrics, mockThresholds)

        // Advance time and sample with no packets at all
        jest.advanceTimersByTime(3000) // 3 seconds

        const noPacketsMetrics = {
          ...mockMetrics,
          packetsReceived: 0, // No packets received at all
          timestamp: Date.now(),
        }

        const issues = detector.detect(noPacketsMetrics, mockThresholds)
        const noPacketsIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
        )

        expect(noPacketsIssue).toBeDefined()
        expect(noPacketsIssue?.severity).toBeGreaterThan(0.4) // Should be warning or critical
      })

      it('should not detect no packets issue when receiving packets', () => {
        const receivingMetrics = {
          ...mockMetrics,
          packetsReceived: 150, // More packets received
        }

        const issues = detector.detect(receivingMetrics, mockThresholds)
        const noPacketsIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
        )

        expect(noPacketsIssue).toBeUndefined()
      })
    })

    describe('Bandwidth Degradation Detection', () => {
      it('should detect bandwidth degradation relative to baseline', () => {
        detector.setBaseline(mockBaseline)

        const lowBandwidthMetrics = {
          ...mockMetrics,
          bandwidth: 400, // Significant drop from baseline 1200
        }

        const issues = detector.detectIssues(lowBandwidthMetrics, mockBaseline)
        const bandwidthIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.LOW_BANDWIDTH
        )

        expect(bandwidthIssue).toBeDefined()
        expect(bandwidthIssue?.severity).toBeGreaterThan(0)
      })

      it('should not detect bandwidth degradation with normal values', () => {
        detector.setBaseline(mockBaseline)

        const normalBandwidthMetrics = {
          ...mockMetrics,
          bandwidth: 1100, // Close to baseline
        }

        const issues = detector.detectIssues(
          normalBandwidthMetrics,
          mockBaseline
        )
        const bandwidthIssue = issues.find(
          (issue) => issue.type === NetworkIssueType.LOW_BANDWIDTH
        )

        expect(bandwidthIssue).toBeUndefined()
      })
    })
  })

  describe('Connection State Issues', () => {
    it('should detect ICE connection failures', () => {
      const connectionStats: ConnectionStats = {
        iceConnectionState: 'failed',
        connectionState: 'failed',
        iceGatheringState: 'complete',
        signalingState: 'stable',
        timestamp: Date.now(),
      }

      const issues = detector.addConnectionStateIssue(connectionStats)
      const iceIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.ICE_CONNECTION_FAILED
      )

      expect(iceIssue).toBeDefined()
      expect(iceIssue?.severity).toBe(1.0) // Critical
      expect(iceIssue?.active).toBe(true)
    })

    it('should detect ICE connection disconnected', () => {
      const connectionStats: ConnectionStats = {
        iceConnectionState: 'disconnected',
        connectionState: 'disconnected',
        iceGatheringState: 'complete',
        signalingState: 'stable',
        timestamp: Date.now(),
      }

      const issues = detector.addConnectionStateIssue(connectionStats)
      const iceIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.ICE_CONNECTION_DISCONNECTED
      )

      expect(iceIssue).toBeDefined()
      expect(iceIssue?.severity).toBeGreaterThan(0.7)
    })

    it('should detect unstable connections', () => {
      const connectionStats: ConnectionStats = {
        iceConnectionState: 'connected',
        connectionState: 'disconnected', // This is a problematic state
        iceGatheringState: 'complete',
        signalingState: 'stable',
        timestamp: Date.now(),
      }

      const issues = detector.addConnectionStateIssue(connectionStats)
      const unstableIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.CONNECTION_UNSTABLE
      )

      expect(unstableIssue).toBeDefined()
    })

    it('should not detect issues for normal connection states', () => {
      const connectionStats: ConnectionStats = {
        iceConnectionState: 'connected',
        connectionState: 'connected',
        iceGatheringState: 'complete',
        signalingState: 'stable',
        timestamp: Date.now(),
      }

      const issues = detector.addConnectionStateIssue(connectionStats)
      expect(issues).toHaveLength(0)
    })
  })

  describe('Issue Tracking and History', () => {
    it('should track active issues', () => {
      const highLossMetrics = {
        ...mockMetrics,
        packetLoss: 0.1,
      }

      detector.detectIssues(highLossMetrics, mockBaseline)
      const activeIssues = detector.getActiveIssues()

      expect(activeIssues).toHaveLength(1)
      expect(activeIssues[0].type).toBe(NetworkIssueType.HIGH_PACKET_LOSS)
      expect(activeIssues[0].active).toBe(true)
    })

    it('should mark issues as resolved when not detected', () => {
      // First detect an issue
      const highLossMetrics = {
        ...mockMetrics,
        packetLoss: 0.1,
      }
      detector.detect(highLossMetrics, mockThresholds)

      // Then provide normal metrics
      const normalMetrics = {
        ...mockMetrics,
        packetLoss: 0.005,
      }

      jest.advanceTimersByTime(10000) // Advance time
      detector.detect(normalMetrics, mockThresholds)

      // Clear resolved issues
      detector.clearResolvedIssues()
      const activeIssues = detector.getActiveIssues()

      expect(activeIssues).toHaveLength(0)
    })

    it('should provide detection statistics', () => {
      const highLossMetrics = {
        ...mockMetrics,
        packetLoss: 0.1,
      }

      detector.detectIssues(highLossMetrics, mockBaseline)
      const stats = detector.getDetectionStats()

      expect(stats).toHaveProperty('totalIssuesDetected')
      expect(stats).toHaveProperty('activeIssuesCount')
      expect(stats).toHaveProperty('issueTypeBreakdown')
      expect(stats).toHaveProperty('averageDetectionTime')
      expect(stats.totalIssuesDetected).toBeGreaterThan(0)
    })

    it('should reset all tracking state', () => {
      // Add some issues
      const highLossMetrics = {
        ...mockMetrics,
        packetLoss: 0.1,
      }
      detector.detectIssues(highLossMetrics, mockBaseline)

      // Reset
      detector.reset()

      const activeIssues = detector.getActiveIssues()
      const stats = detector.getDetectionStats()

      expect(activeIssues).toHaveLength(0)
      expect(stats.totalIssuesDetected).toBe(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle metrics with NaN values', () => {
      const invalidMetrics = {
        ...mockMetrics,
        packetLoss: NaN,
        rtt: NaN,
        jitter: NaN,
      }

      const issues = detector.detect(invalidMetrics, mockThresholds)
      // Should not crash and should handle gracefully
      expect(Array.isArray(issues)).toBe(true)
    })

    it('should handle metrics with negative values', () => {
      const negativeMetrics = {
        ...mockMetrics,
        packetLoss: -0.1,
        rtt: -50,
        jitter: -10,
      }

      const issues = detector.detect(negativeMetrics, mockThresholds)
      expect(Array.isArray(issues)).toBe(true)
    })

    it('should handle extremely large metric values', () => {
      const extremeMetrics = {
        ...mockMetrics,
        packetLoss: 100,
        rtt: 999999,
        jitter: 999999,
        bandwidth: 0,
      }

      const issues = detector.detect(extremeMetrics, mockThresholds)
      expect(Array.isArray(issues)).toBe(true)
      expect(issues.length).toBeGreaterThan(0) // Should detect issues
    })

    it('should handle undefined baseline gracefully', () => {
      const issues = detector.detectIssues(mockMetrics, undefined)
      expect(Array.isArray(issues)).toBe(true)
    })

    it('should handle baseline with zero confidence', () => {
      const lowConfidenceBaseline = {
        ...mockBaseline,
        confidence: 0,
      }

      const issues = detector.detectIssues(mockMetrics, lowConfidenceBaseline)
      expect(Array.isArray(issues)).toBe(true)
    })

    it('should handle rapid consecutive detections', () => {
      const highLossMetrics = {
        ...mockMetrics,
        packetLoss: 0.1,
      }

      // Rapid detections
      for (let i = 0; i < 10; i++) {
        detector.detectIssues(highLossMetrics, mockBaseline)
      }

      const activeIssues = detector.getActiveIssues()
      expect(activeIssues).toHaveLength(1) // Should still be just one issue
    })
  })

  describe('Baseline Integration', () => {
    it('should detect issues relative to baseline when available', () => {
      detector.setBaseline(mockBaseline)

      // Metrics that are bad relative to baseline but might be within absolute thresholds
      const relativelyBadMetrics = {
        ...mockMetrics,
        rtt: 90, // 3x baseline RTT but below absolute threshold
        jitter: 12, // 4x baseline jitter
      }

      const issues = detector.detectIssues(relativelyBadMetrics, mockBaseline)

      expect(issues.length).toBeGreaterThan(0)
      const rttIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.HIGH_LATENCY
      )
      expect(rttIssue).toBeDefined()
    })

    it('should fall back to absolute thresholds when baseline is unreliable', () => {
      const unreliableBaseline = {
        ...mockBaseline,
        confidence: 0.1, // Very low confidence
      }

      detector.setBaseline(unreliableBaseline)

      const highLossMetrics = {
        ...mockMetrics,
        packetLoss: 0.1, // Clearly above absolute threshold
      }

      const issues = detector.detectIssues(highLossMetrics, unreliableBaseline)
      const packetLossIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.HIGH_PACKET_LOSS
      )

      expect(packetLossIssue).toBeDefined()
    })
  })

  describe('Severity Calculation', () => {
    it('should calculate appropriate severity levels', () => {
      const moderateIssueMetrics = {
        ...mockMetrics,
        packetLoss: 0.05, // Moderate packet loss
      }

      const severeIssueMetrics = {
        ...mockMetrics,
        packetLoss: 0.2, // Severe packet loss
      }

      const moderateIssues = detector.detect(
        moderateIssueMetrics,
        mockThresholds
      )
      const severeIssues = detector.detect(severeIssueMetrics, mockThresholds)

      const moderateIssue = moderateIssues.find(
        (issue) => issue.type === NetworkIssueType.HIGH_PACKET_LOSS
      )
      const severeIssue = severeIssues.find(
        (issue) => issue.type === NetworkIssueType.HIGH_PACKET_LOSS
      )

      expect(moderateIssue?.severity).toBeLessThan(severeIssue?.severity || 0)
      expect(moderateIssue?.severity).toBeGreaterThan(0)
      expect(severeIssue?.severity).toBeLessThanOrEqual(1)
    })
  })

  describe('No Inbound Packets Detection', () => {
    beforeEach(() => {
      // Reset detector state before each test
      detector.reset()
    })

    it('should not detect issue when packets are being received', () => {
      const metricsWithPackets = {
        ...mockMetrics,
        packetsReceived: 100,
        lastPacketReceivedTimestamp: Date.now(),
      }

      const issues = detector.detect(metricsWithPackets, mockThresholds)
      const noPacketsIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )

      expect(noPacketsIssue).toBeUndefined()
    })

    it('should not detect issue when time since last packet is under warning threshold', () => {
      const now = Date.now()

      // First call with packets to establish baseline
      const initialMetrics = {
        ...mockMetrics,
        packetsReceived: 50,
        lastPacketReceivedTimestamp: now - 1000, // 1 second ago
      }
      detector.detect(initialMetrics, mockThresholds)

      // Second call without new packets but within warning threshold
      const noNewPacketsMetrics = {
        ...mockMetrics,
        packetsReceived: 0,
        timestamp: now + 1500, // Only 1.5 seconds since last packet
      }

      const issues = detector.detect(noNewPacketsMetrics, mockThresholds)
      const noPacketsIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )

      expect(noPacketsIssue).toBeUndefined()
    })

    it('should detect warning level issue when no packets for 2+ seconds', () => {
      const now = Date.now()

      // First establish a baseline with packets received recently
      const initialMetrics = {
        ...mockMetrics,
        packetsReceived: 50,
        lastPacketReceivedTimestamp: now,
      }
      detector.detect(initialMetrics, mockThresholds)

      // Advance time and detect with no new packets for 2.5 seconds (warning level)
      jest.advanceTimersByTime(2500) // 2.5 seconds without packets

      const noPacketsMetrics = {
        ...mockMetrics,
        packetsReceived: 0, // No new packets
      }

      const issues = detector.detect(noPacketsMetrics, mockThresholds)
      const noPacketsIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )

      expect(noPacketsIssue).toBeDefined()
      expect(noPacketsIssue?.type).toBe(NetworkIssueType.NO_INBOUND_PACKETS)
      expect(noPacketsIssue?.severity).toBe(0.5) // Warning level
      expect(noPacketsIssue?.value).toBeGreaterThanOrEqual(2000) // >= 2 seconds
      expect(noPacketsIssue?.value).toBeLessThan(5000) // < 5 seconds
      expect(noPacketsIssue?.threshold).toBe(2000) // Warning threshold
      expect(noPacketsIssue?.description).toContain('warning')
      expect(noPacketsIssue?.active).toBe(true)
    })

    it('should detect critical level issue when no packets for 5+ seconds', () => {
      const now = Date.now()

      // First establish a baseline with packets received recently
      const initialMetrics = {
        ...mockMetrics,
        packetsReceived: 50,
        lastPacketReceivedTimestamp: now,
      }
      detector.detect(initialMetrics, mockThresholds)

      // Advance time and detect with no new packets for 6 seconds (critical level)
      jest.advanceTimersByTime(6000) // 6 seconds without packets

      const noPacketsMetrics = {
        ...mockMetrics,
        packetsReceived: 0, // No new packets
      }

      const issues = detector.detect(noPacketsMetrics, mockThresholds)
      const noPacketsIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )

      expect(noPacketsIssue).toBeDefined()
      expect(noPacketsIssue?.type).toBe(NetworkIssueType.NO_INBOUND_PACKETS)
      expect(noPacketsIssue?.severity).toBe(0.8) // Critical level
      expect(noPacketsIssue?.value).toBeGreaterThanOrEqual(5000) // >= 5 seconds
      expect(noPacketsIssue?.threshold).toBe(2000) // Warning threshold
      expect(noPacketsIssue?.description).toContain('critical')
      expect(noPacketsIssue?.active).toBe(true)
    })

    it('should handle edge case when lastPacketReceivedTimestamp is not provided', () => {
      const metricsWithoutTimestamp = {
        ...mockMetrics,
        packetsReceived: 100,
        lastPacketReceivedTimestamp: undefined,
      }

      // Should not throw and should update internal timestamp
      const issues = detector.detect(metricsWithoutTimestamp, mockThresholds)
      const noPacketsIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )

      expect(noPacketsIssue).toBeUndefined()
    })

    it('should properly reset tracking when packets resume', () => {
      const now = Date.now()

      // First establish a baseline with packets
      const initialMetrics = {
        ...mockMetrics,
        packetsReceived: 50,
        lastPacketReceivedTimestamp: now,
      }
      detector.detect(initialMetrics, mockThresholds)

      // Create a no-packets scenario by advancing time
      jest.advanceTimersByTime(3000) // 3 seconds
      const noPacketsMetrics = {
        ...mockMetrics,
        packetsReceived: 0, // No new packets
      }

      let issues = detector.detect(noPacketsMetrics, mockThresholds)
      let noPacketsIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )
      expect(noPacketsIssue).toBeDefined()

      // Now packets resume
      const packetsResumeMetrics = {
        ...mockMetrics,
        packetsReceived: 10,
        lastPacketReceivedTimestamp: Date.now(), // Current time
      }

      issues = detector.detect(packetsResumeMetrics, mockThresholds)
      noPacketsIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )

      expect(noPacketsIssue).toBeUndefined()
    })

    it('should track issue properly in activeIssues map', () => {
      const now = Date.now()

      // First establish a baseline with packets
      const initialMetrics = {
        ...mockMetrics,
        packetsReceived: 50,
        lastPacketReceivedTimestamp: now,
      }
      detector.detect(initialMetrics, mockThresholds)

      // Create scenario with no packets for critical duration
      jest.advanceTimersByTime(6000) // 6 seconds

      const noPacketsMetrics = {
        ...mockMetrics,
        packetsReceived: 0, // No new packets
      }

      const issues = detector.detect(noPacketsMetrics, mockThresholds)
      const noPacketsIssue = issues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )

      expect(noPacketsIssue).toBeDefined()
      expect(noPacketsIssue?.active).toBe(true)

      // Also check activeIssues map via detectIssues
      detector.detectIssues(noPacketsMetrics)
      const activeIssues = detector.getActiveIssues()
      const activeNoPacketsIssue = activeIssues.find(
        (issue) => issue.type === NetworkIssueType.NO_INBOUND_PACKETS
      )
      expect(activeNoPacketsIssue).toBeDefined()
    })
  })
})
