import {
  BaseComponentContract,
  BaseConnectionState,
  connect,
  EventEmitter,
  LOCAL_EVENT_PREFIX,
} from '@signalwire/core'
import {
  BaseConnection,
  BaseConnectionOptions,
  createSpeakerDeviceWatcher,
  getDisplayMedia,
  getSpeakerById,
  supportsMediaOutput,
  MediaEventNames,
} from '@signalwire/webrtc'
import { LocalVideoOverlay, OverlayMap } from './VideoOverlays'
import {
  AudioElement,
  BaseRoomSessionContract,
  StartScreenShareOptions,
} from './utils/interfaces'
import { SCREENSHARE_AUDIO_CONSTRAINTS } from './utils/constants'
import { addOverlayPrefix } from './utils/roomSession'
import { audioSetSpeakerAction } from './features/actions'
import {
  RoomSessionScreenShare,
  RoomSessionScreenShareAPI,
  RoomSessionScreenShareConnection,
  RoomSessionScreenShareEvents,
} from './RoomSessionScreenShare'
import * as workers from './video/workers'
import {
  VisibilityConfig,
  VisibilityState,
  MediaStateSnapshot,
  RecoveryStrategy,
  RecoveryStatus,
  VisibilityManager,
  MobileContext,
  DEFAULT_VISIBILITY_CONFIG,
} from './visibility'

export interface BaseRoomSession<
  EventTypes extends EventEmitter.ValidEventTypes = BaseRoomSessionEvents
> extends BaseRoomSessionContract,
    BaseConnection<EventTypes>,
    BaseComponentContract {}

export interface BaseRoomSessionOptions extends BaseConnectionOptions {
  /**
   * Configuration for visibility lifecycle management
   * This feature helps maintain WebRTC connections when tabs are hidden/restored
   * @default undefined (disabled)
   */
  visibilityConfig?: VisibilityConfig
}

