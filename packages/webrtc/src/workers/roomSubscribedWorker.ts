import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  VideoRoomSubscribedEvent,
  componentActions,
  Rooms,
  VideoRoomSubscribedEventParams,
} from '@signalwire/core'

import { BaseConnection } from '../BaseConnection'

type RoomSubscribedWorkerOnDone = (args: BaseConnection<any>) => void
type RoomSubscribedWorkerOnFail = (args: { error: Error }) => void

export type RoomSubscribedWorkerHooks = SDKWorkerHooks<
  RoomSubscribedWorkerOnDone,
  RoomSubscribedWorkerOnFail
>

export const roomSubscribedWorker: SDKWorker<
  BaseConnection<any>,
  RoomSubscribedWorkerHooks
> = function* (options): SagaIterator {
  getLogger().debug('roomSubscribedWorker started')
  const { channels, instance, initialState } = options
  const { swEventChannel, pubSubChannel } = channels
  const { rtcPeerId } = initialState
  if (!rtcPeerId) {
    throw new Error('Missing rtcPeerId for roomSubscribedWorker')
  }

  const action: MapToPubSubShape<VideoRoomSubscribedEvent> =
    yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
      if (action.type === 'video.room.subscribed') {
        return action.payload.call_id === rtcPeerId
      }
      return false
    })

  // FIXME: Move to a better place when rework _attachListeners too.
  // @ts-expect-error
  instance._attachListeners(action.payload.room_session.id)

  // // @ts-expect-error
  // instance.applyEmitterTransforms()

  /**
   * In here we joined a room_session so we can swap between RTCPeers
   */
  instance.setActiveRTCPeer(rtcPeerId)

  /**
   * TODO: Replace the redux action/component with properties on RTCPeer instance?
   */
  yield sagaEffects.put(
    componentActions.upsert({
      id: action.payload.call_id,
      roomId: action.payload.room_session.room_id,
      roomSessionId: action.payload.room_session.id,
      memberId: action.payload.member_id,
      previewUrl: action.payload.room_session.preview_url,
    })
  )

  // TODO: Do we still need to return the proxied object?
  instance.baseEmitter.emit(
    'room.joined',
    transformPayload.call(instance, action.payload)
  )

  // // Rename "room.subscribed" with "room.joined" for the end-user
  // yield sagaEffects.put(pubSubChannel, {
  //   type: 'video.room.joined',
  //   payload: action.payload,
  // })

  getLogger().debug('roomSubscribedWorker ended', rtcPeerId)
}

// TODO: We might not need it since the room_session.recordings (possibly others as well) has been deprecated
function transformPayload(
  this: BaseConnection<any>,
  payload: VideoRoomSubscribedEventParams
) {
  if (payload.room_session.recordings) {
    payload.room_session.recordings = payload.room_session.recordings.map(
      (recording) => {
        // TODO: Rename and remove 'RT'
        return Rooms.createRoomSessionRTRecordingObject({
          store: this.store,
          emitter: this.emitter,
          payload: {
            room_id: payload.room.room_id,
            room_session_id: payload.room_session.id,
            recording,
          },
        })
      }
    )
  }

  if (payload.room_session.playbacks) {
    payload.room_session.playbacks = payload.room_session.playbacks.map(
      (playback) => {
        // TODO: Rename and remove 'RT'
        return Rooms.createRoomSessionRTPlaybackObject({
          store: this.store,
          emitter: this.emitter,
          payload: {
            room_id: payload.room.room_id,
            room_session_id: payload.room_session.id,
            playback,
          },
        })
      }
    )
  }

  if (payload.room_session.streams) {
    payload.room_session.streams = payload.room_session.streams.map(
      (stream: any) => {
        // TODO: Rename and remove 'RT'
        return Rooms.createRoomSessionRTStreamObject({
          store: this.store,
          emitter: this.emitter,
          payload: {
            room_id: payload.room.room_id,
            room_session_id: payload.room_session.id,
            stream,
          },
        })
      }
    )
  }

  return payload
}
