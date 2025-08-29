/**
 * Recovery Actions Test Suite
 * Tests for Redux actions used in DeviceRecoveryEngine
 */

import {
  recoveryStartedAction,
  recoveryProgressAction,
  recoverySucceededAction,
  recoveryFailedAction,
  recoveryCancelledAction,
  recoveryDebouncedAction,
  strategyExecutedAction,
  recoveryStatusChangedAction,
} from './deviceActions'
import type { 
  RecoveryAttempt, 
  RecoveryResult, 
  RecoveryStrategyDefinition, 
  RecoveryStrategyResult,
  DeviceType 
} from './types'
import { RecoveryStatus } from './types'

describe('Recovery Actions', () => {
  // Mock objects for testing
  const mockAttempt: RecoveryAttempt = {
    id: 'test-attempt-1',
    deviceType: 'camera',
    strategy: 'exact-id-match',
    startTime: Date.now(),
    status: RecoveryStatus.PENDING,
    retryCount: 0,
  }

  const mockResult: RecoveryResult = {
    success: true,
    deviceId: 'camera1',
    method: 'preference',
    attempts: 1,
    duration: 150,
  }

  const mockStrategy: RecoveryStrategyDefinition = {
    name: 'exact-id-match',
    priority: 1,
    description: 'Test strategy',
    execute: async () => ({ success: true }),
  }

  const mockStrategyResult: RecoveryStrategyResult = {
    success: true,
    deviceId: 'camera1',
    reason: 'Found device',
    confidence: 1.0,
  }

  describe('recoveryStartedAction', () => {
    it('should create action for recovery started', () => {
      const payload = { attempt: mockAttempt }
      const action = recoveryStartedAction(payload)

      expect(action).toEqual({
        type: 'recovery.started',
        payload,
      })
    })
  })

  describe('recoveryProgressAction', () => {
    it('should create action for recovery progress', () => {
      const payload = {
        attempt: mockAttempt,
        strategy: 'exact-id-match',
        progress: 0.5,
      }
      const action = recoveryProgressAction(payload)

      expect(action).toEqual({
        type: 'recovery.progress',
        payload,
      })
    })
  })

  describe('recoverySucceededAction', () => {
    it('should create action for recovery succeeded', () => {
      const payload = {
        attempt: mockAttempt,
        result: mockResult,
      }
      const action = recoverySucceededAction(payload)

      expect(action).toEqual({
        type: 'recovery.succeeded',
        payload,
      })
    })
  })

  describe('recoveryFailedAction', () => {
    it('should create action for recovery failed', () => {
      const error = new Error('Recovery failed')
      const payload = {
        attempt: mockAttempt,
        error,
      }
      const action = recoveryFailedAction(payload)

      expect(action).toEqual({
        type: 'recovery.failed',
        payload,
      })
    })
  })

  describe('recoveryCancelledAction', () => {
    it('should create action for recovery cancelled', () => {
      const payload = {
        attempt: mockAttempt,
        reason: 'User cancelled',
      }
      const action = recoveryCancelledAction(payload)

      expect(action).toEqual({
        type: 'recovery.cancelled',
        payload,
      })
    })

    it('should create action for recovery cancelled without reason', () => {
      const payload = {
        attempt: mockAttempt,
      }
      const action = recoveryCancelledAction(payload)

      expect(action).toEqual({
        type: 'recovery.cancelled',
        payload,
      })
    })
  })

  describe('recoveryDebouncedAction', () => {
    it('should create action for recovery debounced', () => {
      const payload = {
        deviceType: 'microphone' as DeviceType,
        reason: 'Multiple rapid requests',
      }
      const action = recoveryDebouncedAction(payload)

      expect(action).toEqual({
        type: 'recovery.debounced',
        payload,
      })
    })
  })

  describe('strategyExecutedAction', () => {
    it('should create action for strategy executed', () => {
      const payload = {
        attempt: mockAttempt,
        strategy: mockStrategy,
        result: mockStrategyResult,
      }
      const action = strategyExecutedAction(payload)

      expect(action).toEqual({
        type: 'strategy.executed',
        payload,
      })
    })
  })

  describe('recoveryStatusChangedAction', () => {
    it('should create action for recovery status changed', () => {
      const payload = {
        activeRecoveries: 2,
        queuedRecoveries: 1,
      }
      const action = recoveryStatusChangedAction(payload)

      expect(action).toEqual({
        type: 'recovery.status.changed',
        payload,
      })
    })
  })

  describe('Action Type Consistency', () => {
    it('should have consistent action type format for recovery actions', () => {
      const recoveryActions = [
        recoveryStartedAction,
        recoveryProgressAction,
        recoverySucceededAction,
        recoveryFailedAction,
        recoveryCancelledAction,
        recoveryDebouncedAction,
        strategyExecutedAction,
        recoveryStatusChangedAction,
      ]

      recoveryActions.forEach((actionCreator) => {
        const action = actionCreator({} as any)
        expect(typeof action.type).toBe('string')
        expect(action.type.length).toBeGreaterThan(0)
      })
    })

    it('should have unique action types for recovery actions', () => {
      const actionCreators = [
        recoveryStartedAction,
        recoveryProgressAction,
        recoverySucceededAction,
        recoveryFailedAction,
        recoveryCancelledAction,
        recoveryDebouncedAction,
        strategyExecutedAction,
        recoveryStatusChangedAction,
      ]

      const actionTypes = actionCreators.map(
        (creator) => creator({} as any).type
      )
      const uniqueTypes = new Set(actionTypes)

      expect(uniqueTypes.size).toBe(actionTypes.length)
    })
  })
})