export class BaseRoomSessionConnection<
    EventTypes extends EventEmitter.ValidEventTypes = BaseRoomSessionEvents
  >
  extends BaseConnection<EventTypes>
  implements BaseRoomSessionContract
{
  private _screenShareList = new Set<RoomSessionScreenShare>()
  private _audioEl: AudioElement
  private _overlayMap: OverlayMap
  private _localVideoOverlay: LocalVideoOverlay
  private _visibilityWorkerTask?: any
  private _visibilityManager?: VisibilityManager
  private _visibilityConfig?: VisibilityConfig
  private _mediaStateSnapshot?: MediaStateSnapshot
  private _recoveryStatus: RecoveryStatus = {
    inProgress: false,
    lastAttempt: null,
    lastSuccess: null,
    lastSuccessStrategy: null,
    failureCount: 0,
  }

  get audioEl() {
    return this._audioEl
  }

  set overlayMap(map: OverlayMap) {
    this._overlayMap = map
  }

  get overlayMap() {
    return this._overlayMap
  }

  set localVideoOverlay(overlay: LocalVideoOverlay) {
    this._localVideoOverlay = overlay
  }

  get localVideoOverlay() {
    return this._localVideoOverlay
  }

  get screenShareList() {
    return Array.from(this._screenShareList)
  }

  private _attachSpeakerTrackListener() {
    if (!supportsMediaOutput()) return

    // @TODO: Stop the watcher when user leave/disconnects
    createSpeakerDeviceWatcher().then((deviceWatcher) => {
      deviceWatcher.on('removed', async (data) => {
        const sinkId = this._audioEl.sinkId
        const disconnectedSpeaker = data.changes.find((device) => {
          const payloadDeviceId = device.payload.deviceId

          return (
            payloadDeviceId === sinkId ||
            (payloadDeviceId === '' && sinkId === 'default') ||
            (payloadDeviceId === 'default' && sinkId === '')
          )
        })
        if (disconnectedSpeaker) {
          this.emit('speaker.disconnected', {
            deviceId: disconnectedSpeaker.payload.deviceId,
            label: disconnectedSpeaker.payload.label,
          })

          /**
           * In case the currently in-use speaker disconnects, OS by default fallbacks to the default speaker
           * Set the sink id here to make the SDK consistent with the OS
           */
          await this._audioEl.setSinkId?.('')

          const defaultSpeakers = await getSpeakerById('default')

          if (!defaultSpeakers?.deviceId) return

          // Emit the speaker.updated event since the OS will fallback to the default speaker
          this.emit('speaker.updated', {
            previous: {
              deviceId: disconnectedSpeaker.payload.deviceId,
              label: disconnectedSpeaker.payload.label,
            },
            current: {
              deviceId: defaultSpeakers.deviceId,
              label: defaultSpeakers.label,
            },
          })
        }
      })
    })
  }

  /** @internal */
  protected override _finalize() {
    this._screenShareList.clear()

    super._finalize()
  }

  /** @internal */
  override async hangup(id?: string) {
    this._screenShareList.forEach((screenShare) => {
      screenShare.leave()
    })

    // Clean up visibility worker if it exists
    if (this._visibilityWorkerTask) {
      this._visibilityWorkerTask.cancel()
      this._visibilityWorkerTask = undefined
    }
    
    // Clean up visibility manager
    if (this._visibilityManager) {
      this._visibilityManager.destroy()
      this._visibilityManager = undefined
    }

    return super.hangup(id)
  }

  leave() {
    return this.hangup()
  }

  /**
   * This method will be called by `join()` right before the
   * `connect()` happens and it's a way for us to control
   * exactly when the workers are attached.
   * @internal
   */
  attachPreConnectWorkers() {
    this.runWorker('memberListUpdated', {
      worker: workers.memberListUpdatedWorker,
    })

    // Initialize visibility worker if configured
    const options = this.options as BaseRoomSessionOptions
    if (options.visibilityConfig && options.visibilityConfig.enabled !== false) {
      this.initVisibilityWorker()
    }
  }

  /**
   * Initialize the visibility lifecycle management worker
   * @internal
   */
  private initVisibilityWorker() {
    const options = this.options as BaseRoomSessionOptions
    const { visibilityWorker } = require('./workers')
    
    // Store visibility config
    this._visibilityConfig = options.visibilityConfig
    
    // Initialize visibility manager
    this._visibilityManager = new VisibilityManager(this as any, this._visibilityConfig)
    
    // Set up visibility event forwarding
    this._visibilityManager.on('visibility.changed', (event: any) => {
      (this as any).emit('visibility.changed', event)
    })
    
    this._visibilityManager.on('visibility.focus.gained', (event: any) => {
      (this as any).emit('visibility.focus.gained', event)
    })
    
    this._visibilityManager.on('visibility.focus.lost', (event: any) => {
      (this as any).emit('visibility.focus.lost', event)
    })
    
    this._visibilityManager.on('visibility.devices.changed', (event: any) => {
      (this as any).emit('visibility.device.changed', event)
    })
    
    this._visibilityManager.on('visibility.recovery.started', (event: any) => {
      this._recoveryStatus.inProgress = true
      this._recoveryStatus.lastAttempt = Date.now()
      ;(this as any).emit('visibility.recovery.started', event)
    })
    
    this._visibilityManager.on('visibility.recovery.success', (event: any) => {
      this._recoveryStatus.inProgress = false
      this._recoveryStatus.lastSuccess = Date.now()
      this._recoveryStatus.lastSuccessStrategy = event.strategy
      this._recoveryStatus.failureCount = 0
      ;(this as any).emit('visibility.recovery.success', event)
    })
    
    this._visibilityManager.on('visibility.recovery.failed', (event: any) => {
      this._recoveryStatus.inProgress = false
      this._recoveryStatus.failureCount++
      ;(this as any).emit('visibility.recovery.failed', event)
    })
    
    // Run the worker
    this._visibilityWorkerTask = this.runWorker('visibilityWorker', {
      worker: visibilityWorker,
      // Pass parameters through the worker options
      initialArgs: {
        instance: this,
        visibilityConfig: options.visibilityConfig,
        visibilityManager: this._visibilityManager,
      },
    } as any)
  }

  /** @internal */
  getAudioEl() {
    if (this._audioEl) return this._audioEl
    this._audioEl = new Audio()
    this._attachSpeakerTrackListener()
    return this._audioEl
  }

  getMemberOverlay(memberId: string) {
    return this.overlayMap.get(addOverlayPrefix(memberId))
  }

  /**
   * Allow sharing the screen within the room.
   */
  async startScreenShare(opts: StartScreenShareOptions = {}) {
    return new Promise<RoomSessionScreenShare>(async (resolve, reject) => {
      const {
        autoJoin = true,
        audio = false,
        video = true,
        layout,
        positions,
      } = opts
      try {
        const displayStream: MediaStream = await getDisplayMedia({
          audio: audio === true ? SCREENSHARE_AUDIO_CONSTRAINTS : audio,
          video,
        })
        const options: BaseConnectionOptions = {
          ...this.options,
          screenShare: true,
          recoverCall: false,
          localStream: displayStream,
          remoteStream: undefined,
          userVariables: {
            ...(this.options?.userVariables || {}),
            memberCallId: this.callId,
            memberId: this.memberId,
          },
          layout,
          positions,
        }

        const screenShare = connect<
          RoomSessionScreenShareEvents,
          RoomSessionScreenShareConnection,
          RoomSessionScreenShare
        >({
          store: this.store,
          Component: RoomSessionScreenShareAPI,
        })(options)

        /**
         * Hangup if the user stop the screenShare from the
         * native browser button or if the videoTrack ends.
         */
        displayStream.getVideoTracks().forEach((t) => {
          t.addEventListener('ended', () => {
            if (screenShare && screenShare.active) {
              screenShare.leave()
            }
          })
        })

        screenShare.once('destroy', () => {
          screenShare.emit('room.left')
          this._screenShareList.delete(screenShare)
        })

        screenShare.runWorker('childMemberJoinedWorker', {
          worker: workers.childMemberJoinedWorker,
          onDone: () => resolve(screenShare),
          onFail: reject,
          initialState: {
            parentId: this.memberId,
          },
        })

        this._screenShareList.add(screenShare)
        if (autoJoin) {
          return await screenShare.join()
        }
        return resolve(screenShare)
      } catch (error) {
        this.logger.error('ScreenShare Error', error)
        reject(error)
      }
    })
  }

  updateSpeaker({ deviceId }: { deviceId: string }) {
    const prevId = this.audioEl.sinkId as string
    this.once(
      // @ts-expect-error
      `${LOCAL_EVENT_PREFIX}.speaker.updated`,
      async (newId: string) => {
        const prevSpeaker = await getSpeakerById(prevId)
        const newSpeaker = await getSpeakerById(newId)

        const isSame = newSpeaker?.deviceId === prevSpeaker?.deviceId
        if (!newSpeaker?.deviceId || isSame) return

        this.emit('speaker.updated', {
          previous: {
            deviceId: prevSpeaker?.deviceId,
            label: prevSpeaker?.label,
          },
          current: {
            deviceId: newSpeaker.deviceId,
            label: newSpeaker.label,
          },
        })
      }
    )

    return this.triggerCustomSaga<undefined>(audioSetSpeakerAction(deviceId))
  }

  /**
   * Get the current visibility state
   * @returns Current visibility and focus state information
   */
  getVisibilityState(): {
    visibility: VisibilityState | null
    mobileContext: MobileContext | null
    recoveryStatus: RecoveryStatus
    isBackgrounded: boolean
  } {
    if (!this._visibilityManager) {
      return {
        visibility: null,
        mobileContext: null,
        recoveryStatus: this._recoveryStatus,
        isBackgrounded: false,
      }
    }

    return {
      visibility: this._visibilityManager.getVisibilityState(),
      mobileContext: this._visibilityManager.getMobileContext(),
      recoveryStatus: this._visibilityManager.getRecoveryStatus(),
      isBackgrounded: this._visibilityManager.isBackgrounded(),
    }
  }

  /**
   * Update visibility configuration at runtime
   * @param config New visibility configuration
   */
  setVisibilityConfig(config: Partial<VisibilityConfig>): void {
    const currentConfig = this._visibilityConfig || DEFAULT_VISIBILITY_CONFIG
    this._visibilityConfig = { ...currentConfig, ...config }
    
    if (this._visibilityManager) {
      this._visibilityManager.updateVisibilityConfig(this._visibilityConfig)
    }
    
    this.logger.debug('Updated visibility config:', this._visibilityConfig)
  }

  /**
   * Get the current media state snapshot
   * @returns Current media state or null if not available
   */
  getMediaStateSnapshot(): MediaStateSnapshot | null {
    if (!this._visibilityManager) {
      return null
    }
    
    // The VisibilityManager doesn't expose captureMediaState directly,
    // but it handles media state internally. We return the last captured state.
    return this._mediaStateSnapshot || null
  }

  /**
   * Force a recovery attempt with specified strategies
   * @param strategies Array of recovery strategies to try
   * @returns Promise that resolves when recovery completes
   */
  async forceRecovery(strategies?: RecoveryStrategy[]): Promise<boolean> {
    if (this._recoveryStatus.inProgress) {
      this.logger.warn('Recovery already in progress')
      return false
    }

    this._recoveryStatus.inProgress = true
    this._recoveryStatus.lastAttempt = Date.now()
    
    ;(this as any).emit('visibility.recovery.started', {
      strategies: strategies || Object.values(RecoveryStrategy),
      timestamp: Date.now(),
    })

    try {
      const strategiesToTry = strategies || [
        RecoveryStrategy.VideoPlay,
        RecoveryStrategy.KeyframeRequest,
        RecoveryStrategy.StreamReconnection,
      ]

      let success = false
      for (const strategy of strategiesToTry) {
        this.logger.debug(`Attempting recovery with strategy: ${strategy}`)
        
        const result = await this._executeRecoveryStrategy(strategy)
        if (result) {
          this._recoveryStatus.lastSuccess = Date.now()
          this._recoveryStatus.lastSuccessStrategy = strategy
          this._recoveryStatus.failureCount = 0
          success = true
          
          ;(this as any).emit('visibility.recovery.success', {
            strategy,
            timestamp: Date.now(),
          })
          break
        }
      }

      if (!success) {
        this._recoveryStatus.failureCount++
        ;(this as any).emit('visibility.recovery.failed', {
          strategies: strategiesToTry,
          failureCount: this._recoveryStatus.failureCount,
          timestamp: Date.now(),
        })
      }

      return success
    } finally {
      this._recoveryStatus.inProgress = false
    }
  }

  /**
   * Execute a specific recovery strategy
   * @internal
   */
  private async _executeRecoveryStrategy(strategy: RecoveryStrategy): Promise<boolean> {
    try {
      switch (strategy) {
        case RecoveryStrategy.VideoPlay:
          // Try to play video elements
          return await this._attemptVideoPlayRecovery()
        
        case RecoveryStrategy.KeyframeRequest:
          // Request keyframe from remote peers
          return await this._attemptKeyframeRecovery()
        
        case RecoveryStrategy.StreamReconnection:
          // Reconnect local streams
          return await this._attemptStreamReconnection()
        
        case RecoveryStrategy.Reinvite:
          // Full renegotiation
          return await this._attemptReinvite()
        
        case RecoveryStrategy.LayoutRefresh:
          // Refresh layout (Video SDK specific)
          return await this._attemptLayoutRefresh()
        
        default:
          this.logger.warn(`Unknown recovery strategy: ${strategy}`)
          return false
      }
    } catch (error) {
      this.logger.error(`Recovery strategy ${strategy} failed:`, error)
      return false
    }
  }

  /**
   * Attempt video play recovery
   * @internal
   */
  private async _attemptVideoPlayRecovery(): Promise<boolean> {
    try {
      const videoElements: HTMLVideoElement[] = []
      
      // Get local video element if exists
      if (this._localVideoOverlay?.domElement instanceof HTMLVideoElement) {
        videoElements.push(this._localVideoOverlay.domElement)
      }
      
      // Get remote video elements
      if (this._overlayMap) {
        this._overlayMap.forEach((overlay) => {
          if (overlay.domElement instanceof HTMLVideoElement) {
            videoElements.push(overlay.domElement)
          }
        })
      }
      
      // Try to play all video elements
      const playPromises = videoElements.map(async (video) => {
        if (video.paused) {
          try {
            await video.play()
            return true
          } catch (err) {
            this.logger.warn('Failed to play video element:', err)
            return false
          }
        }
        return true
      })
      
      const results = await Promise.all(playPromises)
      return results.every(r => r)
    } catch (error) {
      this.logger.error('Video play recovery failed:', error)
      return false
    }
  }

  /**
   * Attempt keyframe recovery
   * @internal
   */
  private async _attemptKeyframeRecovery(): Promise<boolean> {
    try {
      if (!this.peer) {
        return false
      }
      
      // Send PLI (Picture Loss Indication) for all video receivers
      const receivers = (this.peer as any).instance?.getReceivers?.() || []
      for (const receiver of receivers) {
        if (receiver.track?.kind === 'video') {
          // @ts-ignore - PLI support might not be typed
          if (receiver.generateKeyFrame) {
            await receiver.generateKeyFrame()
          }
        }
      }
      
      return true
    } catch (error) {
      this.logger.error('Keyframe recovery failed:', error)
      return false
    }
  }

  /**
   * Attempt stream reconnection
   * @internal
   */
  private async _attemptStreamReconnection(): Promise<boolean> {
    try {
      // This would reconnect local streams
      // Implementation depends on specific session type
      ;(this as any).emit('visibility.recovery.reconnecting')
      
      // Manual recovery through visibility manager
      if (this._visibilityManager) {
        return await this._visibilityManager.triggerManualRecovery()
      }
      
      return false
    } catch (error) {
      this.logger.error('Stream reconnection failed:', error)
      return false
    }
  }

  /**
   * Attempt full reinvite
   * @internal
   */
  private async _attemptReinvite(): Promise<boolean> {
    try {
      // Full renegotiation - implementation depends on session type
      ;(this as any).emit('visibility.recovery.reinviting')
      
      // This would typically trigger a full renegotiation
      // Implementation varies by session type (Video vs Call Fabric)
      return false // Placeholder - needs session-specific implementation
    } catch (error) {
      this.logger.error('Reinvite recovery failed:', error)
      return false
    }
  }

  /**
   * Attempt layout refresh (Video SDK specific)
   * @internal
   */
  private async _attemptLayoutRefresh(): Promise<boolean> {
    try {
      // This is Video SDK specific
      // Would refresh the current layout
      ;(this as any).emit('visibility.recovery.layout_refresh')
      
      if (this._visibilityManager) {
        return await this._visibilityManager.refreshLayout()
      }
      
      return false
    } catch (error) {
      this.logger.error('Layout refresh failed:', error)
      return false
    }
  }

  /**
   * Register a callback for recovery hooks
   * @param event Recovery event name
   * @param callback Callback function
   */
  onRecovery(
    event: 'before' | 'after' | 'success' | 'failed',
    callback: (data: any) => void | Promise<void>
  ): void {
    const eventMap = {
      before: 'visibility.recovery.started',
      after: 'visibility.recovery.completed',
      success: 'visibility.recovery.success',
      failed: 'visibility.recovery.failed',
    }
    
    const eventName = eventMap[event]
    if (eventName) {
      ;(this as any).on(eventName, callback)
    }
  }

  /**
   * Check if visibility management is enabled
   * @returns True if visibility management is active
   */
  isVisibilityManagementEnabled(): boolean {
    return !!this._visibilityManager
  }

  /**
   * Get mobile context information
   * @returns Mobile context or null if not on mobile
   */
  getMobileContext(): MobileContext | null {
    if (!this._visibilityManager) {
      return null
    }
    return this._visibilityManager.getMobileContext()
  }
}

