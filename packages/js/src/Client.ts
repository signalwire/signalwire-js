import {
  logger,
  BaseClient,
  ClientEvents,
  ClientContract,
  SessionState,
} from '@signalwire/core'
import type { CustomSaga } from '@signalwire/core'
import { ConnectionOptions } from '@signalwire/webrtc'
import { makeMediaElementsSaga } from './features/mediaElements/mediaElementsSagas'
import { RoomSession } from './RoomSession'
import {
  createBaseRoomSessionObject,
  RoomSessionConnection,
} from './BaseRoomSession'
import { Cantina, createCantinaObject } from './cantina'

export interface Client<RoomSessionType = RoomSession>
  extends ClientContract<Client<RoomSessionType>, ClientEvents> {
  rooms: ClientAPI<RoomSessionType>['rooms']
}

export interface MakeRoomOptions extends ConnectionOptions {
  rootElement?: HTMLElement
  applyLocalVideoOverlay?: boolean
  stopCameraWhileMuted?: boolean
  stopMicrophoneWhileMuted?: boolean
}

export class ClientAPI<
  RoomSessionType = RoomSession
> extends BaseClient<ClientEvents> {
  private _cantina: Cantina

  onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this._cantina.subscribe()
    }
  }

  get rooms() {
    return {
      makeRoomObject: (makeRoomOptions: MakeRoomOptions) => {
        const {
          rootElement,
          applyLocalVideoOverlay = true,
          stopCameraWhileMuted = true,
          stopMicrophoneWhileMuted = true,
          ...options
        } = makeRoomOptions

        const customSagas: Array<CustomSaga<RoomSessionConnection>> = []

        /**
         * If the user provides a `roomElement` we'll
         * automatically handle the Audio and Video elements
         * for them
         */
        if (rootElement) {
          customSagas.push(
            makeMediaElementsSaga({
              rootElement,
              applyLocalVideoOverlay,
              speakerId: options.speakerId,
            })
          )
        }

        const room = createBaseRoomSessionObject<RoomSessionType>({
          ...options,
          store: this.store,
          // @ts-expect-error
          emitter: this.emitter,
          customSagas,
        })

        /**
         * Stop and Restore outbound audio on audio_muted event
         */
        if (stopMicrophoneWhileMuted) {
          room.on('member.updated.audio_muted', ({ member }) => {
            try {
              if (member.id === room.memberId && 'audio_muted' in member) {
                member.audio_muted
                  ? room.stopOutboundAudio()
                  : room.restoreOutboundAudio()
              }
            } catch (error) {
              logger.error('Error handling audio_muted', error)
            }
          })
        }

        /**
         * Stop and Restore outbound video on video_muted event
         */
        if (stopCameraWhileMuted) {
          room.on('member.updated.video_muted', ({ member }) => {
            try {
              if (member.id === room.memberId && 'video_muted' in member) {
                member.video_muted
                  ? room.stopOutboundVideo()
                  : room.restoreOutboundVideo()
              }
            } catch (error) {
              logger.error('Error handling video_muted', error)
            }
          })
        }

        return room
      },
    }
  }

  get cantina() {
    if (!this._cantina) {
      this._cantina = createCantinaObject(this.options)
    }
    return this._cantina
  }
}
