import {
  MapToPubSubShape,
  MemberTalkingEventNames,
  RoomSessionMember,
  Rooms,
  SagaIterator,
  VideoMemberEvent,
  VideoMemberEventNames,
  fromSnakeToCamelCase,
  getLogger,
  stripNamespacePrefix,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'

export const videoMemberWorker = function* (
  options: VideoWorkerParams<MapToPubSubShape<VideoMemberEvent>>
): SagaIterator {
  getLogger().trace('videoMemberWorker started')
  const {
    instance: roomSessionInstance,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  let memberInstance = get<RoomSessionMember>(payload.member.id)
  if (!memberInstance) {
    memberInstance = Rooms.createRoomSessionMemberObject({
      store: roomSessionInstance.store,
      payload,
    })
  } else {
    memberInstance.setPayload(payload)
  }
  set<RoomSessionMember>(payload.playback.id, memberInstance)

  const event = stripNamespacePrefix(type) as VideoMemberEventNames

  if (type.startsWith('video.member.updated.')) {
    const clientType = fromSnakeToCamelCase(event)
    // @ts-expect-error
    roomSessionInstance.emit(clientType, memberInstance)
  }

  switch (type) {
    case 'video.member.joined':
    case 'video.member.updated':
      roomSessionInstance.emit(event, memberInstance)
      break
    case 'video.member.left':
      roomSessionInstance.emit(event, memberInstance)
      remove<RoomSessionMember>(payload.member.id)
      break
    case 'video.member.talking':
      roomSessionInstance.emit(event, memberInstance)
      if ('talking' in payload.member) {
        const suffix = payload.member.talking ? 'started' : 'ended'
        roomSessionInstance.emit(
          `${event}.${suffix}` as MemberTalkingEventNames,
          memberInstance
        )

        // Keep for backwards compatibility
        const deprecatedSuffix = payload.member.talking ? 'start' : 'stop'
        roomSessionInstance.emit(
          `${event}.${deprecatedSuffix}` as MemberTalkingEventNames,
          memberInstance
        )
      }
      break
    default:
      break
  }
  getLogger().trace('videoMemberWorker ended')
}
