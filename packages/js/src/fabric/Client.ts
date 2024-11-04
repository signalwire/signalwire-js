import { BaseClient, ClientEvents, actions } from '@signalwire/core'
import type {
  CallJoinedEventParams,
  CustomSaga,
  VideoRoomSubscribedEventParams,
} from '@signalwire/core'
import { MakeRoomOptions } from '../video'
import { createCallFabricRoomSessionObject } from './CallFabricRoomSession'
import { makeAudioElementSaga } from '../features/mediaElements/mediaElementsSagas'
import { RoomSessionConnection } from '../BaseRoomSession'
import { buildVideoElement } from './buildVideoElement'

export class Client extends BaseClient<ClientEvents> {
  makeCallFabricObject(makeRoomOptions: MakeRoomOptions) {
    const {
      rootElement,
      applyLocalVideoOverlay = true,
      applyMemberOverlay = true,
      stopCameraWhileMuted = true,
      stopMicrophoneWhileMuted = true,
      mirrorLocalVideoOverlay = true,
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

    const room = createCallFabricRoomSessionObject({
      ...options,
      store: this.store,
      customSagas,
    })

    /**
     * If the user provides a `rootElement` we'll
     * automatically handle the Video element for them
     */
    if (rootElement) {
      try {
        buildVideoElement({
          applyLocalVideoOverlay,
          applyMemberOverlay,
          mirrorLocalVideoOverlay,
          room,
          rootElement,
        })
      } catch (error) {
        this.logger.error('Unable to build the video element automatically')
      }
    }

    /**
     * If the user joins with `join_video_muted: true` or
     * `join_audio_muted: true` we'll stop the streams
     * right away.
     */
    const joinMutedHandler = (
      params: CallJoinedEventParams | VideoRoomSubscribedEventParams
    ) => {
      const member = params.room_session.members?.find(
        (m) => m.id === room.memberId || m.member_id === room.memberId
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
    }

    room.on('room.subscribed', joinMutedHandler)

    /**
     * Stop and Restore outbound audio on audio_muted event
     */
    if (stopMicrophoneWhileMuted) {
      room.on('member.updated.audio_muted', ({ member }) => {
        try {
          if (member.member_id === room.memberId && 'audio_muted' in member) {
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
          if (member.member_id === room.memberId && 'video_muted' in member) {
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
