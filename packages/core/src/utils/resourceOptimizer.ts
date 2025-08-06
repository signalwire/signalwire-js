/**
 * Resource Optimizer
 * 
 * Provides intelligent resource optimization strategies for background operation.
 * Works with VisibilityManager to automatically reduce resource usage when the
 * application is not visible, improving performance and battery life.
 * 
 * Based on Cantina application resource optimization patterns.
 */

import { getLogger } from './logger'
import { VisibilityOptimization } from './visibilityManager'

export interface ResourceOptimizationConfig {
  enableMediaOptimization: boolean
  enableNetworkOptimization: boolean
  enableRenderingOptimization: boolean
  enableTimerOptimization: boolean
  mediaOptimization: {
    pauseVideo: boolean
    muteAudio: boolean
    reduceFrameRate: boolean
    targetFrameRate: number
  }
  networkOptimization: {
    reducePollingFrequency: boolean
    pauseNonCriticalRequests: boolean
    increaseBatchSize: boolean
  }
  renderingOptimization: {
    pauseAnimations: boolean
    reduceRedraws: boolean
    hideNonEssentialElements: boolean
  }
  timerOptimization: {
    pauseNonCriticalTimers: boolean
    increaseIntervals: boolean
    intervalMultiplier: number
  }
}

export interface OptimizationContext {
  mediaStreams?: MediaStream[]
  videoElements?: HTMLVideoElement[]
  audioElements?: HTMLAudioElement[]
  timers?: Set<NodeJS.Timeout>
  intervals?: Set<NodeJS.Timeout>
  animationFrames?: Set<number>
  pollingOperations?: Map<string, () => void>
}

export interface OptimizationState {
  media: {
    pausedVideoElements: HTMLVideoElement[]
    mutedAudioElements: HTMLAudioElement[]
    originalFrameRates: Map<MediaStreamTrack, number>
  }
  network: {
    pausedPolling: Map<string, () => void>
    originalIntervals: Map<string, number>
  }
  rendering: {
    pausedAnimations: number[]
    hiddenElements: HTMLElement[]
  }
  timers: {
    pausedTimers: Map<NodeJS.Timeout, number>
    pausedIntervals: Map<NodeJS.Timeout, number>
  }
}

const DEFAULT_CONFIG: ResourceOptimizationConfig = {
  enableMediaOptimization: true,
  enableNetworkOptimization: true,
  enableRenderingOptimization: true,
  enableTimerOptimization: true,
  mediaOptimization: {
    pauseVideo: true,
    muteAudio: false, // Don't mute audio by default to maintain call audio
    reduceFrameRate: true,
    targetFrameRate: 5 // Reduce to 5 FPS when hidden
  },
  networkOptimization: {
    reducePollingFrequency: true,
    pauseNonCriticalRequests: true,
    increaseBatchSize: true
  },
  renderingOptimization: {
    pauseAnimations: true,
    reduceRedraws: true,
    hideNonEssentialElements: false // Keep elements visible for better UX
  },
  timerOptimization: {
    pauseNonCriticalTimers: true,
    increaseIntervals: true,
    intervalMultiplier: 4 // 4x longer intervals when hidden
  }
}

export class ResourceOptimizer {
  private config: ResourceOptimizationConfig
  private context: OptimizationContext = {}
  private state: OptimizationState = {
    media: {
      pausedVideoElements: [],
      mutedAudioElements: [],
      originalFrameRates: new Map()
    },
    network: {
      pausedPolling: new Map(),
      originalIntervals: new Map()
    },
    rendering: {
      pausedAnimations: [],
      hiddenElements: []
    },
    timers: {
      pausedTimers: new Map(),
      pausedIntervals: new Map()
    }
  }
  
  private logger = getLogger()

  constructor(
    config: Partial<ResourceOptimizationConfig> = {},
    context: OptimizationContext = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.context = context
    this.logger.debug('ResourceOptimizer created', this.config)
  }

  /**
   * Update optimization context (e.g., new media streams, elements)
   */
  public updateContext(context: Partial<OptimizationContext>): void {
    this.context = { ...this.context, ...context }
    this.logger.debug('ResourceOptimizer context updated')
  }

