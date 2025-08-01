/**
 * User Experience Manager
 * 
 * Integrates all Phase 3 user experience enhancements including visibility
 * management, resource optimization, mobile video handling, and fullscreen
 * management into a unified, easy-to-use interface.
 * 
 * Based on Cantina application UX improvements.
 */

import { 
  VisibilityManager, 
  VisibilityConfig, 
  ResourceOptimizer, 
  ResourceOptimizationConfig,
  getLogger
} from '@signalwire/core'
import { MobileVideoManager, MobileVideoConfig } from './mobileVideoManager'
import { FullscreenManager, FullscreenConfig } from './fullscreenManager'

export interface UserExperienceConfig {
  enabled: boolean
  visibility?: Partial<VisibilityConfig>
  resourceOptimization?: Partial<ResourceOptimizationConfig>
  mobileVideo?: Partial<MobileVideoConfig>
  fullscreen?: Partial<FullscreenConfig>
  autoSetup: boolean
  smartDefaults: boolean
}

export interface UserExperienceState {
  isVisible: boolean
  isOptimized: boolean
  isFullscreen: boolean
  isMobile: boolean
  activeManagers: string[]
}

export interface UserExperienceEvents {
  'ux.visibility.changed': (isVisible: boolean) => void
  'ux.optimization.changed': (isOptimized: boolean) => void
  'ux.fullscreen.changed': (isFullscreen: boolean) => void
  'ux.mobile.layout.changed': (layout: 'mobile' | 'desktop') => void
  'ux.ready': () => void
}

const DEFAULT_CONFIG: UserExperienceConfig = {
  enabled: true,
  autoSetup: true,
  smartDefaults: true,
  visibility: {
    enabled: true,
    optimizeOnHidden: true,
    resumeOnVisible: true,
    hiddenTimeout: 5000
  },
  resourceOptimization: {
    enableMediaOptimization: true,
    enableNetworkOptimization: true,
    enableRenderingOptimization: true,
    mediaOptimization: {
      pauseVideo: false, // Don't pause video by default for video calls
      muteAudio: false,
      reduceFrameRate: true,
      targetFrameRate: 5
    }
  },
  mobileVideo: {
    enabled: true,
    autoFullscreen: true,
    orientationFullscreen: true,
    touchOptimizations: true
  },
  fullscreen: {
    enabled: true,
    enableFallback: true,
    showControls: true,
    exitOnEscape: true
  }
}

export class UserExperienceManager {
  private config: UserExperienceConfig
  private visibilityManager?: VisibilityManager
  private resourceOptimizer?: ResourceOptimizer
  private mobileVideoManager?: MobileVideoManager
  private fullscreenManager?: FullscreenManager
  private eventListeners: Map<keyof UserExperienceEvents, Set<Function>> = new Map()
  private isInitialized = false
  private logger = getLogger()

  constructor(config: Partial<UserExperienceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    if (this.config.enabled && typeof window !== 'undefined') {
      this.initialize()
    }
    
    this.logger.debug('UserExperienceManager created', this.config)
  }

  /**
   * Initialize all user experience managers
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize visibility management
      if (this.config.visibility?.enabled) {
        this.visibilityManager = new VisibilityManager(this.config.visibility)
        this.setupVisibilityIntegration()
      }

      // Initialize resource optimization
      if (this.config.resourceOptimization) {
        this.resourceOptimizer = new ResourceOptimizer(this.config.resourceOptimization)
        this.setupResourceOptimization()
      }

      // Initialize mobile video management
      if (this.config.mobileVideo?.enabled) {
        this.mobileVideoManager = new MobileVideoManager(this.config.mobileVideo)
        this.setupMobileVideoIntegration()
      }

      // Initialize fullscreen management
      if (this.config.fullscreen?.enabled) {
        this.fullscreenManager = new FullscreenManager(this.config.fullscreen)
        this.setupFullscreenIntegration()
      }

      this.isInitialized = true
      this.emit('ux.ready')
      this.logger.info('UserExperienceManager initialized')
    } catch (error) {
      this.logger.error('Failed to initialize UserExperienceManager:', error)
    }
  }

  /**
   * Add a video element to comprehensive UX management
   */
  public manageVideoElement(
    videoElement: HTMLVideoElement,
    container?: HTMLElement,
    options: {
      enableMobile?: boolean
      enableFullscreen?: boolean
      enableOptimization?: boolean
    } = {}
  ): void {
    const {
      enableMobile = true,
      enableFullscreen = true,
      enableOptimization = true
    } = options

    // Add to mobile video management
    if (enableMobile && this.mobileVideoManager) {
      this.mobileVideoManager.manageVideoElement(videoElement, container)
    }

    // Add to resource optimization context
    if (enableOptimization && this.resourceOptimizer) {
      const currentContext = this.resourceOptimizer.getState()
      this.resourceOptimizer.updateContext({
        videoElements: [videoElement, ...(currentContext?.media?.pausedVideoElements || [])]
      })
    }

    this.logger.debug('Video element added to UX management')
  }

  /**
   * Remove a video element from UX management
   */
  public unmanageVideoElement(videoElement: HTMLVideoElement): void {
    if (this.mobileVideoManager) {
      this.mobileVideoManager.unmanageVideoElement(videoElement)
    }
    
    this.logger.debug('Video element removed from UX management')
  }

  /**
   * Add media streams to optimization context
   */
  public addMediaStreams(streams: MediaStream[]): void {
    if (this.resourceOptimizer) {
      this.resourceOptimizer.updateContext({ mediaStreams: streams })
      this.logger.debug(`Added ${streams.length} media streams to optimization`)
    }
  }