type BaseRoomSessionEventsHandlerMap = Record<
  BaseConnectionState,
  (params: BaseRoomSession<BaseRoomSessionEvents>) => void
> &
  Record<MediaEventNames, () => void> & {
  // Visibility events
  'visibility.changed': (event: { state: VisibilityState; timestamp: number }) => void
  'visibility.focus.gained': (event: any) => void
  'visibility.focus.lost': (event: any) => void
  'visibility.page.show': (event: any) => void
  'visibility.page.hide': (event: any) => void
  'visibility.device.changed': (event: any) => void
  'visibility.wake.detected': (event: any) => void
  'visibility.recovery.started': (event: { strategies: RecoveryStrategy[]; timestamp: number }) => void
  'visibility.recovery.success': (event: { strategy: RecoveryStrategy; timestamp: number }) => void
  'visibility.recovery.failed': (event: { strategies: RecoveryStrategy[]; failureCount: number; timestamp: number }) => void
  'visibility.recovery.reconnecting': () => void
  'visibility.recovery.reinviting': () => void
  'visibility.recovery.layout_refresh': () => void
}

export type BaseRoomSessionEvents = {
  [k in keyof BaseRoomSessionEventsHandlerMap]: BaseRoomSessionEventsHandlerMap[k]
}

/** @internal */
export const createBaseRoomSessionObject = (
  params: BaseRoomSessionOptions
): BaseRoomSession<BaseRoomSessionEvents> => {
  const room = connect<
    BaseRoomSessionEvents,
    BaseRoomSessionConnection<BaseRoomSessionEvents>,
    BaseRoomSession<BaseRoomSessionEvents>
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: BaseRoomSessionConnection,
  })(params)

  return room
}
