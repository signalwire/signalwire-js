/**
 * RecoveryManager Usage Example
 *
 * This example demonstrates how to use the RecoveryManager class
 * for automatic WebRTC connection recovery.
 */

import { RecoveryManager } from './RecoveryManager'
import {
  NetworkIssue,
  NetworkIssueType,
  RecoveryType,
  SeverityUtils,
} from './interfaces'
import type RTCPeer from '../RTCPeer'
import type { BaseConnection } from '../BaseConnection'

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

/**
 * Example usage of RecoveryManager
 */
export function createRecoveryManagerExample(
  rtcPeer: RTCPeer<any>,
  connection: BaseConnection<any>
) {
  // Create a new RecoveryManager instance
  const recoveryManager = new RecoveryManager(rtcPeer, connection)

  // Listen for recovery events
  recoveryManager.on('recovery.attempted', (event) => {
    console.log('Recovery attempted:', event.attempt)

    if (event.attempt.success) {
      console.log(
        `Recovery ${event.attempt.type} succeeded in ${event.attempt.duration}ms`
      )
    } else {
      console.log(`Recovery ${event.attempt.type} failed:`, event.attempt.error)
    }
  })

  // Example: Handle detected network issues
  async function handleNetworkIssues(issues: NetworkIssue[]) {
    try {
      const recoveryResult = await recoveryManager.attemptRecovery(issues)

      console.log('Recovery result:', {
        type: recoveryResult.type,
        success: recoveryResult.success,
        duration: recoveryResult.duration,
        triggeredBy: recoveryResult.triggeredBy.length,
      })

      return recoveryResult.success
    } catch (error) {
      console.error('Recovery failed:', error)
      return false
    }
  }

  // Example: Manual recovery trigger
  async function triggerManualRecovery(type: RecoveryType) {
    try {
      const result = await recoveryManager.triggerManualRecovery(type)
      console.log(`Manual recovery ${type} result:`, result.success)
      return result
    } catch (error) {
      console.error(`Manual recovery ${type} failed:`, error)
      throw error
    }
  }

  // Example: Register custom recovery strategy
  function registerCustomStrategy() {
    recoveryManager.registerStrategy(
      RecoveryType.CHANGE_CODEC,
      async (issues) => {
        console.log(
          'Executing custom codec change strategy for issues:',
          issues
        )

        // Custom recovery logic here
        // For example, change video codec or adjust encoding parameters

        return true // Return success/failure
      }
    )
  }

  // Example: Check recovery capabilities
  function checkRecoveryCapabilities() {
    const canRestartIce = recoveryManager.canAttemptRecovery(
      RecoveryType.RESTART_ICE
    )
    const canRenegotiate = recoveryManager.canAttemptRecovery(
      RecoveryType.RENEGOTIATE
    )
    const canToggleTracks = recoveryManager.canAttemptRecovery(
      RecoveryType.TOGGLE_TRACKS
    )

    console.log('Recovery capabilities:', {
      canRestartIce,
      canRenegotiate,
      canToggleTracks,
    })

    return { canRestartIce, canRenegotiate, canToggleTracks }
  }

  // Example: Get recovery history
  function getRecoveryStats() {
    const history = recoveryManager.getHistory()

    const stats = {
      totalAttempts: history.length,
      successfulAttempts: history.filter((attempt) => attempt.success).length,
      failedAttempts: history.filter((attempt) => !attempt.success).length,
      averageDuration:
        history.length > 0
          ? history.reduce((sum, attempt) => sum + attempt.duration, 0) /
            history.length
          : 0,
      recoveryTypes: history.reduce((counts, attempt) => {
        counts[attempt.type] = (counts[attempt.type] || 0) + 1
        return counts
      }, {} as Record<string, number>),
    }

    console.log('Recovery statistics:', stats)
    return stats
  }

  // Example: Reset recovery manager
  function resetRecoveryManager() {
    recoveryManager.reset()
    console.log('Recovery manager reset - all history and rate limits cleared')
  }

  // Return public interface
  return {
    handleNetworkIssues,
    triggerManualRecovery,
    registerCustomStrategy,
    checkRecoveryCapabilities,
    getRecoveryStats,
    resetRecoveryManager,
    recoveryManager,
  }
}

/**
 * Example network issues for testing
 */
export const exampleNetworkIssues: NetworkIssue[] = [
  // Tier 1 (Warning) - Single low-severity issue
  createIssue(NetworkIssueType.HIGH_PACKET_LOSS, 0.4, {
    // Warning level
    value: 0.03,
    threshold: 0.02,
    timestamp: Date.now(),
    active: true,
    mediaType: 'video',
  }),

  // Tier 2 (Recovery) - Critical issue requiring keyframe request
  createIssue(NetworkIssueType.MEDIA_QUALITY_DEGRADED, 0.8, {
    // Critical level
    value: 0.9,
    threshold: 0.7,
    timestamp: Date.now(),
    active: true,
    mediaType: 'video',
  }),

  // Tier 3 (ICE Restart) - Multiple critical issues
  createIssue(NetworkIssueType.ICE_CONNECTION_FAILED, 0.9, {
    value: 1,
    threshold: 0,
    timestamp: Date.now(),
    active: true,
  }),
]

/**
 * Example usage in a WebRTC application
 */
export async function exampleWebRTCApp(
  rtcPeer: RTCPeer<any>,
  connection: BaseConnection<any>
) {
  const recovery = createRecoveryManagerExample(rtcPeer, connection)

  // Register custom strategies
  recovery.registerCustomStrategy()

  // Simulate network monitoring detecting issues
  console.log('Simulating network issue detection...')

  // Handle a warning-level issue (Tier 1)
  const warningResult = await recovery.handleNetworkIssues([
    exampleNetworkIssues[0],
  ])
  console.log('Warning issue handled:', warningResult)

  // Handle a critical issue requiring recovery (Tier 2)
  const recoveryResult = await recovery.handleNetworkIssues([
    exampleNetworkIssues[1],
  ])
  console.log('Critical issue handled:', recoveryResult)

  // Manual ICE restart
  try {
    const iceRestartResult = await recovery.triggerManualRecovery(
      RecoveryType.RESTART_ICE
    )
    console.log('Manual ICE restart:', iceRestartResult.success)
  } catch (error) {
    console.error('Manual ICE restart failed:', error)
  }

  // Check current capabilities
  recovery.checkRecoveryCapabilities()

  // Get recovery statistics
  recovery.getRecoveryStats()

  return recovery
}
