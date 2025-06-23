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
import { LocalVideoOverlay, OverlayMap } from '../../js/src/VideoOverlays'
import {
  AudioElement,
  BaseRoomSessionContract,
  StartScreenShareOptions,
} from '../../js/src/utils/interfaces'
import { SCREENSHARE_AUDIO_CONSTRAINTS } from '../../js/src/utils/constants'
import { addOverlayPrefix } from '../../js/src/utils/roomSession'
import { audioSetSpeakerAction } from '../../js/src/features/actions'
import {
  RoomSessionScreenShare,
  RoomSessionScreenShareAPI,
  RoomSessionScreenShareConnection,
  RoomSessionScreenShareEvents,
} from '../../js/src/RoomSessionScreenShare'
import * as workers from '../../js/src/video/workers'

export interface BaseRoomSession<
  EventTypes extends EventEmitter.ValidEventTypes = BaseRoomSessionEvents
> extends BaseRoomSessionContract,
    BaseConnection<EventTypes>,
    BaseComponentContract {}

export interface BaseRoomSessionOptions extends BaseConnectionOptions {}

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
}

type BaseRoomSessionEventsHandlerMap = Record<
  BaseConnectionState,
  (params: BaseRoomSession<BaseRoomSessionEvents>) => void
> &
  Record<MediaEventNames, () => void>

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
