/**
 * Unit tests for UserExperienceManager
 * 
 * Tests the unified user experience management interface that integrates
 * visibility management, resource optimization, mobile video handling,
 * and fullscreen management.
 */

import { UserExperienceManager } from './userExperienceManager'

// Mock dependencies
jest.mock('@signalwire/core', () => ({
  VisibilityManager: jest.fn(),
  ResourceOptimizer: jest.fn(),
  getLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  })
}))

jest.mock('./mobileVideoManager', () => ({
  MobileVideoManager: jest.fn()
}))

jest.mock('./fullscreenManager', () => ({
  FullscreenManager: jest.fn()
}))

import { VisibilityManager, ResourceOptimizer } from '@signalwire/core'
import { MobileVideoManager } from './mobileVideoManager'
import { FullscreenManager } from './fullscreenManager'

const MockVisibilityManager = VisibilityManager as jest.MockedClass<typeof VisibilityManager>
const MockResourceOptimizer = ResourceOptimizer as jest.MockedClass<typeof ResourceOptimizer>
const MockMobileVideoManager = MobileVideoManager as jest.MockedClass<typeof MobileVideoManager>
const MockFullscreenManager = FullscreenManager as jest.MockedClass<typeof FullscreenManager>

// Mock window object for browser environment
Object.defineProperty(global, 'window', {
  value: {
    innerWidth: 1024,
    innerHeight: 768
  },
  writable: true
})

