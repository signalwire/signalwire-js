import {
  BaseClient,
  ClientEvents,
  ClientContract,
  actions,
  Chat as ChatNamespace,
  PubSub as PubSubNamespace,
} from '@signalwire/core'
import type { CustomSaga } from '@signalwire/core'
import { ConnectionOptions } from '@signalwire/webrtc'
import { makeAudioElementSaga } from './features/mediaElements/mediaElementsSagas'
import {
  createBaseRoomSessionObject,
  RoomSessionConnection,
} from './BaseRoomSession'
import { VideoManager, createVideoManagerObject } from './cantina'
import type { Client as ChatClient } from './chat/Client'
import type { Client as PubSubClient } from './pubSub/Client'
import { buildVideoElement } from './buildVideoElement'

export interface Client extends ClientContract<Client, ClientEvents> {
  rooms: ClientAPI['rooms']
  chat: ClientAPI['chat']
  pubSub: ClientAPI['pubSub']
}

export interface MakeRoomOptions extends ConnectionOptions {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement
  /** Whether to apply the local-overlay on top of your video. Default: `true`. */
  applyLocalVideoOverlay?: boolean
  /** Whether to apply an overlay on top of each member. Default: `true`. */
  applyMemberOverlay?: boolean
  /** Whether to mirror the local video overlay. Default: `false`. */
  mirrorLocalVideoOverlay?: boolean
  /** Whether to stop the camera when the member is muted. Default: `true`. */
  stopCameraWhileMuted?: boolean
  /** Whether to stop the microphone when the member is muted. Default: `true`. */
  stopMicrophoneWhileMuted?: boolean
  /** Local media stream to override the local video and audio stream tracks */
  localStream?: MediaStream
}

export class ClientAPI extends BaseClient<ClientEvents> {
  private _videoManager: VideoManager
  private _chat: ChatClient
  private _pubSub: PubSubClient

  get rooms() {
    return {
      makeRoomObject: (makeRoomOptions: MakeRoomOptions) => {
        const {
          rootElement,
          applyLocalVideoOverlay = true,
          applyMemberOverlay = true,
          mirrorLocalVideoOverlay = true,
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

        const room = createBaseRoomSessionObject({
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
      },
    }
  }

  get chat() {
    if (!this._chat) {
      this._chat = ChatNamespace.createBaseChatObject<ChatClient>({
        store: this.store,
      })
    }
    return this._chat
  }

  get pubSub() {
    if (!this._pubSub) {
      this._pubSub = PubSubNamespace.createBasePubSubObject<PubSubClient>({
        store: this.store,
      })
    }
    return this._pubSub
  }

  /** @internal */
  get videoManager() {
    if (!this._videoManager) {
      this._videoManager = createVideoManagerObject(this.options)
    }
    return this._videoManager
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
