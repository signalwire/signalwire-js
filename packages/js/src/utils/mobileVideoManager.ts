/**
 * Mobile Video Manager
 * 
 * Provides mobile-optimized video handling including automatic fullscreen
 * management, orientation detection, touch optimizations, and responsive
 * video layout management for mobile devices.
 * 
 * Based on Cantina application mobile video enhancements.
 */

import { getLogger } from '@signalwire/core'

export interface MobileVideoConfig {
  enabled: boolean
  autoFullscreen: boolean
  orientationFullscreen: boolean
  touchOptimizations: boolean
  responsiveLayouts: boolean
  fullscreenThreshold: number // Screen width threshold for fullscreen
  doubleTapFullscreen: boolean
  pinchToZoom: boolean
  gestureDebounceTime: number
}

export interface MobileVideoState {
  isFullscreen: boolean
  orientation: 'portrait' | 'landscape'
  screenSize: { width: number; height: number }
  isMobile: boolean
  isTouch: boolean
  gestureActive: boolean
  lastTap: number
  zoomLevel: number
}

export interface VideoElementState {
  element: HTMLVideoElement
  container?: HTMLElement
  originalStyles: {
    position: string
    top: string
    left: string
    width: string
    height: string
    zIndex: string
    transform: string
  }
  touchHandlers: {
    touchstart?: (e: TouchEvent) => void
    touchmove?: (e: TouchEvent) => void
    touchend?: (e: TouchEvent) => void
  }
}

export interface MobileVideoEvents {
  'fullscreen.entered': (element: HTMLVideoElement) => void
  'fullscreen.exited': (element: HTMLVideoElement) => void
  'orientation.changed': (orientation: 'portrait' | 'landscape') => void
  'gesture.detected': (type: 'tap' | 'doubletap' | 'pinch', element: HTMLVideoElement) => void
  'layout.changed': (layout: 'mobile' | 'desktop') => void
}

const DEFAULT_CONFIG: MobileVideoConfig = {
  enabled: true,
  autoFullscreen: true,
  orientationFullscreen: true,
  touchOptimizations: true,
  responsiveLayouts: true,
  fullscreenThreshold: 768, // iPad width
  doubleTapFullscreen: true,
  pinchToZoom: false, // Disabled by default to prevent interference
  gestureDebounceTime: 300
}

export class MobileVideoManager {
  private config: MobileVideoConfig
  private state: MobileVideoState = {
    isFullscreen: false,
    orientation: 'portrait',
    screenSize: { width: 0, height: 0 },
    isMobile: false,
    isTouch: false,
    gestureActive: false,
    lastTap: 0,
    zoomLevel: 1
  }
  
  private managedElements: Map<HTMLVideoElement, VideoElementState> = new Map()
  private eventListeners: Map<keyof MobileVideoEvents, Set<Function>> = new Map()
  private resizeObserver?: ResizeObserver
  private isInitialized = false
  private logger = getLogger()

  constructor(config: Partial<MobileVideoConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    if (this.config.enabled && typeof window !== 'undefined') {
      this.initialize()
    }
    
    this.logger.debug('MobileVideoManager created', this.config)
  }

  /**
   * Initialize mobile video management
   */
  private initialize(): void {
    if (this.isInitialized) return

    this.detectEnvironment()
    this.setupEventListeners()
    this.updateState()
    
    this.isInitialized = true
    this.logger.info('MobileVideoManager initialized')
  }

  /**
   * Add a video element to mobile management
   */
  public manageVideoElement(
    videoElement: HTMLVideoElement,
    container?: HTMLElement
  ): void {
    if (this.managedElements.has(videoElement)) {
      this.logger.debug('Video element already managed')
      return
    }

    const elementState: VideoElementState = {
      element: videoElement,
      container,
      originalStyles: {
        position: videoElement.style.position || '',
        top: videoElement.style.top || '',
        left: videoElement.style.left || '',
        width: videoElement.style.width || '',
        height: videoElement.style.height || '',
        zIndex: videoElement.style.zIndex || '',
        transform: videoElement.style.transform || ''
      },
      touchHandlers: {}
    }

    if (this.config.touchOptimizations && this.state.isTouch) {
      this.setupTouchHandlers(elementState)
    }

    this.managedElements.set(videoElement, elementState)
    this.logger.debug('Video element added to mobile management')
  }

