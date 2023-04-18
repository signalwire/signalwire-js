import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  VideoRoomStartedEventParams,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { createRoomSessionObject, RoomSession } from '../RoomSession'

export const videoRoomWorker: SDKCallWorker<
  VideoRoomStartedEventParams,
  Client
> = function* (options): SagaIterator {
  getLogger().trace('videoRoomWorker started')
  const {
    client,
    // @ts-expect-error
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  let roomSessionInstance = get<RoomSession>(payload.room_session.id)
  if (!roomSessionInstance) {
    roomSessionInstance = createRoomSessionObject({
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    roomSessionInstance.setPayload(payload)
  }
  set<RoomSession>(payload.room_session_id, roomSessionInstance)

  switch (type) {
    case 'video.room.started':
    case 'video.room.updated': {
      client.baseEmitter.emit(type, roomSessionInstance)
      break
    }
    case 'video.room.ended': {
      client.baseEmitter.emit(type, roomSessionInstance)
      remove<RoomSession>(payload.room_session_id)
      break
    }
    case 'video.room.subscribed': {
      roomSessionInstance.baseEmitter.emit(type, roomSessionInstance)
      break
    }
    default:
      break
  }

  getLogger().trace('videoRoomWorker ended')
}
