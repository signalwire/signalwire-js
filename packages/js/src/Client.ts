import { logger, connect, BaseClient, actions } from '@signalwire/core'
import { Room, ConnectionOptions, RoomObject } from '@signalwire/webrtc'
import { SagaIterator } from 'redux-saga'
import { take, call } from 'redux-saga/effects'
import { videoElementFactory } from './utils/videoElementFactory'

export interface MakeRoomOptions extends ConnectionOptions {
  rootElementId?: string
  applyLocalVideoOverlay?: boolean
  stopCameraWhileMuted?: boolean
  stopMicrophoneWhileMuted?: boolean
}

export class Client extends BaseClient {
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

        const room: RoomObject = connect({
          store: this.store,
          Component: Room,
          componentListeners: {
            state: 'onStateChange',
            remoteSDP: 'onRemoteSDP',
            roomId: 'onRoomSubscribed',
            errors: 'onError',
            responses: 'onSuccess',
          },
        })({
          ...options,
          emitter: this.options.emitter,
        })

        window.sessionStorage.setItem(room.id, JSON.stringify(makeRoomOptions))
        room.once('destroy', () => {
          window.sessionStorage.removeItem(room.id)
        })

        if (rootElementId) {
          const {
            rtcTrackHandler,
            destroyHandler,
            layoutChangedHandler,
            showOverlay,
            hideOverlay,
          } = videoElementFactory({ rootElementId, applyLocalVideoOverlay })

          room.on('layout.changed', (params: any) => {
            if (room.peer.hasVideoSender && room.localStream) {
              layoutChangedHandler({
                layout: params.layout,
                localStream: room.localStream,
                myMemberId: room.memberId,
              })
            }
          })

          room.on('member.updated.video_muted', (params: any) => {
            try {
              const { member } = params
              if (member.id === room.memberId && 'video_muted' in member) {
                member.video_muted
                  ? hideOverlay(member.id)
                  : showOverlay(member.id)
              }
            } catch (error) {
              logger.error('Error handling video_muted', error)
            }
          })
          room.on('track', rtcTrackHandler)
          room.once('destroy', destroyHandler)
        }

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

export function* vertoAttachWatcher({
  instance,
}: {
  instance: Client
}): SagaIterator {
  while (true) {
    try {
      const action = yield take(actions.vertoAttachAction.type)
      console.debug(
        '>> vertoAttachWatcher',
        instance.id,
        JSON.stringify(action, null, 2)
      )
      const { payload } = action

      const prevOptions = JSON.parse(
        window.sessionStorage.getItem(payload.callID) ?? '{}'
      )
      logger.info('>> prevOptions', prevOptions)
      const roomObj = instance.rooms.makeRoomObject({
        ...prevOptions,
        remoteSdp: payload.sdp,
        attach: true,
      })

      roomObj.id = payload.callID
      logger.info('>> ATTACHED ROOM', roomObj)

      yield call(roomObj.answer)
    } catch (error) {}
  }
}