  /**
   * Remove a video element from mobile management
   */
  public unmanageVideoElement(videoElement: HTMLVideoElement): void {
    const elementState = this.managedElements.get(videoElement)
    if (!elementState) return

    // Exit fullscreen if this element is in fullscreen
    if (this.state.isFullscreen && document.fullscreenElement === videoElement) {
      this.exitFullscreen(videoElement)
    }

    // Remove touch handlers
    this.removeTouchHandlers(elementState)

    // Restore original styles
    this.restoreOriginalStyles(elementState)

    this.managedElements.delete(videoElement)
    this.logger.debug('Video element removed from mobile management')
  }

  /**
   * Enter fullscreen mode for a video element
   */
  public async enterFullscreen(videoElement: HTMLVideoElement): Promise<boolean> {
    const elementState = this.managedElements.get(videoElement)
    if (!elementState || this.state.isFullscreen) {
      return false
    }

    try {
      // Use requestFullscreen if available
      if (videoElement.requestFullscreen) {
        await videoElement.requestFullscreen()
      } else {
        // Fallback to custom fullscreen styling
        this.applyFullscreenStyles(elementState)
      }

      this.state.isFullscreen = true
      this.emit('fullscreen.entered', videoElement)
      this.logger.info('Entered fullscreen mode')
      return true
    } catch (error) {
      this.logger.error('Failed to enter fullscreen:', error)
      return false
    }
  }

