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
import { DeviceManager } from './device/DeviceManager'
import type { DevicePreferenceConfig } from './device/types'

export interface BaseRoomSession<
  EventTypes extends EventEmitter.ValidEventTypes = BaseRoomSessionEvents
> extends BaseRoomSessionContract,
    BaseConnection<EventTypes>,
    BaseComponentContract {}

export interface BaseRoomSessionOptions extends BaseConnectionOptions {
  /**
   * Device preference management configuration
   * If provided, enables device preference management with DeviceManager
   */
  devicePreferences?: DevicePreferenceConfig
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
  private _deviceManager?: DeviceManager

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

  /**
   * Access to the device manager instance (lazy initialization)
   * Only available if devicePreferences config was provided during initialization
   */
  get deviceManager(): DeviceManager | undefined {
    const config = (this.options as BaseRoomSessionOptions)?.devicePreferences

    if (!config) {
      return undefined
    }

    if (!this._deviceManager) {
      this._deviceManager = new DeviceManager(this as any, config)
    }

    return this._deviceManager
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

    // Clean up device manager if it exists
    if (this._deviceManager) {
      this._deviceManager.destroy()
      this._deviceManager = undefined
    }

    super._finalize()
  }

  /** @internal */
  override async hangup(id?: string) {
    this._screenShareList.forEach((screenShare) => {
      screenShare.leave()
    })

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

    // Register device preference worker if device management is enabled
    if ((this.options as BaseRoomSessionOptions)?.devicePreferences) {
      this.runWorker('devicePreferenceWorker', {
        worker: workers.devicePreferenceWorker,
      })
    }
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

  /**
   * Enhanced updateCamera method with device preference integration
   * @param constraints - Media track constraints including deviceId
   * @param preference - Optional device preference to save
   * @returns Promise<void>
   */
  async updateCamera(
    constraints: MediaTrackConstraints,
    preference?: Partial<import('./device/types').DevicePreference>
  ): Promise<void> {
    // If device manager is enabled and a deviceId is specified, use it for preference management
    if (
      this.deviceManager &&
      constraints.deviceId &&
      typeof constraints.deviceId === 'string'
    ) {
      await this.deviceManager.setCamera(constraints.deviceId, preference)
    } else {
      // Fallback to standard behavior
      await super.updateCamera(constraints)
    }
  }

  /**
   * Enhanced updateMicrophone method with device preference integration
   * @param constraints - Media track constraints including deviceId
   * @param preference - Optional device preference to save
   * @returns Promise<void>
   */
  async updateMicrophone(
    constraints: MediaTrackConstraints,
    preference?: Partial<import('./device/types').DevicePreference>
  ): Promise<void> {
    // If device manager is enabled and a deviceId is specified, use it for preference management
    if (
      this.deviceManager &&
      constraints.deviceId &&
      typeof constraints.deviceId === 'string'
    ) {
      await this.deviceManager.setMicrophone(constraints.deviceId, preference)
    } else {
      // Fallback to standard behavior
      await super.updateMicrophone(constraints)
    }
  }

  /**
   * Enhanced updateSpeaker method with device preference integration
   * @param opts - Options with deviceId
   * @param preference - Optional device preference to save
   * @returns Promise<undefined>
   */
  async updateSpeaker(
    { deviceId }: { deviceId: string },
    preference?: Partial<import('./device/types').DevicePreference>
  ): Promise<undefined> {
    // If device manager is enabled, use it for preference management
    if (this.deviceManager) {
      await this.deviceManager.setSpeaker(deviceId, preference)
      return undefined
    }

    // Fallback to standard behavior
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
}

type DeviceEventNames =
  | 'device.preference.update.failed'
  | 'device.preference.clear.failed'
  | 'device.recovery.failed'

type BaseRoomSessionEventsHandlerMap = Record<
  BaseConnectionState,
  (params: BaseRoomSession<BaseRoomSessionEvents>) => void
> &
  Record<MediaEventNames, () => void> &
  Record<DeviceEventNames, (params: any) => void>

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
