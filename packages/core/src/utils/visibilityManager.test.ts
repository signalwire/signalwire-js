/**
 * Unit tests for VisibilityManager
 * 
 * Tests page visibility detection, optimization coordination,
 * and resource management strategies.
 */

import { VisibilityManager } from './visibilityManager'

// Mock Page Visibility API
Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false
})
Object.defineProperty(document, 'visibilityState', {
  writable: true,
  value: 'visible'
})

// Mock event listeners
const mockEventListeners: { [key: string]: Function[] } = {}
const originalAddEventListener = document.addEventListener
const originalRemoveEventListener = document.removeEventListener

document.addEventListener = jest.fn((event: string, callback: Function) => {
  if (!mockEventListeners[event]) {
    mockEventListeners[event] = []
  }
  mockEventListeners[event].push(callback)
})

document.removeEventListener = jest.fn((event: string, callback: Function) => {
  if (mockEventListeners[event]) {
    const index = mockEventListeners[event].indexOf(callback)
    if (index > -1) {
      mockEventListeners[event].splice(index, 1)
    }
  }
})

// Helper to simulate visibility change
const simulateVisibilityChange = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { value: hidden })
  Object.defineProperty(document, 'visibilityState', { 
    value: hidden ? 'hidden' : 'visible' 
  })
  
  if (mockEventListeners['visibilitychange']) {
    mockEventListeners['visibilitychange'].forEach(callback => callback())
  }
}