  /**
   * Exit fullscreen mode for a video element
   */
  public async exitFullscreen(videoElement: HTMLVideoElement): Promise<boolean> {
    const elementState = this.managedElements.get(videoElement)
    if (!elementState || !this.state.isFullscreen) {
      return false
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        // Exit custom fullscreen
        this.restoreOriginalStyles(elementState)
      }

      this.state.isFullscreen = false
      this.emit('fullscreen.exited', videoElement)
      this.logger.info('Exited fullscreen mode')
      return true
    } catch (error) {
      this.logger.error('Failed to exit fullscreen:', error)
      return false
    }
  }

  /**
   * Toggle fullscreen mode for a video element
   */
  public async toggleFullscreen(videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.state.isFullscreen) {
      return this.exitFullscreen(videoElement)
    } else {
      return this.enterFullscreen(videoElement)
    }
  }

  /**
   * Check if device should use mobile layout
   */
  public shouldUseMobileLayout(): boolean {
    return this.state.isMobile || this.state.screenSize.width <= this.config.fullscreenThreshold
  }

  /**
   * Get current mobile video state
   */
  public getState(): MobileVideoState {
    return { ...this.state }
  }

  /**
   * Get current configuration
   */
  public getConfig(): MobileVideoConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MobileVideoConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (!this.config.enabled && this.isInitialized) {
      this.cleanup()
    } else if (this.config.enabled && !this.isInitialized) {
      this.initialize()
    }
    
    this.logger.debug('MobileVideoManager configuration updated')
  }

  /**
   * Add event listener
   */
  public on<K extends keyof MobileVideoEvents>(
    event: K,
    listener: MobileVideoEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof MobileVideoEvents>(
    event: K,
    listener: MobileVideoEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private detectEnvironment(): void {
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    this.state.isMobile = isMobile
    this.state.isTouch = isTouch

    this.logger.debug(`Environment detected - Mobile: ${isMobile}, Touch: ${isTouch}`)
  }

  private setupEventListeners(): void {
    // Listen for orientation changes
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this))
    window.addEventListener('resize', this.handleResize.bind(this))
    
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this))
    
    // Set up resize observer for responsive layouts
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this.handleResize.bind(this))
      this.resizeObserver.observe(document.body)
    }
  }

  private setupTouchHandlers(elementState: VideoElementState): void {
    const { element } = elementState

    // Double tap handler for fullscreen
    if (this.config.doubleTapFullscreen) {
      elementState.touchHandlers.touchend = (e: TouchEvent) => {
        e.preventDefault()
        const now = Date.now()
        const timeDiff = now - this.state.lastTap

        if (timeDiff < this.config.gestureDebounceTime && timeDiff > 0) {
          // Double tap detected
          this.emit('gesture.detected', 'doubletap', element)
          this.toggleFullscreen(element)
        }

        this.state.lastTap = now
      }
      
      element.addEventListener('touchend', elementState.touchHandlers.touchend, { passive: false })
    }

    // Pinch to zoom handler
    if (this.config.pinchToZoom) {
      let lastTouchDistance = 0

      elementState.touchHandlers.touchstart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          this.state.gestureActive = true
          lastTouchDistance = this.getTouchDistance(e.touches[0], e.touches[1])
        }
      }

      elementState.touchHandlers.touchmove = (e: TouchEvent) => {
        if (e.touches.length === 2 && this.state.gestureActive) {
          e.preventDefault()
          const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1])
          const scale = currentDistance / lastTouchDistance

          this.state.zoomLevel *= scale
          this.state.zoomLevel = Math.max(0.5, Math.min(3, this.state.zoomLevel))

          element.style.transform = `scale(${this.state.zoomLevel})`
          this.emit('gesture.detected', 'pinch', element)

          lastTouchDistance = currentDistance
        }
      }

      element.addEventListener('touchstart', elementState.touchHandlers.touchstart, { passive: true })
      element.addEventListener('touchmove', elementState.touchHandlers.touchmove, { passive: false })
    }
  }

  private removeTouchHandlers(elementState: VideoElementState): void {
    const { element, touchHandlers } = elementState

    if (touchHandlers.touchstart) {
      element.removeEventListener('touchstart', touchHandlers.touchstart)
    }
    if (touchHandlers.touchmove) {
      element.removeEventListener('touchmove', touchHandlers.touchmove)
    }
    if (touchHandlers.touchend) {
      element.removeEventListener('touchend', touchHandlers.touchend)
    }
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  private applyFullscreenStyles(elementState: VideoElementState): void {
    const { element } = elementState

    element.style.position = 'fixed'
    element.style.top = '0'
    element.style.left = '0'
    element.style.width = '100vw'
    element.style.height = '100vh'
    element.style.zIndex = '9999'
    element.style.objectFit = 'contain'
    element.style.backgroundColor = 'black'
  }

  private restoreOriginalStyles(elementState: VideoElementState): void {
    const { element, originalStyles } = elementState

    element.style.position = originalStyles.position
    element.style.top = originalStyles.top
    element.style.left = originalStyles.left
    element.style.width = originalStyles.width
    element.style.height = originalStyles.height
    element.style.zIndex = originalStyles.zIndex
    element.style.transform = originalStyles.transform
    element.style.objectFit = ''
    element.style.backgroundColor = ''
  }

  private handleOrientationChange(): void {
    setTimeout(() => {
      this.updateState()
      
      // Auto-fullscreen on landscape if configured
      if (this.config.orientationFullscreen && this.state.orientation === 'landscape') {
        const firstVideoElement = this.managedElements.keys().next().value
        if (firstVideoElement && !this.state.isFullscreen) {
          this.enterFullscreen(firstVideoElement)
        }
      }
      
      this.emit('orientation.changed', this.state.orientation)
    }, 100) // Small delay to ensure orientation change is complete
  }

  private handleResize(): void {
    this.updateState()
    
    const layout = this.shouldUseMobileLayout() ? 'mobile' : 'desktop'
    this.emit('layout.changed', layout)
  }

  private handleFullscreenChange(): void {
    const isFullscreen = !!document.fullscreenElement
    if (isFullscreen !== this.state.isFullscreen) {
      this.state.isFullscreen = isFullscreen
      
      const fullscreenElement = document.fullscreenElement as HTMLVideoElement
      if (fullscreenElement && this.managedElements.has(fullscreenElement)) {
        if (isFullscreen) {
          this.emit('fullscreen.entered', fullscreenElement)
        } else {
          this.emit('fullscreen.exited', fullscreenElement)
        }
      }
    }
  }

  private updateState(): void {
    this.state.screenSize = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    
    this.state.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }

  private emit<K extends keyof MobileVideoEvents>(
    event: K,
    ...args: Parameters<MobileVideoEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          this.logger.error(`Error in mobile video event listener for ${event}:`, error)
        }
      })
    }
  }

  private cleanup(): void {
    // Remove all managed elements
    for (const [videoElement] of this.managedElements) {
      this.unmanageVideoElement(videoElement)
    }

    // Remove event listeners
    window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this))
    window.removeEventListener('resize', this.handleResize.bind(this))
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange.bind(this))

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = undefined
    }

    this.isInitialized = false
  }

  /**
   * Destroy the mobile video manager and cleanup all resources
   */
  public destroy(): void {
    this.cleanup()
    this.managedElements.clear()
    this.eventListeners.clear()
    
    this.logger.debug('MobileVideoManager destroyed')
  }
}