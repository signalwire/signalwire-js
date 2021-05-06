import { SignalWire, connect } from '@signalwire/core'
import { Call } from '@signalwire/webrtc'
import { videoElementFactory } from './utils/videoElementFactory'

export class Client extends SignalWire {
  get rooms() {
    return {
      // TODO: use CallOptions interface here
      makeCall: (options: any) => {
        const call = connect({
          store: this.store,
          Component: Call,
          onStateChangeListeners: {
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
            roomJoinedHandler,
          } = videoElementFactory({ rootElementId, applyLocalVideoOverlay })
          call.on('room.joined', (params: any) => {
            // @ts-ignore
            roomJoinedHandler(call.localVideoTrack, params)
          })
          call.on('track', rtcTrackHandler)
          call.on('destroy', destroyHandler)
        }

        return call
      },
    }
  }
}
