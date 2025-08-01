/**
 * Reinvite Engine
 * 
 * Handles debounced reinvite logic for call recovery. Provides controlled
 * reinvite attempts with retry limits, timing controls, and state management.
 * 
 * Based on Cantina application reinvite saga patterns.
 */

import { getLogger } from '@signalwire/core'

export interface ReinviteConfig {
  maxAttempts: number
  debounceTime: number // milliseconds
  timeoutTime: number // milliseconds per attempt
  retryDelay: number // milliseconds between retries
}

export interface ReinviteAttempt {
  attemptNumber: number
  timestamp: number
  timeoutTime: number
}

export interface ReinviteState {
  isActive: boolean
  currentAttempt?: ReinviteAttempt
  totalAttempts: number
  lastAttemptTime?: number
}

export interface ReinviteEvents {
  'reinvite.attempting': (attempt: ReinviteAttempt) => void
  'reinvite.succeeded': () => void
  'reinvite.failed': (finalFailure: boolean) => void
  'reinvite.timeout': (attempt: ReinviteAttempt) => void
}

const DEFAULT_CONFIG: ReinviteConfig = {
  maxAttempts: 3,
  debounceTime: 10000, // 10 seconds
  timeoutTime: 30000, // 30 seconds per attempt  
  retryDelay: 2000 // 2 seconds between retries
}

export class ReinviteEngine {
  private config: ReinviteConfig
  private state: ReinviteState = {
    isActive: false,
    totalAttempts: 0
  }
  
  private eventListeners: Map<keyof ReinviteEvents, Set<Function>> = new Map()
  private debounceTimer?: NodeJS.Timeout
  private attemptTimer?: NodeJS.Timeout
  private retryTimer?: NodeJS.Timeout
  private logger = getLogger()

  constructor(config: Partial<ReinviteConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.logger.debug('ReinviteEngine initialized', this.config)
  }

  /**
   * Attempt a reinvite with debouncing and retry logic
   */
  public async attempt(reinviteCallback: () => Promise<void>): Promise<boolean> {
    // Clear any existing timers
    this.clearTimers()
    
    // Check if we should debounce this attempt
    if (this.shouldDebounce()) {
      this.logger.debug(`Debouncing reinvite attempt for ${this.config.debounceTime}ms`)
      return this.scheduleDebounced(reinviteCallback)
    }
    
    return this.executeAttempt(reinviteCallback)
  }

  /**
   * Stop all reinvite attempts and clear timers
   */
  public stop(): void {
    this.clearTimers()
    this.state.isActive = false
    this.state.currentAttempt = undefined
    this.logger.debug('ReinviteEngine stopped')
  }

  /**
   * Get current reinvite state
   */
  public getState(): ReinviteState {
    return { ...this.state }
  }

  /**
   * Get reinvite configuration
   */
  public getConfig(): ReinviteConfig {
    return { ...this.config }
  }

  /**
   * Update reinvite configuration
   */
  public updateConfig(newConfig: Partial<ReinviteConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.logger.debug('ReinviteEngine configuration updated', this.config)
  }

  /**
   * Reset attempt counter
   */
  public reset(): void {
    this.state.totalAttempts = 0
    this.state.lastAttemptTime = undefined
    this.logger.debug('ReinviteEngine reset')
  }

  /**
   * Check if reinvite is currently active
   */
  public isActive(): boolean {
    return this.state.isActive
  }

  /**
   * Add event listener
   */
  public on<K extends keyof ReinviteEvents>(
    event: K,
    listener: ReinviteEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof ReinviteEvents>(
    event: K,
    listener: ReinviteEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private shouldDebounce(): boolean {
    if (!this.state.lastAttemptTime) {
      return false
    }
    
    const timeSinceLastAttempt = Date.now() - this.state.lastAttemptTime
    return timeSinceLastAttempt < this.config.debounceTime
  }

  private scheduleDebounced(reinviteCallback: () => Promise<void>): Promise<boolean> {
    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        const result = await this.executeAttempt(reinviteCallback)
        resolve(result)
      }, this.config.debounceTime)
    })
  }

  private async executeAttempt(reinviteCallback: () => Promise<void>): Promise<boolean> {
    if (this.state.totalAttempts >= this.config.maxAttempts) {
      this.logger.warn(`Max reinvite attempts (${this.config.maxAttempts}) reached`)
      this.emit('reinvite.failed', true)
      return false
    }

    this.state.isActive = true
    this.state.totalAttempts++
    this.state.lastAttemptTime = Date.now()
    
    const attempt: ReinviteAttempt = {
      attemptNumber: this.state.totalAttempts,
      timestamp: this.state.lastAttemptTime,
      timeoutTime: this.config.timeoutTime
    }
    
    this.state.currentAttempt = attempt
    this.emit('reinvite.attempting', attempt)
    
    try {
      // Set up timeout for this attempt
      const timeoutPromise = new Promise<never>((_, reject) => {
        this.attemptTimer = setTimeout(() => {
          reject(new Error('Reinvite attempt timed out'))
        }, this.config.timeoutTime)
      })
      
      // Race between reinvite callback and timeout
      await Promise.race([
        reinviteCallback(),
        timeoutPromise
      ])
      
      // Success - clear timers and update state
      this.clearTimers()
      this.state.isActive = false
      this.state.currentAttempt = undefined
      
      this.logger.info(`Reinvite attempt ${attempt.attemptNumber} succeeded`)
      this.emit('reinvite.succeeded')
      return true
      
    } catch (error) {
      this.clearTimers()
      this.state.currentAttempt = undefined
      
      const isTimeout = error instanceof Error && error.message.includes('timed out')
      const isFinalAttempt = this.state.totalAttempts >= this.config.maxAttempts
      
      this.logger.warn(`Reinvite attempt ${attempt.attemptNumber} failed:`, error)
      
      if (isTimeout) {
        this.emit('reinvite.timeout', attempt)
      }
      
      if (isFinalAttempt) {
        this.state.isActive = false
        this.emit('reinvite.failed', true)
        return false
      } else {
        // Schedule retry with delay
        return this.scheduleRetry(reinviteCallback)
      }
    }
  }

  private scheduleRetry(reinviteCallback: () => Promise<void>): Promise<boolean> {
    return new Promise((resolve) => {
      this.logger.debug(`Scheduling reinvite retry in ${this.config.retryDelay}ms`)
      
      this.retryTimer = setTimeout(async () => {
        const result = await this.executeAttempt(reinviteCallback)
        resolve(result)
      }, this.config.retryDelay)
    })
  }

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = undefined
    }
    
    if (this.attemptTimer) {
      clearTimeout(this.attemptTimer)
      this.attemptTimer = undefined
    }
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }
  }

  private emit<K extends keyof ReinviteEvents>(
    event: K,
    ...args: Parameters<ReinviteEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          this.logger.error(`Error in reinvite event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Cleanup and destroy the reinvite engine
   */
  public destroy(): void {
    this.stop()
    this.eventListeners.clear()
    this.logger.debug('ReinviteEngine destroyed')
  }
}