describe('UserExperienceManager', () => {
  let manager: UserExperienceManager
  let mockVisibilityManager: jest.Mocked<VisibilityManager>
  let mockResourceOptimizer: jest.Mocked<ResourceOptimizer>
  let mockMobileVideoManager: jest.Mocked<MobileVideoManager>
  let mockFullscreenManager: jest.Mocked<FullscreenManager>
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mocks
    mockVisibilityManager = {
      addOptimization: jest.fn(),
      removeOptimization: jest.fn(),
      isVisible: jest.fn().mockReturnValue(true),
      isOptimized: jest.fn().mockReturnValue(false),
      updateConfig: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any
    
    mockResourceOptimizer = {
      getState: jest.fn().mockReturnValue({
        media: { pausedVideoElements: [] }
      }),
      updateContext: jest.fn(),
      getAllOptimizations: jest.fn().mockReturnValue([]),
      updateConfig: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any
    
    mockMobileVideoManager = {
      manageVideoElement: jest.fn(),
      unmanageVideoElement: jest.fn(),
      shouldUseMobileLayout: jest.fn().mockReturnValue(false),
      enterFullscreen: jest.fn().mockResolvedValue(true),
      getState: jest.fn().mockReturnValue({ isFullscreen: false }),
      updateConfig: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any
    
    mockFullscreenManager = {
      enterFullscreen: jest.fn().mockResolvedValue(true),
      exitFullscreen: jest.fn().mockResolvedValue(true),
      isFullscreen: jest.fn().mockReturnValue(false),
      updateConfig: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any
    
    MockVisibilityManager.mockImplementation(() => mockVisibilityManager)
    MockResourceOptimizer.mockImplementation(() => mockResourceOptimizer)
    MockMobileVideoManager.mockImplementation(() => mockMobileVideoManager)
    MockFullscreenManager.mockImplementation(() => mockFullscreenManager)
  })
  
  afterEach(() => {
    if (manager) {
      manager.destroy()
    }
  })

  describe('initialization', () => {
    it('should create manager with default config', () => {
      manager = new UserExperienceManager()
      expect(manager).toBeInstanceOf(UserExperienceManager)
    })

    it('should create manager with custom config', () => {
      const config = {
        enabled: false,
        autoSetup: false,
        smartDefaults: false,
        visibility: { enabled: false },
        resourceOptimization: { enableMediaOptimization: false },
        mobileVideo: { enabled: false },
        fullscreen: { enabled: false }
      }
      
      manager = new UserExperienceManager(config)
      expect(manager).toBeInstanceOf(UserExperienceManager)
    })

    it('should initialize all managers when enabled', () => {
      manager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: true },
        mobileVideo: { enabled: true },
        fullscreen: { enabled: true }
      })
      
      expect(MockVisibilityManager).toHaveBeenCalled()
      expect(MockResourceOptimizer).toHaveBeenCalled()
      expect(MockMobileVideoManager).toHaveBeenCalled()
      expect(MockFullscreenManager).toHaveBeenCalled()
    })

    it('should not initialize when disabled', () => {
      manager = new UserExperienceManager({ enabled: false })
      
      // Should still create instance but not initialize managers
      expect(manager).toBeInstanceOf(UserExperienceManager)
    })

    it('should skip initialization in non-browser environment', () => {
      const originalWindow = global.window
      delete (global as any).window
      
      manager = new UserExperienceManager({ enabled: true })
      
      expect(manager).toBeInstanceOf(UserExperienceManager)
      
      // Restore window
      global.window = originalWindow
    })
  })

  describe('video element management', () => {
    beforeEach(() => {
      manager = new UserExperienceManager({
        enabled: true,
        mobileVideo: { enabled: true },
        fullscreen: { enabled: true }
      })
    })

    it('should manage video element with all features', () => {
      const videoElement = document.createElement('video') as HTMLVideoElement
      const container = document.createElement('div')
      
      manager.manageVideoElement(videoElement, container)
      
      expect(mockMobileVideoManager.manageVideoElement).toHaveBeenCalledWith(videoElement, container)
      expect(mockResourceOptimizer.updateContext).toHaveBeenCalledWith({
        videoElements: [videoElement]
      })
    })

    it('should manage video element with selective features', () => {
      const videoElement = document.createElement('video') as HTMLVideoElement
      
      manager.manageVideoElement(videoElement, undefined, {
        enableMobile: false,
        enableFullscreen: true,
        enableOptimization: false
      })
      
      expect(mockMobileVideoManager.manageVideoElement).not.toHaveBeenCalled()
      expect(mockResourceOptimizer.updateContext).not.toHaveBeenCalled()
    })

    it('should unmanage video element', () => {
      const videoElement = document.createElement('video') as HTMLVideoElement
      
      manager.unmanageVideoElement(videoElement)
      
      expect(mockMobileVideoManager.unmanageVideoElement).toHaveBeenCalledWith(videoElement)
    })

    it('should handle missing managers gracefully', () => {
      const disabledManager = new UserExperienceManager({
        enabled: true,
        mobileVideo: { enabled: false }
      })
      
      const videoElement = document.createElement('video') as HTMLVideoElement
      
      expect(() => disabledManager.manageVideoElement(videoElement)).not.toThrow()
      
      disabledManager.destroy()
    })
  })

  describe('media stream management', () => {
    beforeEach(() => {
      manager = new UserExperienceManager({ enabled: true })
    })

    it('should add media streams to optimization context', () => {
      const mockStream = new MediaStream()
      const streams = [mockStream]
      
      manager.addMediaStreams(streams)
      
      expect(mockResourceOptimizer.updateContext).toHaveBeenCalledWith({
        mediaStreams: streams
      })
    })

    it('should handle empty stream array', () => {
      manager.addMediaStreams([])
      
      expect(mockResourceOptimizer.updateContext).toHaveBeenCalledWith({
        mediaStreams: []
      })
    })
  })

  describe('fullscreen management', () => {
    beforeEach(() => {
      manager = new UserExperienceManager({
        enabled: true,
        mobileVideo: { enabled: true },
        fullscreen: { enabled: true }
      })
    })

    it('should prioritize mobile video manager for fullscreen', async () => {
      mockMobileVideoManager.shouldUseMobileLayout.mockReturnValue(true)
      mockMobileVideoManager.enterFullscreen.mockResolvedValue(true)
      
      const videoElement = document.createElement('video') as HTMLVideoElement
      const result = await manager.enterFullscreen(videoElement)
      
      expect(result).toBe(true)
      expect(mockMobileVideoManager.enterFullscreen).toHaveBeenCalledWith(videoElement)
      expect(mockFullscreenManager.enterFullscreen).not.toHaveBeenCalled()
    })

    it('should fallback to fullscreen manager', async () => {
      mockMobileVideoManager.shouldUseMobileLayout.mockReturnValue(false)
      mockFullscreenManager.enterFullscreen.mockResolvedValue(true)
      
      const videoElement = document.createElement('video') as HTMLVideoElement
      const result = await manager.enterFullscreen(videoElement)
      
      expect(result).toBe(true)
      expect(mockMobileVideoManager.enterFullscreen).not.toHaveBeenCalled()
      expect(mockFullscreenManager.enterFullscreen).toHaveBeenCalledWith(videoElement)
    })

    it('should fallback when mobile fullscreen fails', async () => {
      mockMobileVideoManager.shouldUseMobileLayout.mockReturnValue(true)
      mockMobileVideoManager.enterFullscreen.mockResolvedValue(false)
      mockFullscreenManager.enterFullscreen.mockResolvedValue(true)
      
      const videoElement = document.createElement('video') as HTMLVideoElement
      const result = await manager.enterFullscreen(videoElement)
      
      expect(result).toBe(true)
      expect(mockMobileVideoManager.enterFullscreen).toHaveBeenCalled()
      expect(mockFullscreenManager.enterFullscreen).toHaveBeenCalled()
    })

    it('should exit fullscreen', async () => {
      mockFullscreenManager.exitFullscreen.mockResolvedValue(true)
      
      const result = await manager.exitFullscreen()
      
      expect(result).toBe(true)
      expect(mockFullscreenManager.exitFullscreen).toHaveBeenCalled()
    })

    it('should handle mobile fullscreen exit', async () => {
      mockMobileVideoManager.getState.mockReturnValue({ isFullscreen: true })
      
      const result = await manager.exitFullscreen()
      
      expect(result).toBe(true)
    })
  })

  describe('state management', () => {
    beforeEach(() => {
      manager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: true },
        mobileVideo: { enabled: true },
        fullscreen: { enabled: true }
      })
    })

    it('should provide comprehensive state', () => {
      mockVisibilityManager.isVisible.mockReturnValue(true)
      mockVisibilityManager.isOptimized.mockReturnValue(false)
      mockFullscreenManager.isFullscreen.mockReturnValue(false)
      mockMobileVideoManager.shouldUseMobileLayout.mockReturnValue(true)
      mockMobileVideoManager.getState.mockReturnValue({ isFullscreen: false })
      
      const state = manager.getState()
      
      expect(state).toEqual({
        isVisible: true,
        isOptimized: false,
        isFullscreen: false,
        isMobile: true,
        activeManagers: ['visibility', 'resource-optimization', 'mobile-video', 'fullscreen']
      })
    })

    it('should handle missing managers in state', () => {
      const minimalManager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: false },
        mobileVideo: { enabled: false },
        fullscreen: { enabled: false }
      })
      
      const state = minimalManager.getState()
      
      expect(state.isVisible).toBe(true) // Default when manager is missing
      expect(state.isMobile).toBe(false) // Default when manager is missing
      expect(state.activeManagers).toEqual(['resource-optimization'])
      
      minimalManager.destroy()
    })

    it('should list active managers', () => {
      const activeManagers = manager.getActiveManagers()
      
      expect(activeManagers).toContain('visibility')
      expect(activeManagers).toContain('resource-optimization')
      expect(activeManagers).toContain('mobile-video')
      expect(activeManagers).toContain('fullscreen')
    })
  })

  describe('configuration updates', () => {
    beforeEach(() => {
      manager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: true },
        mobileVideo: { enabled: true },
        fullscreen: { enabled: true }
      })
    })

    it('should update all manager configurations', () => {
      const newConfig = {
        visibility: { hiddenTimeout: 10000 },
        resourceOptimization: { enableMediaOptimization: false },
        mobileVideo: { autoFullscreen: false },
        fullscreen: { showControls: false }
      }
      
      manager.updateConfig(newConfig)
      
      expect(mockVisibilityManager.updateConfig).toHaveBeenCalledWith(newConfig.visibility)
      expect(mockResourceOptimizer.updateConfig).toHaveBeenCalledWith(newConfig.resourceOptimization)
      expect(mockMobileVideoManager.updateConfig).toHaveBeenCalledWith(newConfig.mobileVideo)
      expect(mockFullscreenManager.updateConfig).toHaveBeenCalledWith(newConfig.fullscreen)
    })

    it('should handle partial configuration updates', () => {
      const newConfig = {
        visibility: { hiddenTimeout: 5000 }
      }
      
      manager.updateConfig(newConfig)
      
      expect(mockVisibilityManager.updateConfig).toHaveBeenCalledWith(newConfig.visibility)
      expect(mockResourceOptimizer.updateConfig).not.toHaveBeenCalled()
    })

    it('should handle missing managers during config update', () => {
      const minimalManager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: false }
      })
      
      expect(() => minimalManager.updateConfig({
        visibility: { hiddenTimeout: 1000 }
      })).not.toThrow()
      
      minimalManager.destroy()
    })
  })

  describe('event handling', () => {
    beforeEach(() => {
      manager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: true },
        mobileVideo: { enabled: true },
        fullscreen: { enabled: true }
      })
    })

    it('should register event listeners', () => {
      const callback = jest.fn()
      
      manager.on('ux.visibility.changed', callback)
      
      expect(() => manager.on('ux.visibility.changed', callback)).not.toThrow()
    })

    it('should remove event listeners', () => {
      const callback = jest.fn()
      
      manager.on('ux.fullscreen.changed', callback)
      manager.off('ux.fullscreen.changed', callback)
      
      expect(() => manager.off('ux.fullscreen.changed', callback)).not.toThrow()
    })

    it('should integrate with visibility manager events', () => {
      // Simulate visibility manager event setup
      const visibilityCallback = mockVisibilityManager.on.mock.calls.find(
        call => call[0] === 'visibility.changed'
      )?.[1]
      
      expect(visibilityCallback).toBeDefined()
      
      if (visibilityCallback) {
        const uxCallback = jest.fn()
        manager.on('ux.visibility.changed', uxCallback)
        
        visibilityCallback(false)
        
        // Should forward the event
        expect(uxCallback).toHaveBeenCalledWith(false)
      }
    })

    it('should integrate with mobile video manager events', () => {
      const fullscreenCallback = mockMobileVideoManager.on.mock.calls.find(
        call => call[0] === 'fullscreen.entered'
      )?.[1]
      
      expect(fullscreenCallback).toBeDefined()
      
      if (fullscreenCallback) {
        const uxCallback = jest.fn()
        manager.on('ux.fullscreen.changed', uxCallback)
        
        fullscreenCallback()
        
        expect(uxCallback).toHaveBeenCalledWith(true)
      }
    })

    it('should handle event listener errors gracefully', () => {
      const callback = jest.fn().mockImplementation(() => {
        throw new Error('Event handler error')
      })
      
      manager.on('ux.visibility.changed', callback)
      
      // Should not crash when emitting events
      expect(() => manager.emit('ux.visibility.changed', true)).not.toThrow()
    })
  })

  describe('resource optimization integration', () => {
    beforeEach(() => {
      manager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: true }
      })
    })

    it('should integrate optimizations with visibility manager', () => {
      mockResourceOptimizer.getAllOptimizations.mockReturnValue([
        { id: 'media-optimization' },
        { id: 'network-optimization' }
      ])
      
      // Should add optimizations to visibility manager
      expect(mockVisibilityManager.addOptimization).toHaveBeenCalledTimes(2)
    })
  })

  describe('cleanup', () => {
    beforeEach(() => {
      manager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: true },
        mobileVideo: { enabled: true },
        fullscreen: { enabled: true }
      })
    })

    it('should destroy all managers', () => {
      manager.destroy()
      
      expect(mockVisibilityManager.destroy).toHaveBeenCalled()
      expect(mockMobileVideoManager.destroy).toHaveBeenCalled()
      expect(mockFullscreenManager.destroy).toHaveBeenCalled()
    })

    it('should clear event listeners', () => {
      const callback = jest.fn()
      manager.on('ux.visibility.changed', callback)
      
      manager.destroy()
      
      // Event listeners should be cleared
      expect(() => manager.destroy()).not.toThrow() // Should handle multiple destroys
    })

    it('should handle partial cleanup', () => {
      const partialManager = new UserExperienceManager({
        enabled: true,
        visibility: { enabled: true },
        mobileVideo: { enabled: false }
      })
      
      expect(() => partialManager.destroy()).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle initialization errors gracefully', () => {
      MockVisibilityManager.mockImplementation(() => {
        throw new Error('Visibility manager initialization failed')
      })
      
      expect(() => {
        manager = new UserExperienceManager({
          enabled: true,
          visibility: { enabled: true }
        })
      }).not.toThrow()
    })

    it('should handle manager method errors', async () => {
      manager = new UserExperienceManager({
        enabled: true,
        fullscreen: { enabled: true }
      })
      
      mockFullscreenManager.enterFullscreen.mockRejectedValue(new Error('Fullscreen failed'))
      
      const videoElement = document.createElement('video') as HTMLVideoElement
      const result = await manager.enterFullscreen(videoElement)
      
      // Should handle error gracefully and return false
      expect(result).toBe(false)
    })
  })

  describe('ready event', () => {
    it('should emit ready event after initialization', () => {
      const readyCallback = jest.fn()
      
      manager = new UserExperienceManager({ enabled: true })
      manager.on('ux.ready', readyCallback)
      
      // Initialize should trigger ready event
      expect(readyCallback).toHaveBeenCalled()
    })
  })
})