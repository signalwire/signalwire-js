/**
 * Visibility Manager
 * 
 * Manages page visibility detection and automatic resource optimization
 * when the browser tab becomes hidden or visible. Provides event-driven
 * notifications for visibility changes and background behavior management.
 * 
 * Based on Cantina application visibility management improvements.
 */

import { getLogger } from './logger'
import { EventEmitter } from './EventEmitter'

export interface VisibilityConfig {
  enabled: boolean
  optimizeOnHidden: boolean
  resumeOnVisible: boolean
  hiddenTimeout: number // milliseconds to wait before optimization
  debounceTime: number // milliseconds to debounce visibility changes
}

export interface VisibilityState {
  isVisible: boolean
  isOptimized: boolean
  hiddenSince?: number
  lastVisibilityChange: number
  changeCount: number
}

export interface VisibilityOptimization {
  type: 'media' | 'network' | 'rendering' | 'custom'
  name: string
  priority: 'low' | 'medium' | 'high'
  optimize: () => Promise<void> | void
  restore: () => Promise<void> | void
  isActive: boolean
}

export interface VisibilityEvents {
  'visibility.changed': (isVisible: boolean, previousState: boolean) => void
  'visibility.hidden': (hiddenDuration: number) => void
  'visibility.visible': (hiddenDuration?: number) => void
  'optimization.started': (optimizations: VisibilityOptimization[]) => void
  'optimization.completed': (optimizations: VisibilityOptimization[]) => void
  'restoration.started': (optimizations: VisibilityOptimization[]) => void
  'restoration.completed': (optimizations: VisibilityOptimization[]) => void
}

const DEFAULT_CONFIG: VisibilityConfig = {
  enabled: true,
  optimizeOnHidden: true,
  resumeOnVisible: true,
  hiddenTimeout: 5000, // 5 seconds
  debounceTime: 500 // 500ms debounce
}

export class VisibilityManager extends EventEmitter<VisibilityEvents> {
  private config: VisibilityConfig
  private state: VisibilityState = {
    isVisible: !document.hidden,
    isOptimized: false,
    lastVisibilityChange: Date.now(),
    changeCount: 0
  }
  
  private optimizations: Map<string, VisibilityOptimization> = new Map()
  private hiddenTimer?: NodeJS.Timeout
  private debounceTimer?: NodeJS.Timeout
  private isInitialized = false
  private logger = getLogger()

  constructor(config: Partial<VisibilityConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    if (this.config.enabled) {
      this.initialize()
    }
    
    this.logger.debug('VisibilityManager created', this.config)
  }

