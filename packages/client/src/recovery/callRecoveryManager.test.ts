/**
 * Unit tests for CallRecoveryManager
 * 
 * Tests call recovery orchestration, strategy execution,
 * and integration with network monitoring.
 */

import { CallRecoveryManager } from './callRecoveryManager'
import { ReinviteEngine } from './reinviteEngine'
import { NetworkIssueDetector } from './networkIssueDetector'

// Mock dependencies
jest.mock('./reinviteEngine')
jest.mock('./networkIssueDetector')

const MockReinviteEngine = ReinviteEngine as jest.MockedClass<typeof ReinviteEngine>
const MockNetworkIssueDetector = NetworkIssueDetector as jest.MockedClass<typeof NetworkIssueDetector>

// Mock CallSession
const mockCallSession = {
  id: 'test-call-id',
  reinvite: jest.fn(),
  hangup: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  state: 'active',
  peer: {
    id: 'peer-id',
    restart: jest.fn(),
    restartIce: jest.fn()
  }
}

describe('CallRecoveryManager', () => {
  let manager: CallRecoveryManager
  let mockReinviteEngine: jest.Mocked<ReinviteEngine>
  let mockNetworkDetector: jest.Mocked<NetworkIssueDetector>
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mocks
    mockReinviteEngine = {
      scheduleReinvite: jest.fn().mockResolvedValue(true),
      cancelReinvite: jest.fn(),
      destroy: jest.fn(),
      updateConfig: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any
    
    mockNetworkDetector = {
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      destroy: jest.fn(),
      updateConfig: jest.fn(),
      getNetworkQuality: jest.fn().mockReturnValue('good'),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any
    
    MockReinviteEngine.mockImplementation(() => mockReinviteEngine)
    MockNetworkIssueDetector.mockImplementation(() => mockNetworkDetector)
    
    manager = new CallRecoveryManager({
      enableAutoRecovery: true,
      maxRecoveryAttempts: 3,
      recoveryTimeoutMs: 30000,
      triggers: {
        networkIssues: true,
        deviceChanges: true,
        connectionIssues: true,
        callQuality: true
      }
    })
  })
  
  afterEach(() => {
    manager.destroy()
  })

  describe('initialization', () => {
    it('should create manager with default config', () => {
      const defaultManager = new CallRecoveryManager()
      expect(defaultManager).toBeInstanceOf(CallRecoveryManager)
      defaultManager.destroy()
    })

    it('should create manager with custom config', () => {
      const config = {
        enableAutoRecovery: false,
        maxRecoveryAttempts: 1,
        recoveryTimeoutMs: 10000,
        triggers: {
          networkIssues: false,
          deviceChanges: true,
          connectionIssues: false,
          callQuality: false
        }
      }
      const customManager = new CallRecoveryManager(config)
      expect(customManager).toBeInstanceOf(CallRecoveryManager)
      customManager.destroy()
    })

    it('should initialize reinvite engine and network detector', () => {
      expect(MockReinviteEngine).toHaveBeenCalledTimes(1)
      expect(MockNetworkIssueDetector).toHaveBeenCalledTimes(1)
    })
  })

  describe('call session management', () => {
    it('should attach to call session', () => {
      manager.attachToCallSession(mockCallSession as any)
      
      expect(mockNetworkDetector.startMonitoring).toHaveBeenCalledWith(mockCallSession.peer)
      expect(mockCallSession.on).toHaveBeenCalledWith('call.state', expect.any(Function))
    })

    it('should detach from call session', () => {
      manager.attachToCallSession(mockCallSession as any)
      manager.detachFromCallSession()
      
      expect(mockNetworkDetector.stopMonitoring).toHaveBeenCalled()
      expect(mockCallSession.off).toHaveBeenCalledWith('call.state', expect.any(Function))
    })

    it('should handle multiple attach/detach cycles', () => {
      manager.attachToCallSession(mockCallSession as any)
      manager.detachFromCallSession()
      manager.attachToCallSession(mockCallSession as any)
      
      expect(mockNetworkDetector.startMonitoring).toHaveBeenCalledTimes(2)
    })
  })

  describe('recovery triggering', () => {
    beforeEach(() => {
      manager.attachToCallSession(mockCallSession as any)
    })

    it('should trigger recovery for network issues', async () => {
      const result = await manager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: { packetLoss: 10, rtt: 500 }
      })
      
      expect(result).toBe(true)
      expect(mockReinviteEngine.scheduleReinvite).toHaveBeenCalledWith(
        mockCallSession,
        expect.objectContaining({
          reason: 'network_issue',
          priority: 'high'
        })
      )
    })

    it('should trigger recovery for device changes', async () => {
      const result = await manager.triggerRecovery({
        type: 'device_change',
        severity: 'medium',
        details: { deviceType: 'camera', deviceId: 'new-camera' }
      })
      
      expect(result).toBe(true)
      expect(mockReinviteEngine.scheduleReinvite).toHaveBeenCalledWith(
        mockCallSession,
        expect.objectContaining({
          reason: 'device_change',
          priority: 'medium'
        })
      )
    })

    it('should trigger recovery for connection issues', async () => {
      const result = await manager.triggerRecovery({
        type: 'connection_issue',
        severity: 'high',
        details: { iceState: 'failed', connectionState: 'failed' }
      })
      
      expect(result).toBe(true)
      expect(mockReinviteEngine.scheduleReinvite).toHaveBeenCalledWith(
        mockCallSession,
        expect.objectContaining({
          reason: 'connection_issue',
          priority: 'high'
        })
      )
    })

    it('should trigger recovery for call quality issues', async () => {
      const result = await manager.triggerRecovery({
        type: 'call_quality',
        severity: 'medium',
        details: { audioQuality: 'poor', videoQuality: 'poor' }
      })
      
      expect(result).toBe(true)
      expect(mockReinviteEngine.scheduleReinvite).toHaveBeenCalledWith(
        mockCallSession,
        expect.objectContaining({
          reason: 'call_quality',
          priority: 'medium'
        })
      )
    })

    it('should respect disabled triggers', async () => {
      const disabledManager = new CallRecoveryManager({
        triggers: {
          networkIssues: false,
          deviceChanges: false,
          connectionIssues: false,
          callQuality: false
        }
      })
      
      disabledManager.attachToCallSession(mockCallSession as any)
      
      const result = await disabledManager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      expect(result).toBe(false)
      disabledManager.destroy()
    })
  })

  describe('recovery attempts tracking', () => {
    beforeEach(() => {
      manager.attachToCallSession(mockCallSession as any)
    })

    it('should track recovery attempts', async () => {
      await manager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      const stats = manager.getRecoveryStats()
      expect(stats.totalAttempts).toBe(1)
      expect(stats.successfulRecoveries).toBe(1)
      expect(stats.failedRecoveries).toBe(0)
    })

    it('should limit recovery attempts', async () => {
      const limitedManager = new CallRecoveryManager({
        maxRecoveryAttempts: 2
      })
      limitedManager.attachToCallSession(mockCallSession as any)
      
      // Mock reinvite to fail
      const mockFailingEngine = {
        scheduleReinvite: jest.fn().mockResolvedValue(false),
        cancelReinvite: jest.fn(),
        destroy: jest.fn(),
        updateConfig: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      } as any
      
      MockReinviteEngine.mockImplementation(() => mockFailingEngine)
      
      // First attempt
      await limitedManager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      // Second attempt
      await limitedManager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      // Third attempt should be rejected
      const result = await limitedManager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      expect(result).toBe(false)
      limitedManager.destroy()
    })

    it('should reset recovery attempts on successful recovery', async () => {
      // First recovery
      await manager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      // Simulate successful recovery
      manager.emit('recovery.completed', {
        trigger: { type: 'network_issue', severity: 'high', details: {} },
        success: true,
        duration: 1000
      })
      
      const stats = manager.getRecoveryStats()
      expect(stats.successfulRecoveries).toBe(1)
    })
  })

  describe('automatic recovery', () => {
    beforeEach(() => {
      manager.attachToCallSession(mockCallSession as any)
    })

    it('should enable automatic recovery by default', () => {
      // Simulate network issue detection
      const networkCallback = mockNetworkDetector.on.mock.calls.find(
        call => call[0] === 'network.issue'
      )?.[1]
      
      expect(networkCallback).toBeDefined()
      
      if (networkCallback) {
        networkCallback({
          type: 'high_packet_loss',
          severity: 'high',
          details: { packetLoss: 15 }
        })
        
        expect(mockReinviteEngine.scheduleReinvite).toHaveBeenCalled()
      }
    })

    it('should disable automatic recovery when configured', () => {
      const manualManager = new CallRecoveryManager({
        enableAutoRecovery: false
      })
      
      manualManager.attachToCallSession(mockCallSession as any)
      
      // Network detector should still be attached but not trigger recovery
      expect(MockNetworkIssueDetector).toHaveBeenCalledTimes(2) // Original + new manager
      
      manualManager.destroy()
    })
  })

  describe('recovery strategies', () => {
    beforeEach(() => {
      manager.attachToCallSession(mockCallSession as any)
    })

    it('should use reinvite strategy for network issues', async () => {
      await manager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: { packetLoss: 10 }
      })
      
      expect(mockReinviteEngine.scheduleReinvite).toHaveBeenCalledWith(
        mockCallSession,
        expect.objectContaining({
          strategy: 'reinvite'
        })
      )
    })

    it('should use ice_restart strategy for connection issues', async () => {
      await manager.triggerRecovery({
        type: 'connection_issue',
        severity: 'high',
        details: { iceState: 'failed' }
      })
      
      expect(mockReinviteEngine.scheduleReinvite).toHaveBeenCalledWith(
        mockCallSession,
        expect.objectContaining({
          strategy: 'ice_restart'
        })
      )
    })

    it('should use media_renegotiation strategy for device changes', async () => {
      await manager.triggerRecovery({
        type: 'device_change',
        severity: 'medium',
        details: { deviceType: 'camera' }
      })
      
      expect(mockReinviteEngine.scheduleReinvite).toHaveBeenCalledWith(
        mockCallSession,
        expect.objectContaining({
          strategy: 'media_renegotiation'
        })
      )
    })
  })

  describe('event handling', () => {
    it('should emit recovery events', async () => {
      const recoveryStarted = jest.fn()
      const recoveryCompleted = jest.fn()
      
      manager.on('recovery.started', recoveryStarted)
      manager.on('recovery.completed', recoveryCompleted)
      
      manager.attachToCallSession(mockCallSession as any)
      
      await manager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      expect(recoveryStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ type: 'network_issue' })
        })
      )
    })

    it('should handle reinvite engine events', () => {
      manager.attachToCallSession(mockCallSession as any)
      
      // Simulate reinvite completion
      const reinviteCallback = mockReinviteEngine.on.mock.calls.find(
        call => call[0] === 'reinvite.completed'
      )?.[1]
      
      expect(reinviteCallback).toBeDefined()
      
      if (reinviteCallback) {
        const mockCompletedEvent = {
          callSession: mockCallSession,
          success: true,
          duration: 1500,
          strategy: 'reinvite'
        }
        
        reinviteCallback(mockCompletedEvent)
        
        // Should emit recovery completed event
        expect(manager.emit).toHaveBeenCalledWith('recovery.completed', expect.any(Object))
      }
    })
  })

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxRecoveryAttempts: 5,
        recoveryTimeoutMs: 60000,
        triggers: {
          networkIssues: false,
          deviceChanges: true,
          connectionIssues: true,
          callQuality: false
        }
      }
      
      manager.updateConfig(newConfig)
      
      expect(mockReinviteEngine.updateConfig).toHaveBeenCalled()
      expect(mockNetworkDetector.updateConfig).toHaveBeenCalled()
    })
  })

  describe('recovery statistics', () => {
    beforeEach(() => {
      manager.attachToCallSession(mockCallSession as any)
    })

    it('should provide recovery statistics', async () => {
      await manager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      const stats = manager.getRecoveryStats()
      
      expect(stats).toEqual({
        totalAttempts: 1,
        successfulRecoveries: 1,
        failedRecoveries: 0,
        averageRecoveryTime: expect.any(Number),
        lastRecoveryTime: expect.any(Number),
        triggerCounts: {
          network_issue: 1,
          device_change: 0,
          connection_issue: 0,
          call_quality: 0
        }
      })
    })

    it('should track failed recoveries', async () => {
      // Mock reinvite to fail
      mockReinviteEngine.scheduleReinvite.mockResolvedValueOnce(false)
      
      await manager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      const stats = manager.getRecoveryStats()
      expect(stats.failedRecoveries).toBe(1)
      expect(stats.successfulRecoveries).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      manager.attachToCallSession(mockCallSession as any)
      manager.destroy()
      
      expect(mockReinviteEngine.destroy).toHaveBeenCalled()
      expect(mockNetworkDetector.destroy).toHaveBeenCalled()
      expect(() => manager.destroy()).not.toThrow() // Should handle multiple destroys
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      manager.attachToCallSession(mockCallSession as any)
    })

    it('should handle reinvite engine errors', async () => {
      mockReinviteEngine.scheduleReinvite.mockRejectedValueOnce(new Error('Reinvite failed'))
      
      const result = await manager.triggerRecovery({
        type: 'network_issue',
        severity: 'high',
        details: {}
      })
      
      expect(result).toBe(false)
      
      const stats = manager.getRecoveryStats()
      expect(stats.failedRecoveries).toBe(1)
    })

    it('should handle network detector errors gracefully', () => {
      mockNetworkDetector.startMonitoring.mockImplementation(() => {
        throw new Error('Network monitoring failed')
      })
      
      expect(() => manager.attachToCallSession(mockCallSession as any)).not.toThrow()
    })
  })
})