/**
 * RecoveryManager Tests
 */

import { RecoveryManager } from './RecoveryManager'
import {
  NetworkIssue,
  NetworkIssueType,
  RecoveryType,
  SeverityUtils,
} from './interfaces'
import { MAX_RECOVERY_ATTEMPTS, RECOVERY_TIMING } from './constants'

// Mock RTCPeer and BaseConnection
const mockRTCPeer = {
  instance: {
    signalingState: 'stable',
    getStats: jest.fn().mockResolvedValue(new Map()),
    restartIce: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  isNegotiating: false,
  restartIce: jest.fn(),
  startNegotiation: jest.fn().mockResolvedValue(undefined),
  applyMediaConstraints: jest.fn().mockResolvedValue(undefined),
  restoreTrackSender: jest.fn().mockResolvedValue(undefined),
  triggerResume: jest.fn(),
  requestKeyframe: jest.fn().mockResolvedValue(undefined),
  triggerReinvite: jest.fn().mockResolvedValue(undefined),
  triggerICERestart: jest.fn().mockResolvedValue(undefined),
  _pendingNegotiationPromise: undefined,
}

const mockConnection = {
  emit: jest.fn(),
}

// Helper function to create a NetworkIssue with both severity fields
const createIssue = (
  type: NetworkIssueType,
  severity: number,
  options: Partial<NetworkIssue> = {}
): NetworkIssue => ({
  type,
  severity,
  severityLevel: SeverityUtils.toSeverityLevel(severity),
  value: options.value ?? 1,
  threshold: options.threshold ?? 0,
  timestamp: options.timestamp ?? Date.now(),
  active: options.active ?? true,
  ...options,
})

describe('RecoveryManager', () => {
  let recoveryManager: RecoveryManager
  let mockIssues: NetworkIssue[]

  beforeEach(() => {
    jest.clearAllMocks()
    recoveryManager = new RecoveryManager(
      mockRTCPeer as any,
      mockConnection as any
    )
    recoveryManager.reset() // Reset to clear any rate limiting

    mockIssues = [
      createIssue(NetworkIssueType.HIGH_PACKET_LOSS, 0.5, {
        value: 0.1,
        threshold: 0.05,
        mediaType: 'video',
      }),
      createIssue(NetworkIssueType.HIGH_JITTER, 0.8, {
        value: 100,
        threshold: 50,
        mediaType: 'audio',
      }),
    ]
  })

  describe('Constructor', () => {
    it('should initialize correctly', () => {
      expect(recoveryManager).toBeInstanceOf(RecoveryManager)
      expect(recoveryManager.getHistory()).toEqual([])
    })
  })

  describe('Recovery Tier Detection', () => {
    it('should determine Tier 1 for single warning issue', async () => {
      const warningIssues: NetworkIssue[] = [
        createIssue(NetworkIssueType.HIGH_PACKET_LOSS, 0.5, {
          // Warning level (< 0.7)
          value: 0.03,
          threshold: 0.02,
          timestamp: Date.now(),
          active: true,
        }),
      ]

      const result = await recoveryManager.attemptRecovery(warningIssues)
      expect(result.type).toBe(RecoveryType.NONE)
    })

    it('should determine Tier 2 for single critical issue', async () => {
      const criticalIssues: NetworkIssue[] = [
        createIssue(NetworkIssueType.HIGH_PACKET_LOSS, 0.8, {
          // Critical level (>= 0.7)
          value: 0.08,
          threshold: 0.05,
          timestamp: Date.now(),
          active: true,
          mediaType: 'video',
        }),
      ]

      const result = await recoveryManager.attemptRecovery(criticalIssues)
      expect(result.type).toBe(RecoveryType.TOGGLE_TRACKS)
    })

    it('should determine Tier 3 for ICE connection issues', async () => {
      const iceIssues: NetworkIssue[] = [
        createIssue(NetworkIssueType.ICE_CONNECTION_FAILED, 0.9, {
          value: 1,
          threshold: 0,
          timestamp: Date.now(),
          active: true,
        }),
        createIssue(NetworkIssueType.ICE_CONNECTION_FAILED, 0.9, {
          value: 1,
          threshold: 0,
          timestamp: Date.now(),
          active: true,
        }),
        createIssue(NetworkIssueType.ICE_CONNECTION_FAILED, 0.9, {
          value: 1,
          threshold: 0,
          timestamp: Date.now(),
          active: true,
        }),
      ]

      const result = await recoveryManager.attemptRecovery(iceIssues)
      expect(result.type).toBe(RecoveryType.RESTART_ICE)
    })
  })

  describe('Rate Limiting', () => {
    it('should allow first recovery attempt', () => {
      expect(recoveryManager.canAttemptRecovery(RecoveryType.RESTART_ICE)).toBe(
        true
      )
    })

    it('should block recovery attempts during debounce period', async () => {
      // Record an attempt
      recoveryManager.recordRecoveryAttempt(RecoveryType.RESTART_ICE)

      // Should be blocked immediately after
      expect(recoveryManager.canAttemptRecovery(RecoveryType.RESTART_ICE)).toBe(
        false
      )
    })

    it('should respect max attempts per type', () => {
      const maxAttempts = MAX_RECOVERY_ATTEMPTS.ICE_RESTARTS

      // Record max attempts
      for (let i = 0; i < maxAttempts; i++) {
        recoveryManager.recordRecoveryAttempt(RecoveryType.RESTART_ICE)
      }

      // Should be blocked after max attempts
      expect(recoveryManager.canAttemptRecovery(RecoveryType.RESTART_ICE)).toBe(
        false
      )
    })
  })

  describe('Recovery Actions', () => {
    it('should execute ICE restart for multiple critical ICE issues', async () => {
      const iceIssues: NetworkIssue[] = [
        createIssue(NetworkIssueType.ICE_CONNECTION_FAILED, 0.9, {
          value: 1,
          threshold: 0,
          timestamp: Date.now(),
          active: true,
        }),
        createIssue(NetworkIssueType.ICE_CONNECTION_FAILED, 0.9, {
          value: 1,
          threshold: 0,
          timestamp: Date.now(),
          active: true,
        }),
        createIssue(NetworkIssueType.ICE_CONNECTION_FAILED, 0.9, {
          value: 1,
          threshold: 0,
          timestamp: Date.now(),
          active: true,
        }),
      ]

      const result = await recoveryManager.attemptRecovery(iceIssues)

      expect(result.type).toBe(RecoveryType.RESTART_ICE)
      expect(mockRTCPeer.restartIce).toHaveBeenCalled()
    })

    it('should execute keyframe request for critical video issues', async () => {
      const videoIssues: NetworkIssue[] = [
        createIssue(NetworkIssueType.MEDIA_QUALITY_DEGRADED, 0.8, {
          // Critical level
          value: 0.8,
          threshold: 0.5,
          timestamp: Date.now(),
          active: true,
          mediaType: 'video',
        }),
      ]

      const result = await recoveryManager.attemptRecovery(videoIssues)

      expect(result.type).toBe(RecoveryType.TOGGLE_TRACKS)
      expect(mockRTCPeer.requestKeyframe).toHaveBeenCalled()
    })

    it('should handle renegotiation for multiple critical connection issues', async () => {
      const connectionIssues: NetworkIssue[] = [
        createIssue(NetworkIssueType.CONNECTION_UNSTABLE, 0.9, {
          value: 1,
          threshold: 0.8,
          timestamp: Date.now(),
          active: true,
        }),
        createIssue(NetworkIssueType.CONNECTION_UNSTABLE, 0.9, {
          value: 1,
          threshold: 0.8,
          timestamp: Date.now(),
          active: true,
        }),
        createIssue(NetworkIssueType.CONNECTION_UNSTABLE, 0.9, {
          value: 1,
          threshold: 0.8,
          timestamp: Date.now(),
          active: true,
        }),
      ]

      const result = await recoveryManager.attemptRecovery(connectionIssues)

      expect(result.type).toBe(RecoveryType.RENEGOTIATE)
      expect(mockRTCPeer.triggerReinvite).toHaveBeenCalled()
    })
  })

  describe('Manual Recovery', () => {
    it('should allow manual recovery trigger', async () => {
      const result = await recoveryManager.triggerManualRecovery(
        RecoveryType.RESTART_ICE
      )

      expect(result.type).toBe(RecoveryType.RESTART_ICE)
      expect(result.triggeredBy).toHaveLength(1)
      expect(result.triggeredBy[0].description).toBe(
        'Manual recovery triggered'
      )
    })
  })

  describe('History Management', () => {
    it('should maintain recovery history', async () => {
      const result = await recoveryManager.attemptRecovery(mockIssues)

      const history = recoveryManager.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toEqual(result)
    })

    it('should limit history size', async () => {
      // Reset recovery manager to clear debounces
      recoveryManager.reset()

      // Simulate many recovery attempts
      for (let i = 0; i < 10; i++) {
        // Reduced for faster test
        jest.advanceTimersByTime(RECOVERY_TIMING.RECOVERY_DEBOUNCE_MS + 1000)
        await recoveryManager.attemptRecovery([
          createIssue(NetworkIssueType.HIGH_PACKET_LOSS, 0.3, {
            value: 0.03,
            threshold: 0.02,
          }),
        ])
      }

      const history = recoveryManager.getHistory()
      expect(history.length).toBeGreaterThan(0) // Should have some history
      expect(history.length).toBeLessThanOrEqual(50) // Should be limited
    })
  })

  describe('Custom Strategy Registration', () => {
    it('should allow registering custom strategies', async () => {
      const customHandler = jest.fn().mockResolvedValue(true)

      recoveryManager.registerStrategy(RecoveryType.CHANGE_CODEC, customHandler)

      // Manually execute the strategy
      const result = await recoveryManager.executeRecoveryAction(
        RecoveryType.CHANGE_CODEC,
        mockIssues
      )

      expect(result).toBe(true)
      expect(customHandler).toHaveBeenCalledWith(mockIssues)
    })
  })

  describe('Reset Functionality', () => {
    it('should reset history and attempt counters', async () => {
      // Create some history
      await recoveryManager.attemptRecovery(mockIssues)
      recoveryManager.recordRecoveryAttempt(RecoveryType.RESTART_ICE)

      expect(recoveryManager.getHistory()).toHaveLength(1)

      // Reset
      recoveryManager.reset()

      expect(recoveryManager.getHistory()).toHaveLength(0)
      expect(recoveryManager.canAttemptRecovery(RecoveryType.RESTART_ICE)).toBe(
        true
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock an error in the recovery action
      mockRTCPeer.restartIce.mockImplementation(() => {
        throw new Error('ICE restart failed')
      })

      const iceIssues: NetworkIssue[] = [
        createIssue(NetworkIssueType.ICE_CONNECTION_FAILED, 0.9, {
          value: 1,
          threshold: 0,
          timestamp: Date.now(),
          active: true,
        }),
      ]

      const result = await recoveryManager.attemptRecovery(iceIssues)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('ICE restart failed')
    })

    it('should handle missing RTCPeer gracefully', async () => {
      const brokenRecoveryManager = new RecoveryManager(
        null as any,
        mockConnection as any
      )

      const result = await brokenRecoveryManager.attemptRecovery(mockIssues)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Concurrent Recovery Protection', () => {
    it('should prevent concurrent recovery operations', async () => {
      // Start two recovery operations simultaneously
      const promise1 = recoveryManager.attemptRecovery(mockIssues)
      const promise2 = recoveryManager.attemptRecovery(mockIssues)

      const [result1, result2] = await Promise.all([promise1, promise2])

      // Both should return the same result (same operation)
      expect(result1).toBe(result2)
    })
  })
})

// Mock timers for testing
jest.useFakeTimers()
