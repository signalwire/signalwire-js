/**
 * Fullscreen Manager
 * 
 * Provides cross-browser fullscreen API management with fallbacks,
 * touch-friendly fullscreen controls, and integration with mobile
 * video management for enhanced fullscreen experience.
 * 
 * Based on Cantina application fullscreen enhancements.
 */

import { getLogger } from '@signalwire/core'

export interface FullscreenConfig {
  enabled: boolean
  enableFallback: boolean
  showControls: boolean
  hideControlsDelay: number
  exitOnEscape: boolean
  preventScrolling: boolean
}

export interface FullscreenState {
  isFullscreen: boolean
  isSupported: boolean
  activeElement: Element | null
  controlsVisible: boolean
  usingFallback: boolean
}

export interface FullscreenCapabilities {
  requestFullscreen: boolean
  exitFullscreen: boolean
  fullscreenElement: boolean
  fullscreenEnabled: boolean
}

export interface FullscreenEvents {
  'fullscreen.entered': (element: Element) => void
  'fullscreen.exited': (element: Element) => void
  'fullscreen.error': (error: Error, element: Element) => void
  'controls.shown': () => void
  'controls.hidden': () => void
}

const DEFAULT_CONFIG: FullscreenConfig = {
  enabled: true,
  enableFallback: true,
  showControls: true,
  hideControlsDelay: 3000,
  exitOnEscape: true,
  preventScrolling: true
}

export class FullscreenManager {
  private config: FullscreenConfig
  private state: FullscreenState = {
    isFullscreen: false,
    isSupported: false,
    activeElement: null,
    controlsVisible: false,
    usingFallback: false
  }
  
  private capabilities: FullscreenCapabilities = {
    requestFullscreen: false,
    exitFullscreen: false,
    fullscreenElement: false,
    fullscreenEnabled: false
  }
  
  private eventListeners: Map<keyof FullscreenEvents, Set<Function>> = new Map()
  private controlsTimer?: NodeJS.Timeout
  private fallbackElements: Set<Element> = new Set()
  private isInitialized = false
  private logger = getLogger()

  constructor(config: Partial<FullscreenConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    if (this.config.enabled && typeof document !== 'undefined') {
      this.initialize()
    }
    
    this.logger.debug('FullscreenManager created', this.config)
  }

  /**
   * Initialize fullscreen management
   */
  private initialize(): void {
    if (this.isInitialized) return

    this.detectCapabilities()
    this.setupEventListeners()
    this.state.isSupported = this.capabilities.requestFullscreen && this.capabilities.exitFullscreen
    
    this.isInitialized = true
    this.logger.info('FullscreenManager initialized', { 
      supported: this.state.isSupported,
      capabilities: this.capabilities
    })
  }

