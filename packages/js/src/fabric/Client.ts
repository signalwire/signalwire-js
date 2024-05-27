import { BaseClient, ClientEvents, actions } from '@signalwire/core'
import type { CustomSaga } from '@signalwire/core'
import { MakeRoomOptions } from '../video'
import { createCallFabricRoomSessionObject } from './CallFabricRoomSession'
import {
  makeAudioElementSaga,
  makeVideoElementSaga,
} from '../features/mediaElements/mediaElementsSagas'
import { RoomSessionConnection } from '../BaseRoomSession'

export class Client extends BaseClient<ClientEvents> {
  makeCallFabricObject(makeRoomOptions: MakeRoomOptions) {
    const {
      rootElement,
      applyLocalVideoOverlay = true,
      stopCameraWhileMuted = true,
      stopMicrophoneWhileMuted = true,
      ...options
    } = makeRoomOptions

    // TODO: This might not be needed here. We can initiate these sagas in the BaseRoomSession constructor.
    const customSagas: Array<CustomSaga<RoomSessionConnection>> = []

    /**
     * By default the SDK will attach the audio to
     * an Audio element (regardless of "rootElement")
     */
    customSagas.push(
      makeAudioElementSaga({
        speakerId: options.speakerId,
      })
    )

    /**
     * If the user provides a `rootElement` we'll
     * automatically handle the Video element for them
     */
    if (rootElement) {
      customSagas.push(
        makeVideoElementSaga({
          rootElement,
          applyLocalVideoOverlay,
        })
      )
    }

    const room = createCallFabricRoomSessionObject({
      ...options,
      store: this.store,
      customSagas,
    })

    room.on('room.subscribed', (params) => {
      const member = params.room_session.members?.find(
        (m) => m.id === room.memberId
      )

      if (member?.audio_muted) {
        try {
          room.stopOutboundAudio()
        } catch (error) {
          this.logger.error('Error handling audio_muted', error)
        }
      }

      if (member?.video_muted) {
        try {
          room.stopOutboundVideo()
        } catch (error) {
          this.logger.error('Error handling video_muted', error)
        }
      }
    })

    /**
     * If the user joins with `join_video_muted: true` or
     * `join_audio_muted: true` we'll stop the streams
     * right away.
     */
    room.on('room.subscribed', (params) => {
      const member = params.room_session.members?.find(
        (m) => m.id === room.memberId
      )

      if (member?.audio_muted) {
        try {
          room.stopOutboundAudio()
        } catch (error) {
          this.logger.error('Error handling audio_muted', error)
        }
      }

      if (member?.video_muted) {
        try {
          room.stopOutboundVideo()
        } catch (error) {
          this.logger.error('Error handling video_muted', error)
        }
      }
    })

    /**
     * If the user joins with `join_video_muted: true` or
     * `join_audio_muted: true` we'll stop the streams
     * right away.
     */
    room.on('room.subscribed', (params) => {
      const member = params.room_session.members?.find(
        (m) => m.id === room.memberId
      )

      if (member?.audio_muted) {
        try {
          room.stopOutboundAudio()
        } catch (error) {
          this.logger.error('Error handling audio_muted', error)
        }
      }

      if (member?.video_muted) {
        try {
          room.stopOutboundVideo()
        } catch (error) {
          this.logger.error('Error handling video_muted', error)
        }
      }
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
          this.logger.error('Error handling audio_muted', error)
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
          this.logger.error('Error handling video_muted', error)
        }
      })
    }

    return room
  }

  /**
   * Reauthenticate with the SignalWire network using a new token
   * For now it returns void since with an invalid token the server
   * will close the connection right away so we can hook on the session
   * events in case. Need to improve it.
   *
   * @internal
   */
  reauthenticate(token: string) {
    this.store.dispatch(actions.reauthAction({ token }))
  }
}