  /**
   * Initialize visibility monitoring
   */
  private initialize(): void {
    if (this.isInitialized || typeof document === 'undefined') {
      return
    }

    // Listen for visibility change events
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // Listen for page focus/blur events as fallback
    window.addEventListener('focus', this.handleFocus.bind(this))
    window.addEventListener('blur', this.handleBlur.bind(this))
    
    // Listen for page unload to cleanup
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this))
    
    this.isInitialized = true
    this.logger.info('VisibilityManager initialized')
  }

  /**
   * Add optimization strategy
   */
  public addOptimization(optimization: VisibilityOptimization): void {
    this.optimizations.set(optimization.name, optimization)
    this.logger.debug(`Added optimization: ${optimization.name} (${optimization.type})`)
  }

  /**
   * Remove optimization strategy
   */
  public removeOptimization(name: string): void {
    const optimization = this.optimizations.get(name)
    if (optimization && optimization.isActive) {
      // Restore before removing
      this.executeRestore([optimization])
    }
    
    this.optimizations.delete(name)
    this.logger.debug(`Removed optimization: ${name}`)
  }

  /**
   * Get current visibility state
   */
  public getState(): VisibilityState {
    return { ...this.state }
  }

  /**
   * Get current configuration
   */
  public getConfig(): VisibilityConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<VisibilityConfig>): void {
    const wasEnabled = this.config.enabled
    this.config = { ...this.config, ...newConfig }
    
    if (!wasEnabled && this.config.enabled) {
      this.initialize()
    } else if (wasEnabled && !this.config.enabled) {
      this.cleanup()
    }
    
    this.logger.debug('VisibilityManager configuration updated', this.config)
  }

  /**
   * Manually trigger optimization
   */
  public async optimize(): Promise<void> {
    if (this.state.isOptimized) {
      this.logger.debug('Already optimized, skipping')
      return
    }
    
    const optimizations = this.getOptimizationsToRun()
    if (optimizations.length === 0) {
      return
    }
    
    this.emit('optimization.started', optimizations)
    
    try {
      await this.executeOptimizations(optimizations)
      this.state.isOptimized = true
      this.emit('optimization.completed', optimizations)
      this.logger.info(`Applied ${optimizations.length} optimizations`)
    } catch (error) {
      this.logger.error('Failed to apply optimizations:', error)
    }
  }

  /**
   * Manually trigger restoration
   */
  public async restore(): Promise<void> {
    if (!this.state.isOptimized) {
      this.logger.debug('Not optimized, skipping restoration')
      return
    }
    
    const activeOptimizations = Array.from(this.optimizations.values())
      .filter(opt => opt.isActive)
    
    if (activeOptimizations.length === 0) {
      return
    }
    
    this.emit('restoration.started', activeOptimizations)
    
    try {
      await this.executeRestoration(activeOptimizations)
      this.state.isOptimized = false
      this.emit('restoration.completed', activeOptimizations)
      this.logger.info(`Restored ${activeOptimizations.length} optimizations`)
    } catch (error) {
      this.logger.error('Failed to restore optimizations:', error)
    }
  }

  /**
   * Check if page is currently visible
   */
  public isVisible(): boolean {
    return this.state.isVisible
  }

  /**
   * Check if optimizations are currently active
   */
  public isOptimized(): boolean {
    return this.state.isOptimized
  }

  /**
   * Get list of registered optimizations
   */
  public getOptimizations(): VisibilityOptimization[] {
    return Array.from(this.optimizations.values())
  }

  private handleVisibilityChange(): void {
    const isVisible = !document.hidden
    this.processVisibilityChange(isVisible)
  }

  private handleFocus(): void {
    this.processVisibilityChange(true)
  }

  private handleBlur(): void {
    this.processVisibilityChange(false)
  }

  private processVisibilityChange(isVisible: boolean): void {
    // Clear any existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    
    // Debounce visibility changes to avoid rapid switching
    this.debounceTimer = setTimeout(() => {
      this.executeVisibilityChange(isVisible)
    }, this.config.debounceTime)
  }

  private executeVisibilityChange(isVisible: boolean): void {
    const previousState = this.state.isVisible
    
    if (isVisible === previousState) {
      return // No change
    }
    
    const now = Date.now()
    let hiddenDuration: number | undefined
    
    if (isVisible && this.state.hiddenSince) {
      hiddenDuration = now - this.state.hiddenSince
    }
    
    this.state.isVisible = isVisible
    this.state.lastVisibilityChange = now
    this.state.changeCount++
    
    if (isVisible) {
      this.state.hiddenSince = undefined
      this.handleVisible(hiddenDuration)
    } else {
      this.state.hiddenSince = now
      this.handleHidden()
    }
    
    this.emit('visibility.changed', isVisible, previousState)
    this.logger.debug(`Visibility changed: ${previousState} -> ${isVisible}`)
  }

  private handleVisible(hiddenDuration?: number): void {
    // Clear hidden timer
    if (this.hiddenTimer) {
      clearTimeout(this.hiddenTimer)
      this.hiddenTimer = undefined
    }
    
    this.emit('visibility.visible', hiddenDuration)
    
    // Restore optimizations if configured
    if (this.config.resumeOnVisible && this.state.isOptimized) {
      this.restore().catch(error => {
        this.logger.error('Failed to restore on visibility:', error)
      })
    }
  }

  private handleHidden(): void {
    this.emit('visibility.hidden', 0)
    
    // Schedule optimization if configured
    if (this.config.optimizeOnHidden && this.config.hiddenTimeout > 0) {
      this.hiddenTimer = setTimeout(() => {
        this.optimize().catch(error => {
          this.logger.error('Failed to optimize on hidden:', error)
        })
      }, this.config.hiddenTimeout)
    } else if (this.config.optimizeOnHidden) {
      // Immediate optimization
      this.optimize().catch(error => {
        this.logger.error('Failed to optimize immediately:', error)
      })
    }
  }

  private getOptimizationsToRun(): VisibilityOptimization[] {
    return Array.from(this.optimizations.values())
      .filter(opt => !opt.isActive)
      .sort((a, b) => {
        // Sort by priority: high, medium, low
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
  }

  private async executeOptimizations(optimizations: VisibilityOptimization[]): Promise<void> {
    for (const optimization of optimizations) {
      try {
        await optimization.optimize()
        optimization.isActive = true
        this.logger.debug(`Optimization applied: ${optimization.name}`)
      } catch (error) {
        this.logger.error(`Failed to apply optimization ${optimization.name}:`, error)
      }
    }
  }

  private async executeRestoration(optimizations: VisibilityOptimization[]): Promise<void> {
    // Restore in reverse priority order
    const sortedOptimizations = [...optimizations].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    
    for (const optimization of sortedOptimizations) {
      try {
        await optimization.restore()
        optimization.isActive = false
        this.logger.debug(`Optimization restored: ${optimization.name}`)
      } catch (error) {
        this.logger.error(`Failed to restore optimization ${optimization.name}:`, error)
      }
    }
  }

  private async executeRestore(optimizations: VisibilityOptimization[]): Promise<void> {
    for (const optimization of optimizations) {
      if (optimization.isActive) {
        try {
          await optimization.restore()
          optimization.isActive = false
        } catch (error) {
          this.logger.error(`Failed to restore optimization ${optimization.name}:`, error)
        }
      }
    }
  }

  private handleBeforeUnload(): void {
    this.cleanup()
  }

  private cleanup(): void {
    if (this.hiddenTimer) {
      clearTimeout(this.hiddenTimer)
      this.hiddenTimer = undefined
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = undefined
    }
    
    if (this.isInitialized) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
      window.removeEventListener('focus', this.handleFocus.bind(this))
      window.removeEventListener('blur', this.handleBlur.bind(this))
      window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this))
      this.isInitialized = false
    }
  }

  /**
   * Destroy the visibility manager and cleanup all resources
   */
  public destroy(): void {
    // Restore any active optimizations
    const activeOptimizations = Array.from(this.optimizations.values())
      .filter(opt => opt.isActive)
    
    if (activeOptimizations.length > 0) {
      this.executeRestore(activeOptimizations).catch(error => {
        this.logger.error('Failed to restore optimizations during destroy:', error)
      })
    }
    
    this.cleanup()
    this.optimizations.clear()
    this.removeAllListeners()
    
    this.logger.debug('VisibilityManager destroyed')
  }
}