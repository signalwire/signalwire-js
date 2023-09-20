import {
  // InternalMemberUpdatedEventNames,
  InternalVideoMemberEntity,
  // MemberPosition,
  RoomEnded,
  RoomStarted,
  RoomSubscribed,
  RoomUpdated,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoRoomEndedAction,
  VideoRoomStartedAction,
  VideoRoomSubscribedAction,
  VideoRoomUpdatedAction,
  getLogger,
  sagaEffects,
  stripNamespacePrefix,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { RoomSession, RoomSessionMember, Video } from '../Video2'
import { createRoomSessionObject } from '../RoomSession'
import { createRoomSessionMemberObject } from '../RoomSessionMember'
// import { videoMemberWorker } from './videoMemberWorker'

interface VideoClientWorkerInitialState {
  video: Video
}

export const videoClientWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoClientWorker started')
  const {
    channels: { swEventChannel },
    initialState,
    instanceMap: { get, set, remove },
  } = options

  const { video } = initialState as VideoClientWorkerInitialState

  function* worker(
    action:
      | VideoRoomStartedAction
      | VideoRoomEndedAction
      | VideoRoomUpdatedAction
      | VideoRoomSubscribedAction
  ) {
    const { type, payload } = action

    let roomSessionInstance = get<RoomSession>(payload.room_session.id)
    if (!roomSessionInstance) {
      roomSessionInstance = createRoomSessionObject({
        // @ts-expect-error
        store: video._client.store,
        payload,
      })
    } else {
      roomSessionInstance.setPayload(payload)
    }
    set<RoomSession>(payload.room_session.id, roomSessionInstance)

    // Create and set member instance if exists
    if ((payload.room_session.members?.length || 0) > 0) {
      ;(payload.room_session.members || []).forEach((member) => {
        let memberInstance = get<RoomSessionMember>(member.id)
        if (!memberInstance) {
          memberInstance = createRoomSessionMemberObject({
            // @ts-expect-error
            store: video._client.store,
            payload: {
              room_id: payload.room_session.room_id,
              room_session_id: payload.room_session.id,
              // @ts-expect-error
              member,
            },
          })
        } else {
          memberInstance.setPayload({
            room_id: payload.room_session.room_id,
            room_session_id: payload.room_session.id,
            member: member as InternalVideoMemberEntity & { talking: boolean },
          })
        }
        set<RoomSessionMember>(member.id, memberInstance)
      })
    }

    const event = stripNamespacePrefix(type) as
      | RoomStarted
      | RoomUpdated
      | RoomEnded
      | RoomSubscribed

    switch (type) {
      case 'video.room.started':
      case 'video.room.updated': {
        // The `room.updated` event is not documented in @RealTimeVideoApiEvents. For now, ignoring TS issue.
        // @ts-expect-error
        video.emit(event, roomSessionInstance)
        roomSessionInstance.emit(event, roomSessionInstance)
        break
      }
      case 'video.room.ended': {
        video.emit(event as RoomEnded, roomSessionInstance)
        roomSessionInstance.emit(event, roomSessionInstance)
        remove<RoomSession>(payload.room_session.id)
        break
      }
      // case 'video.room.subscribed': {
      //   yield sagaEffects.spawn(MemberPosition.memberPositionWorker, {
      //     ...options,
      //     instance: roomSessionInstance,
      //     initialState: payload,
      //     dispatcher: function* (
      //       subType: InternalMemberUpdatedEventNames,
      //       subPayload
      //     ) {
      //       yield sagaEffects.fork(videoMemberWorker, {
      //         ...options,
      //         action: { type: subType, payload: subPayload },
      //       })
      //     },
      //   })
      //   roomSessionInstance.emit(event, roomSessionInstance)
      //   break
      // }
      default:
        break
    }
  }

  const isVideoClientEvent = (action: SDKActions) =>
    [
      'video.room.started',
      'video.room.updated',
      'video.room.ended',
      'video.room.subscribed',
    ].includes(action.type)

  while (true) {
    const action = yield sagaEffects.take(swEventChannel, isVideoClientEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('videoClientWorker ended')
}