  /**
   * Enter fullscreen mode for an element
   */
  public async enterFullscreen(element: Element): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger.debug('Fullscreen is disabled')
      return false
    }

    if (this.state.isFullscreen) {
      this.logger.debug('Already in fullscreen mode')
      return false
    }

    try {
      let success = false

      if (this.capabilities.requestFullscreen) {
        success = await this.enterNativeFullscreen(element)
      } else if (this.config.enableFallback) {
        success = this.enterFallbackFullscreen(element)
      }

      if (success) {
        this.state.isFullscreen = true
        this.state.activeElement = element
        this.setupFullscreenEnvironment()
        this.emit('fullscreen.entered', element)
        this.logger.info('Entered fullscreen mode')
      }

      return success
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('fullscreen.error', err, element)
      this.logger.error('Failed to enter fullscreen:', error)
      return false
    }
  }

  /**
   * Exit fullscreen mode
   */
  public async exitFullscreen(): Promise<boolean> {
    if (!this.state.isFullscreen || !this.state.activeElement) {
      return false
    }

    const element = this.state.activeElement

    try {
      let success = false

      if (this.state.usingFallback) {
        success = this.exitFallbackFullscreen()
      } else if (this.capabilities.exitFullscreen) {
        success = await this.exitNativeFullscreen()
      }

      if (success) {
        this.cleanupFullscreenEnvironment()
        this.state.isFullscreen = false
        this.state.activeElement = null
        this.state.usingFallback = false
        this.emit('fullscreen.exited', element)
        this.logger.info('Exited fullscreen mode')
      }

      return success
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('fullscreen.error', err, element)
      this.logger.error('Failed to exit fullscreen:', error)
      return false
    }
  }

  /**
   * Toggle fullscreen mode for an element
   */
  public async toggleFullscreen(element: Element): Promise<boolean> {
    if (this.state.isFullscreen) {
      return this.exitFullscreen()
    } else {
      return this.enterFullscreen(element)
    }
  }

  /**
   * Check if fullscreen is supported
   */
  public isSupported(): boolean {
    return this.state.isSupported || this.config.enableFallback
  }

  /**
   * Check if currently in fullscreen mode
   */
  public isFullscreen(): boolean {
    return this.state.isFullscreen
  }

  /**
   * Get current fullscreen state
   */
  public getState(): FullscreenState {
    return { ...this.state }
  }

  /**
   * Get fullscreen capabilities
   */
  public getCapabilities(): FullscreenCapabilities {
    return { ...this.capabilities }
  }

  /**
   * Show fullscreen controls
   */
  public showControls(): void {
    if (!this.config.showControls || !this.state.isFullscreen) return

    this.state.controlsVisible = true
    this.emit('controls.shown')

    // Auto-hide controls after delay
    if (this.controlsTimer) {
      clearTimeout(this.controlsTimer)
    }

    this.controlsTimer = setTimeout(() => {
      this.hideControls()
    }, this.config.hideControlsDelay)
  }

  /**
   * Hide fullscreen controls
   */
  public hideControls(): void {
    if (!this.state.controlsVisible) return

    this.state.controlsVisible = false
    this.emit('controls.hidden')

    if (this.controlsTimer) {
      clearTimeout(this.controlsTimer)
      this.controlsTimer = undefined
    }
  }

  /**
   * Add event listener
   */
  public on<K extends keyof FullscreenEvents>(
    event: K,
    listener: FullscreenEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof FullscreenEvents>(
    event: K,
    listener: FullscreenEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private detectCapabilities(): void {
    const doc = document as any

    // Check for requestFullscreen support
    this.capabilities.requestFullscreen = !!(
      doc.documentElement.requestFullscreen ||
      doc.documentElement.webkitRequestFullscreen ||
      doc.documentElement.mozRequestFullScreen ||
      doc.documentElement.msRequestFullscreen
    )

    // Check for exitFullscreen support
    this.capabilities.exitFullscreen = !!(
      doc.exitFullscreen ||
      doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.msExitFullscreen
    )

    // Check for fullscreenElement support
    this.capabilities.fullscreenElement = !!(
      'fullscreenElement' in doc ||
      'webkitFullscreenElement' in doc ||
      'mozFullScreenElement' in doc ||
      'msFullscreenElement' in doc
    )

    // Check if fullscreen is enabled
    this.capabilities.fullscreenEnabled = !!(
      doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.msFullscreenEnabled
    )
  }

  private setupEventListeners(): void {
    // Listen for native fullscreen changes
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ]

    events.forEach(event => {
      document.addEventListener(event, this.handleFullscreenChange.bind(this))
    })

    // Listen for escape key
    if (this.config.exitOnEscape) {
      document.addEventListener('keydown', this.handleKeyDown.bind(this))
    }

    // Listen for mouse movement to show controls
    if (this.config.showControls) {
      document.addEventListener('mousemove', this.handleMouseMove.bind(this))
      document.addEventListener('touchstart', this.handleTouchStart.bind(this))
    }
  }

  private async enterNativeFullscreen(element: Element): Promise<boolean> {
    const el = element as any

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen()
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen()
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen()
      } else {
        return false
      }
      
      return true
    } catch (error) {
      this.logger.warn('Native fullscreen failed, trying fallback:', error)
      
      if (this.config.enableFallback) {
        return this.enterFallbackFullscreen(element)
      }
      
      throw error
    }
  }

  private async exitNativeFullscreen(): Promise<boolean> {
    const doc = document as any

    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen()
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen()
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen()
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen()
      } else {
        return false
      }
      
      return true
    } catch (error) {
      this.logger.error('Failed to exit native fullscreen:', error)
      throw error
    }
  }

  private enterFallbackFullscreen(element: Element): boolean {
    const htmlElement = element as HTMLElement

    // Store original styles
    const originalStyle = {
      position: htmlElement.style.position,
      top: htmlElement.style.top,
      left: htmlElement.style.left,
      width: htmlElement.style.width,
      height: htmlElement.style.height,
      zIndex: htmlElement.style.zIndex,
      backgroundColor: htmlElement.style.backgroundColor
    }

    // Apply fullscreen styles
    htmlElement.style.position = 'fixed'
    htmlElement.style.top = '0'
    htmlElement.style.left = '0'
    htmlElement.style.width = '100vw'
    htmlElement.style.height = '100vh'
    htmlElement.style.zIndex = '2147483647' // Maximum z-index
    htmlElement.style.backgroundColor = 'black'

    // Store original styles for restoration
    ;(htmlElement as any)._fullscreenOriginalStyle = originalStyle

    this.fallbackElements.add(element)
    this.state.usingFallback = true

    return true
  }

  private exitFallbackFullscreen(): boolean {
    for (const element of this.fallbackElements) {
      const htmlElement = element as HTMLElement
      const originalStyle = (htmlElement as any)._fullscreenOriginalStyle

      if (originalStyle) {
        // Restore original styles
        Object.assign(htmlElement.style, originalStyle)
        delete (htmlElement as any)._fullscreenOriginalStyle
      }
    }

    this.fallbackElements.clear()
    return true
  }

  private setupFullscreenEnvironment(): void {
    // Prevent scrolling if configured
    if (this.config.preventScrolling) {
      document.body.style.overflow = 'hidden'
    }

    // Show controls initially
    if (this.config.showControls) {
      this.showControls()
    }
  }

  private cleanupFullscreenEnvironment(): void {
    // Restore scrolling
    if (this.config.preventScrolling) {
      document.body.style.overflow = ''
    }

    // Hide controls
    this.hideControls()
  }

  private handleFullscreenChange(): void {
    const doc = document as any
    const fullscreenElement = 
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement

    const isFullscreen = !!fullscreenElement

    if (isFullscreen !== this.state.isFullscreen) {
      if (isFullscreen && fullscreenElement) {
        // Entered fullscreen
        this.state.isFullscreen = true
        this.state.activeElement = fullscreenElement
        this.setupFullscreenEnvironment()
        this.emit('fullscreen.entered', fullscreenElement)
      } else if (this.state.activeElement) {
        // Exited fullscreen
        const element = this.state.activeElement
        this.cleanupFullscreenEnvironment()
        this.state.isFullscreen = false
        this.state.activeElement = null
        this.emit('fullscreen.exited', element)
      }
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.state.isFullscreen) {
      this.exitFullscreen()
    }
  }

  private handleMouseMove(): void {
    if (this.state.isFullscreen && this.config.showControls) {
      this.showControls()
    }
  }

  private handleTouchStart(): void {
    if (this.state.isFullscreen && this.config.showControls) {
      this.showControls()
    }
  }

  private emit<K extends keyof FullscreenEvents>(
    event: K,
    ...args: Parameters<FullscreenEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          this.logger.error(`Error in fullscreen event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<FullscreenConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.logger.debug('FullscreenManager configuration updated')
  }

  /**
   * Destroy the fullscreen manager and cleanup all resources
   */
  public destroy(): void {
    // Exit fullscreen if active
    if (this.state.isFullscreen) {
      this.exitFullscreen()
    }

    // Clean up timers
    if (this.controlsTimer) {
      clearTimeout(this.controlsTimer)
    }

    // Remove event listeners
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange', 
      'mozfullscreenchange',
      'MSFullscreenChange'
    ]

    events.forEach(event => {
      document.removeEventListener(event, this.handleFullscreenChange.bind(this))
    })

    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this))

    // Clear collections
    this.fallbackElements.clear()
    this.eventListeners.clear()

    this.logger.debug('FullscreenManager destroyed')
  }
}