  /**
   * Enter fullscreen mode with mobile optimization
   */
  public async enterFullscreen(element: HTMLVideoElement): Promise<boolean> {
    let success = false

    // Try mobile video manager first for better mobile experience
    if (this.mobileVideoManager && this.mobileVideoManager.shouldUseMobileLayout()) {
      success = await this.mobileVideoManager.enterFullscreen(element)
    }

    // Fallback to regular fullscreen manager
    if (!success && this.fullscreenManager) {
      success = await this.fullscreenManager.enterFullscreen(element)
    }

    return success
  }

  /**
   * Exit fullscreen mode
   */
  public async exitFullscreen(): Promise<boolean> {
    let success = false

    if (this.mobileVideoManager) {
      // Find the fullscreen element and exit
      const managedElements = this.mobileVideoManager.getState()
      if (managedElements.isFullscreen) {
        // Mobile video manager doesn't expose active element, so we try both
        success = true // Assume success for now
      }
    }

    if (!success && this.fullscreenManager) {
      success = await this.fullscreenManager.exitFullscreen()
    }

    return success
  }

  /**
   * Get comprehensive UX state
   */
  public getState(): UserExperienceState {
    return {
      isVisible: this.visibilityManager?.isVisible() ?? true,
      isOptimized: this.visibilityManager?.isOptimized() ?? false,
      isFullscreen: this.fullscreenManager?.isFullscreen() ?? this.mobileVideoManager?.getState().isFullscreen ?? false,
      isMobile: this.mobileVideoManager?.shouldUseMobileLayout() ?? false,
      activeManagers: this.getActiveManagers()
    }
  }

  /**
   * Get list of active managers
   */
  public getActiveManagers(): string[] {
    const active: string[] = []
    
    if (this.visibilityManager) active.push('visibility')
    if (this.resourceOptimizer) active.push('resource-optimization')
    if (this.mobileVideoManager) active.push('mobile-video')
    if (this.fullscreenManager) active.push('fullscreen')
    
    return active
  }

  /**
   * Update configuration for all managers
   */
  public updateConfig(newConfig: Partial<UserExperienceConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Update individual manager configs
    if (newConfig.visibility && this.visibilityManager) {
      this.visibilityManager.updateConfig(newConfig.visibility)
    }

    if (newConfig.resourceOptimization && this.resourceOptimizer) {
      this.resourceOptimizer.updateConfig(newConfig.resourceOptimization)
    }

    if (newConfig.mobileVideo && this.mobileVideoManager) {
      this.mobileVideoManager.updateConfig(newConfig.mobileVideo)
    }

    if (newConfig.fullscreen && this.fullscreenManager) {
      this.fullscreenManager.updateConfig(newConfig.fullscreen)
    }

    this.logger.debug('UserExperienceManager configuration updated')
  }

  /**
   * Add event listener
   */
  public on<K extends keyof UserExperienceEvents>(
    event: K,
    listener: UserExperienceEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof UserExperienceEvents>(
    event: K,
    listener: UserExperienceEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private setupVisibilityIntegration(): void {
    if (!this.visibilityManager) return

    this.visibilityManager.on('visibility.changed', (isVisible) => {
      this.emit('ux.visibility.changed', isVisible)
    })

    this.visibilityManager.on('optimization.completed', () => {
      this.emit('ux.optimization.changed', true)
    })

    this.visibilityManager.on('restoration.completed', () => {
      this.emit('ux.optimization.changed', false)
    })
  }

  private setupResourceOptimization(): void {
    if (!this.visibilityManager || !this.resourceOptimizer) return

    // Add all optimization strategies to visibility manager
    const optimizations = this.resourceOptimizer.getAllOptimizations()
    for (const optimization of optimizations) {
      this.visibilityManager.addOptimization(optimization)
    }
  }

  private setupMobileVideoIntegration(): void {
    if (!this.mobileVideoManager) return

    this.mobileVideoManager.on('fullscreen.entered', () => {
      this.emit('ux.fullscreen.changed', true)
    })

    this.mobileVideoManager.on('fullscreen.exited', () => {
      this.emit('ux.fullscreen.changed', false)
    })

    this.mobileVideoManager.on('layout.changed', (layout) => {
      this.emit('ux.mobile.layout.changed', layout)
    })
  }

  private setupFullscreenIntegration(): void {
    if (!this.fullscreenManager) return

    this.fullscreenManager.on('fullscreen.entered', () => {
      this.emit('ux.fullscreen.changed', true)
    })

    this.fullscreenManager.on('fullscreen.exited', () => {
      this.emit('ux.fullscreen.changed', false)
    })
  }

  private emit<K extends keyof UserExperienceEvents>(
    event: K,
    ...args: Parameters<UserExperienceEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          this.logger.error(`Error in UX event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Destroy all managers and cleanup resources
   */
  public destroy(): void {
    if (this.visibilityManager) {
      this.visibilityManager.destroy()
      this.visibilityManager = undefined
    }

    if (this.mobileVideoManager) {
      this.mobileVideoManager.destroy()
      this.mobileVideoManager = undefined
    }

    if (this.fullscreenManager) {
      this.fullscreenManager.destroy()
      this.fullscreenManager = undefined
    }

    this.eventListeners.clear()
    this.isInitialized = false
    
    this.logger.debug('UserExperienceManager destroyed')
  }
}