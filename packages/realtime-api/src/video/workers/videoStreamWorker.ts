import {
  getLogger,
  SagaIterator,
  stripNamespacePrefix,
  VideoStreamEventNames,
  VideoStreamAction,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { VideoCallWorkerParams } from './videoCallingWorker'
import { RoomSessionStream } from '../RoomSessionStream'

export const videoStreamWorker = function* (
  options: VideoCallWorkerParams<VideoStreamAction>
): SagaIterator {
  getLogger().trace('videoStreamWorker started')
  const {
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for stream')
  }

  let streamInstance = get<RoomSessionStream>(payload.stream.id)
  if (!streamInstance) {
    streamInstance = new RoomSessionStream({
      roomSession: roomSessionInstance,
      payload,
    })
  } else {
    streamInstance.setPayload(payload)
  }
  set<RoomSessionStream>(payload.stream.id, streamInstance)

  const event = stripNamespacePrefix(type) as VideoStreamEventNames

  switch (type) {
    case 'video.stream.started':
      roomSessionInstance.emit(event, streamInstance)
      streamInstance.emit(event, streamInstance)
      break
    case 'video.stream.ended':
      roomSessionInstance.emit(event, streamInstance)
      streamInstance.emit(event, streamInstance)
      remove<RoomSessionStream>(payload.stream.id)
      break
    default:
      break
  }

  getLogger().trace('videoStreamWorker ended')
}