describe('VisibilityManager', () => {
  let manager: VisibilityManager
  
  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(mockEventListeners).forEach(key => {
      mockEventListeners[key] = []
    })
    
    // Reset document state
    Object.defineProperty(document, 'hidden', { value: false })
    Object.defineProperty(document, 'visibilityState', { value: 'visible' })
    
    manager = new VisibilityManager({
      enabled: true,
      optimizeOnHidden: true,
      resumeOnVisible: true,
      hiddenTimeout: 1000
    })
  })
  
  afterEach(() => {
    manager.destroy()
  })

  describe('initialization', () => {
    it('should create manager with default config', () => {
      const defaultManager = new VisibilityManager()
      expect(defaultManager).toBeInstanceOf(VisibilityManager)
      defaultManager.destroy()
    })

    it('should create manager with custom config', () => {
      const config = {
        enabled: false,
        optimizeOnHidden: false,
        resumeOnVisible: false,
        hiddenTimeout: 5000
      }
      const customManager = new VisibilityManager(config)
      expect(customManager).toBeInstanceOf(VisibilityManager)
      customManager.destroy()
    })

    it('should set up visibility change listener', () => {
      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
    })
  })

  describe('visibility detection', () => {
    it('should detect initial visibility state', () => {
      expect(manager.isVisible()).toBe(true)
    })

    it('should detect when page becomes hidden', async () => {
      let visibilityChanged = false
      manager.on('visibility.changed', (isVisible) => {
        visibilityChanged = true
        expect(isVisible).toBe(false)
      })

      simulateVisibilityChange(true)

      expect(visibilityChanged).toBe(true)
      expect(manager.isVisible()).toBe(false)
    })

    it('should detect when page becomes visible', async () => {
      // First make it hidden
      simulateVisibilityChange(true)
      expect(manager.isVisible()).toBe(false)

      let visibilityChanged = false
      manager.on('visibility.changed', (isVisible) => {
        visibilityChanged = true
        expect(isVisible).toBe(true)
      })

      simulateVisibilityChange(false)

      expect(visibilityChanged).toBe(true)
      expect(manager.isVisible()).toBe(true)
    })
  })

  describe('optimization management', () => {
    let mockOptimization: any

    beforeEach(() => {
      mockOptimization = {
        id: 'test-optimization',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(false)
      }
    })

    it('should add optimization', () => {
      manager.addOptimization(mockOptimization)
      
      expect(() => manager.addOptimization(mockOptimization)).not.toThrow()
    })

    it('should remove optimization', () => {
      manager.addOptimization(mockOptimization)
      manager.removeOptimization('test-optimization')
      
      expect(() => manager.removeOptimization('test-optimization')).not.toThrow()
    })

    it('should optimize when page becomes hidden', async () => {
      manager.addOptimization(mockOptimization)
      
      simulateVisibilityChange(true)
      
      // Wait for hidden timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      expect(mockOptimization.optimize).toHaveBeenCalled()
    })

    it('should restore when page becomes visible', async () => {
      manager.addOptimization(mockOptimization)
      mockOptimization.isOptimized.mockReturnValue(true)
      
      // First make it hidden and optimized
      simulateVisibilityChange(true)
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Then make it visible
      simulateVisibilityChange(false)
      
      expect(mockOptimization.restore).toHaveBeenCalled()
    })

    it('should respect hidden timeout', async () => {
      const shortTimeoutManager = new VisibilityManager({
        hiddenTimeout: 100
      })
      
      shortTimeoutManager.addOptimization(mockOptimization)
      
      simulateVisibilityChange(true)
      
      // Should not optimize immediately
      expect(mockOptimization.optimize).not.toHaveBeenCalled()
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockOptimization.optimize).toHaveBeenCalled()
      
      shortTimeoutManager.destroy()
    })

    it('should cancel optimization if page becomes visible before timeout', async () => {
      manager.addOptimization(mockOptimization)
      
      simulateVisibilityChange(true)
      
      // Make visible again before timeout
      setTimeout(() => simulateVisibilityChange(false), 500)
      
      // Wait past original timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      expect(mockOptimization.optimize).not.toHaveBeenCalled()
    })

    it('should handle optimization errors gracefully', async () => {
      mockOptimization.optimize.mockRejectedValue(new Error('Optimization failed'))
      
      manager.addOptimization(mockOptimization)
      
      simulateVisibilityChange(true)
      
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Should not crash the manager
      expect(manager.isVisible()).toBe(false)
    })

    it('should handle restoration errors gracefully', async () => {
      mockOptimization.restore.mockRejectedValue(new Error('Restoration failed'))
      mockOptimization.isOptimized.mockReturnValue(true)
      
      manager.addOptimization(mockOptimization)
      
      simulateVisibilityChange(false)
      
      // Should not crash the manager
      expect(manager.isVisible()).toBe(true)
    })
  })

  describe('manual optimization control', () => {
    let mockOptimization: any

    beforeEach(() => {
      mockOptimization = {
        id: 'manual-test',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(false)
      }
      manager.addOptimization(mockOptimization)
    })

    it('should manually optimize', async () => {
      await manager.optimize()
      
      expect(mockOptimization.optimize).toHaveBeenCalled()
    })

    it('should manually restore', async () => {
      mockOptimization.isOptimized.mockReturnValue(true)
      
      await manager.restore()
      
      expect(mockOptimization.restore).toHaveBeenCalled()
    })

    it('should check if optimized', () => {
      expect(manager.isOptimized()).toBe(false)
      
      mockOptimization.isOptimized.mockReturnValue(true)
      expect(manager.isOptimized()).toBe(true)
    })

    it('should only optimize when possible', async () => {
      mockOptimization.canOptimize.mockReturnValue(false)
      
      await manager.optimize()
      
      expect(mockOptimization.optimize).not.toHaveBeenCalled()
    })
  })

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        optimizeOnHidden: false,
        resumeOnVisible: false,
        hiddenTimeout: 5000
      }
      
      manager.updateConfig(newConfig)
      
      expect(() => manager.updateConfig(newConfig)).not.toThrow()
    })

    it('should respect disabled optimization on hidden after config update', async () => {
      const mockOptimization = {
        id: 'config-test',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(false)
      }
      
      manager.addOptimization(mockOptimization)
      
      // Disable optimization on hidden
      manager.updateConfig({ optimizeOnHidden: false })
      
      simulateVisibilityChange(true)
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      expect(mockOptimization.optimize).not.toHaveBeenCalled()
    })
  })

  describe('event handling', () => {
    it('should emit visibility changed events', () => {
      const visibilityCallback = jest.fn()
      manager.on('visibility.changed', visibilityCallback)
      
      simulateVisibilityChange(true)
      
      expect(visibilityCallback).toHaveBeenCalledWith(false)
    })

    it('should emit optimization events', async () => {
      const optimizationStarted = jest.fn()
      const optimizationCompleted = jest.fn()
      
      manager.on('optimization.started', optimizationStarted)
      manager.on('optimization.completed', optimizationCompleted)
      
      const mockOptimization = {
        id: 'event-test',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(false)
      }
      
      manager.addOptimization(mockOptimization)
      
      await manager.optimize()
      
      expect(optimizationStarted).toHaveBeenCalled()
      expect(optimizationCompleted).toHaveBeenCalled()
    })

    it('should emit restoration events', async () => {
      const restorationStarted = jest.fn()
      const restorationCompleted = jest.fn()
      
      manager.on('restoration.started', restorationStarted)
      manager.on('restoration.completed', restorationCompleted)
      
      const mockOptimization = {
        id: 'restore-event-test',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(true)
      }
      
      manager.addOptimization(mockOptimization)
      
      await manager.restore()
      
      expect(restorationStarted).toHaveBeenCalled()
      expect(restorationCompleted).toHaveBeenCalled()
    })

    it('should remove event listeners', () => {
      const callback = jest.fn()
      
      manager.on('visibility.changed', callback)
      manager.off('visibility.changed', callback)
      
      simulateVisibilityChange(true)
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('state management', () => {
    it('should provide visibility state', () => {
      expect(manager.isVisible()).toBe(true)
      
      simulateVisibilityChange(true)
      expect(manager.isVisible()).toBe(false)
    })

    it('should provide optimization state', () => {
      expect(manager.isOptimized()).toBe(false)
      
      const mockOptimization = {
        id: 'state-test',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(true)
      }
      
      manager.addOptimization(mockOptimization)
      expect(manager.isOptimized()).toBe(true)
    })
  })

  describe('browser compatibility', () => {
    it('should handle missing Page Visibility API', () => {
      // Mock missing API
      const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden')
      const originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState')
      
      delete (document as any).hidden
      delete (document as any).visibilityState
      
      const fallbackManager = new VisibilityManager()
      
      // Should assume visible when API is not available
      expect(fallbackManager.isVisible()).toBe(true)
      
      fallbackManager.destroy()
      
      // Restore properties
      if (originalHidden) {
        Object.defineProperty(document, 'hidden', originalHidden)
      }
      if (originalVisibilityState) {
        Object.defineProperty(document, 'visibilityState', originalVisibilityState)
      }
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const mockOptimization = {
        id: 'cleanup-test',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(false)
      }
      
      manager.addOptimization(mockOptimization)
      manager.destroy()
      
      expect(document.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
      
      expect(() => manager.destroy()).not.toThrow() // Should handle multiple destroys
    })

    it('should clear timeouts on destroy', async () => {
      const mockOptimization = {
        id: 'timeout-cleanup-test',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(false)
      }
      
      manager.addOptimization(mockOptimization)
      
      simulateVisibilityChange(true)
      manager.destroy()
      
      // Wait past timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      expect(mockOptimization.optimize).not.toHaveBeenCalled()
    })
  })

  describe('disabled manager', () => {
    it('should not listen to visibility changes when disabled', () => {
      const disabledManager = new VisibilityManager({ enabled: false })
      
      expect(document.addEventListener).not.toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
      
      disabledManager.destroy()
    })

    it('should still allow manual optimization when disabled', async () => {
      const disabledManager = new VisibilityManager({ enabled: false })
      
      const mockOptimization = {
        id: 'disabled-test',
        optimize: jest.fn().mockResolvedValue(undefined),
        restore: jest.fn().mockResolvedValue(undefined),
        canOptimize: jest.fn().mockReturnValue(true),
        isOptimized: jest.fn().mockReturnValue(false)
      }
      
      disabledManager.addOptimization(mockOptimization)
      await disabledManager.optimize()
      
      expect(mockOptimization.optimize).toHaveBeenCalled()
      
      disabledManager.destroy()
    })
  })
})

// Restore original methods
afterAll(() => {
  document.addEventListener = originalAddEventListener
  document.removeEventListener = originalRemoveEventListener
})