  /**
   * Get media optimization strategy
   */
  public getMediaOptimization(): VisibilityOptimization {
    return {
      type: 'media',
      name: 'media-optimization',
      priority: 'high',
      isActive: false,
      optimize: async () => {
        if (!this.config.enableMediaOptimization) return
        
        await this.optimizeMedia()
      },
      restore: async () => {
        if (!this.config.enableMediaOptimization) return
        
        await this.restoreMedia()
      }
    }
  }

  /**
   * Get network optimization strategy
   */
  public getNetworkOptimization(): VisibilityOptimization {
    return {
      type: 'network',
      name: 'network-optimization',
      priority: 'medium',
      isActive: false,
      optimize: async () => {
        if (!this.config.enableNetworkOptimization) return
        
        await this.optimizeNetwork()
      },
      restore: async () => {
        if (!this.config.enableNetworkOptimization) return
        
        await this.restoreNetwork()
      }
    }
  }

  /**
   * Get rendering optimization strategy
   */
  public getRenderingOptimization(): VisibilityOptimization {
    return {
      type: 'rendering',
      name: 'rendering-optimization',
      priority: 'low',
      isActive: false,
      optimize: async () => {
        if (!this.config.enableRenderingOptimization) return
        
        await this.optimizeRendering()
      },
      restore: async () => {
        if (!this.config.enableRenderingOptimization) return
        
        await this.restoreRendering()
      }
    }
  }

  /**
   * Get timer optimization strategy
   */
  public getTimerOptimization(): VisibilityOptimization {
    return {
      type: 'custom',
      name: 'timer-optimization',
      priority: 'medium',
      isActive: false,
      optimize: async () => {
        if (!this.config.enableTimerOptimization) return
        
        await this.optimizeTimers()
      },
      restore: async () => {
        if (!this.config.enableTimerOptimization) return
        
        await this.restoreTimers()
      }
    }
  }

  /**
   * Get all optimization strategies
   */
  public getAllOptimizations(): VisibilityOptimization[] {
    return [
      this.getMediaOptimization(),
      this.getNetworkOptimization(),
      this.getRenderingOptimization(),
      this.getTimerOptimization()
    ]
  }

  private async optimizeMedia(): Promise<void> {
    const { mediaOptimization } = this.config
    
    // Pause video elements
    if (mediaOptimization.pauseVideo && this.context.videoElements) {
      for (const video of this.context.videoElements) {
        if (!video.paused) {
          video.pause()
          this.state.media.pausedVideoElements.push(video)
        }
      }
      this.logger.debug(`Paused ${this.state.media.pausedVideoElements.length} video elements`)
    }
    
    // Mute audio elements (if configured)
    if (mediaOptimization.muteAudio && this.context.audioElements) {
      for (const audio of this.context.audioElements) {
        if (!audio.muted) {
          audio.muted = true
          this.state.media.mutedAudioElements.push(audio)
        }
      }
      this.logger.debug(`Muted ${this.state.media.mutedAudioElements.length} audio elements`)
    }
    
    // Reduce video track frame rates
    if (mediaOptimization.reduceFrameRate && this.context.mediaStreams) {
      for (const stream of this.context.mediaStreams) {
        const videoTracks = stream.getVideoTracks()
        for (const track of videoTracks) {
          try {
            const settings = track.getSettings()
            if (settings.frameRate && settings.frameRate > mediaOptimization.targetFrameRate) {
              this.state.media.originalFrameRates.set(track, settings.frameRate)
              
              await track.applyConstraints({
                frameRate: { ideal: mediaOptimization.targetFrameRate }
              })
            }
          } catch (error) {
            this.logger.warn('Failed to reduce frame rate for video track:', error)
          }
        }
      }
      this.logger.debug(`Reduced frame rate for ${this.state.media.originalFrameRates.size} video tracks`)
    }
  }

  private async restoreMedia(): Promise<void> {
    // Resume paused video elements
    for (const video of this.state.media.pausedVideoElements) {
      try {
        await video.play()
      } catch (error) {
        this.logger.warn('Failed to resume video element:', error)
      }
    }
    this.state.media.pausedVideoElements = []
    
    // Unmute audio elements
    for (const audio of this.state.media.mutedAudioElements) {
      audio.muted = false
    }
    this.state.media.mutedAudioElements = []
    
    // Restore original frame rates
    for (const [track, originalFrameRate] of this.state.media.originalFrameRates.entries()) {
      try {
        await track.applyConstraints({
          frameRate: { ideal: originalFrameRate }
        })
      } catch (error) {
        this.logger.warn('Failed to restore frame rate for video track:', error)
      }
    }
    this.state.media.originalFrameRates.clear()
    
    this.logger.debug('Media optimizations restored')
  }

