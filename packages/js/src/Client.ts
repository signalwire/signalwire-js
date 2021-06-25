import { connect, BaseClient } from '@signalwire/core'
import { Room, ConnectionOptions, RoomObject } from '@signalwire/webrtc'
import { videoElementFactory } from './utils/videoElementFactory'

interface MakeCallOptions extends ConnectionOptions {
  rootElementId?: string
  applyLocalVideoOverlay?: boolean
}

export class Client extends BaseClient {
  get rooms() {
    return {
      makeCall: (options: MakeCallOptions) => {
        const room: RoomObject = connect({
          store: this.store,
          Component: Room,
          componentListeners: {
            state: 'onStateChange',
            remoteSDP: 'onRemoteSDP',
            roomId: 'onRoomId',
            errors: 'onError',
            responses: 'onSuccess',
          },
        })({
          ...options,
          emitter: this.options.emitter,
        })

        const { rootElementId, applyLocalVideoOverlay } = options
        if (rootElementId) {
          const {
            rtcTrackHandler,
            destroyHandler,
            layoutChangedHandler,
          } = videoElementFactory({ rootElementId, applyLocalVideoOverlay })
          room.on('layout.changed', (params) => {
            if (room.localVideoTrack) {
              layoutChangedHandler({
                layout: params.layout,
                localVideoTrack: room.localVideoTrack,
                myMemberId: room.memberId,
              })
            }
          })
          room.on('track', rtcTrackHandler)
          room.on('destroy', destroyHandler)
        }

        return room
      },
    }
  }
}
