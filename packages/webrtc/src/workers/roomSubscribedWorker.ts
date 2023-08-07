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
  VideoRoomSubscribedEventParams,
  Rooms,
  RoomSessionStream,
  RoomSessionPlayback,
  RoomSessionRecording,
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
  const { swEventChannel } = channels
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

  // New emitter should not change the payload by reference
  const clonedPayload = JSON.parse(JSON.stringify(action.payload))

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

  instance.emit('room.joined', transformPayload.call(instance, clonedPayload))

  getLogger().debug('roomSubscribedWorker ended', rtcPeerId)
}

function transformPayload(
  this: BaseConnection<any>,
  payload: VideoRoomSubscribedEventParams
) {
  const keys = ['room_session', 'room'] as const
  keys.forEach((key) => {
    if (payload[key].recordings) {
      payload[key].recordings = (payload[key].recordings || []).map(
        (recording: any) => {
          let recordingInstance = this.instanceMap.get<RoomSessionRecording>(
            recording.id
          )
          if (!recordingInstance) {
            recordingInstance = Rooms.createRoomSessionRecordingObject({
              store: this.store,
              payload: {
                room_id: payload.room.room_id,
                room_session_id: payload.room_session.id,
                recording,
              },
            })
          } else {
            recordingInstance.setPayload({
              room_id: payload.room.room_id,
              room_session_id: payload.room_session.id,
              recording,
            })
          }
          this.instanceMap.set<RoomSessionRecording>(
            recording.id,
            recordingInstance
          )
          return recordingInstance
        }
      )
    }

    if (payload[key].playbacks) {
      payload[key].playbacks = (payload[key].playbacks || []).map(
        (playback) => {
          let playbackInstance = this.instanceMap.get<RoomSessionPlayback>(
            playback.id
          )
          if (!playbackInstance) {
            playbackInstance = Rooms.createRoomSessionPlaybackObject({
              store: this.store,
              payload: {
                room_id: payload.room.room_id,
                room_session_id: payload.room_session.id,
                playback,
              },
            })
          } else {
            playbackInstance.setPayload({
              room_id: payload.room.room_id,
              room_session_id: payload.room_session.id,
              playback,
            })
          }
          this.instanceMap.set<RoomSessionPlayback>(
            playback.id,
            playbackInstance
          )
          return playbackInstance
        }
      )
    }

    if (payload[key].streams) {
      payload[key].streams = (payload[key].streams || []).map((stream: any) => {
        let streamInstance = this.instanceMap.get<RoomSessionStream>(stream.id)
        if (!streamInstance) {
          streamInstance = Rooms.createRoomSessionStreamObject({
            store: this.store,
            payload: {
              room_id: payload.room.room_id,
              room_session_id: payload.room_session.id,
              stream,
            },
          })
        } else {
          streamInstance.setPayload({
            room_id: payload.room.room_id,
            room_session_id: payload.room_session.id,
            stream,
          })
        }
        this.instanceMap.set<RoomSessionStream>(stream.id, streamInstance)
        return streamInstance
      })
    }
  })

  return payload
}