  private async optimizeNetwork(): Promise<void> {
    const { networkOptimization } = this.config
    
    if (networkOptimization.pauseNonCriticalRequests && this.context.pollingOperations) {
      // Store and pause non-critical polling operations
      for (const [name, operation] of this.context.pollingOperations.entries()) {
        this.state.network.pausedPolling.set(name, operation)
      }
      this.context.pollingOperations.clear()
      this.logger.debug(`Paused ${this.state.network.pausedPolling.size} polling operations`)
    }
    
    this.logger.debug('Network optimizations applied')
  }

  private async restoreNetwork(): Promise<void> {
    // Restore paused polling operations
    if (this.context.pollingOperations) {
      for (const [name, operation] of this.state.network.pausedPolling.entries()) {
        this.context.pollingOperations.set(name, operation)
      }
    }
    this.state.network.pausedPolling.clear()
    
    this.logger.debug('Network optimizations restored')
  }

  private async optimizeRendering(): Promise<void> {
    const { renderingOptimization } = this.config
    
    if (renderingOptimization.pauseAnimations && this.context.animationFrames) {
      // Cancel animation frames
      for (const frameId of this.context.animationFrames) {
        cancelAnimationFrame(frameId)
        this.state.rendering.pausedAnimations.push(frameId)
      }
      this.context.animationFrames.clear()
      this.logger.debug(`Paused ${this.state.rendering.pausedAnimations.length} animations`)
    }
    
    this.logger.debug('Rendering optimizations applied')
  }

  private async restoreRendering(): Promise<void> {
    // Animation frames are cancelled, so we just clear the state
    // The application should handle restarting animations when needed
    this.state.rendering.pausedAnimations = []
    
    // Restore hidden elements
    for (const element of this.state.rendering.hiddenElements) {
      element.style.display = ''
    }
    this.state.rendering.hiddenElements = []
    
    this.logger.debug('Rendering optimizations restored')
  }

  private async optimizeTimers(): Promise<void> {
    const { timerOptimization } = this.config
    
    if (timerOptimization.pauseNonCriticalTimers) {
      // Note: We can't directly pause JavaScript timers, but we can provide
      // hooks for applications to manage their own timers
      this.logger.debug('Timer optimization hooks activated')
    }
    
    this.logger.debug('Timer optimizations applied')
  }

  private async restoreTimers(): Promise<void> {
    // Clear timer optimization state
    this.state.timers.pausedTimers.clear()
    this.state.timers.pausedIntervals.clear()
    
    this.logger.debug('Timer optimizations restored')
  }

  /**
   * Get current optimization state
   */
  public getState(): OptimizationState {
    return JSON.parse(JSON.stringify(this.state)) // Deep clone
  }

  /**
   * Get current configuration
   */
  public getConfig(): ResourceOptimizationConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ResourceOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.logger.debug('ResourceOptimizer configuration updated')
  }

  /**
   * Create a timer optimization wrapper for intervals
   */
  public createOptimizedInterval(
    callback: () => void,
    interval: number,
    isCritical: boolean = false
  ): NodeJS.Timeout {
    const actualInterval = isCritical ? interval : interval * this.config.timerOptimization.intervalMultiplier
    return setInterval(callback, actualInterval)
  }

  /**
   * Create a timer optimization wrapper for timeouts
   */
  public createOptimizedTimeout(
    callback: () => void,
    timeout: number,
    isCritical: boolean = false
  ): NodeJS.Timeout {
    const actualTimeout = isCritical ? timeout : timeout * this.config.timerOptimization.intervalMultiplier
    return setTimeout(callback, actualTimeout)
  }

  /**
   * Clean up all optimization state
   */
  public cleanup(): void {
    // This method can be called to forcefully clean up all optimization state
    // without going through the normal restore process
    this.state = {
      media: {
        pausedVideoElements: [],
        mutedAudioElements: [],
        originalFrameRates: new Map()
      },
      network: {
        pausedPolling: new Map(),
        originalIntervals: new Map()
      },
      rendering: {
        pausedAnimations: [],
        hiddenElements: []
      },
      timers: {
        pausedTimers: new Map(),
        pausedIntervals: new Map()
      }
    }
    
    this.logger.debug('ResourceOptimizer state cleaned up')
  }
}