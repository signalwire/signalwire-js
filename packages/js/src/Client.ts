import { logger, connect, BaseClient, ClientEvents } from '@signalwire/core'
import type { CustomSaga } from '@signalwire/core'
import { ConnectionOptions } from '@signalwire/webrtc'
import { makeMediaElementsSaga } from './features/mediaElements/mediaElementsSagas'
import type { RoomObject } from './utils/interfaces'
import { ROOM_COMPONENT_LISTENERS } from './utils/constants'
import { Room } from './Room'

export interface MakeRoomOptions extends ConnectionOptions {
  rootElementId?: string
  applyLocalVideoOverlay?: boolean
  stopCameraWhileMuted?: boolean
  stopMicrophoneWhileMuted?: boolean
}

export class Client extends BaseClient<ClientEvents> {
  get rooms() {
    return {
      makeRoomObject: (makeRoomOptions: MakeRoomOptions) => {
        const {
          rootElementId,
          applyLocalVideoOverlay = true,
          stopCameraWhileMuted = true,
          stopMicrophoneWhileMuted = true,
          ...options
        } = makeRoomOptions

        const customSagas: Array<CustomSaga<Room>> = []

        /**
         * If the user provides a `roomElementId` we'll automatically
         * handle the Audio and Video elements for them
         */
        if (rootElementId) {
          customSagas.push(
            makeMediaElementsSaga({
              rootElementId,
              applyLocalVideoOverlay,
              speakerId: options.speakerId,
            })
          )
        }

        const room: RoomObject = connect({
          store: this.store,
          Component: Room,
          customSagas,
          componentListeners: ROOM_COMPONENT_LISTENERS,
        })({
          ...options,
          emitter: this.options.emitter,
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
}
