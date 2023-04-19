import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  VideoMemberEventParams,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { RoomSession } from '../RoomSession'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
} from '../RoomSessionMember'

export const videoMemberWorker: SDKCallWorker<VideoMemberEventParams, Client> =
  function* (options): SagaIterator {
    getLogger().trace('videoMemberWorker started')
    const {
      client,
      action: { type, payload },
      instanceMap: { get, set, remove },
    } = options

    console.log('videoMemberWorker type', type)

    const roomSessionInstance = get<RoomSession>(payload.room_session_id)
    if (!roomSessionInstance) {
      throw new Error('Missing room session instance for member')
    }

    switch (type) {
      case 'video.member.joined': {
        const memberInstance = createRoomSessionMemberObject({
          store: client.store,
          // @ts-expect-error
          emitter: client.emitter,
          payload,
        })
        set<RoomSessionMember>(payload.member.id, memberInstance)
        roomSessionInstance.baseEmitter.emit(type, memberInstance)
        break
      }
      case 'video.member.left': {
        const memberInstance = get<RoomSessionMember>(payload.member.id)
        memberInstance?.setPayload(payload)
        roomSessionInstance.baseEmitter.emit(type, memberInstance)
        remove<RoomSessionMember>(payload.member.id)
        break
      }
      case 'video.member.updated': {
        const memberInstance = get<RoomSessionMember>(payload.member.id)
        memberInstance.setPayload(payload)
        set<RoomSessionMember>(payload.member.id, memberInstance)
        roomSessionInstance.baseEmitter.emit(type, memberInstance)
        break
      }
      case 'video.member.talking': {
        if ('talking' in payload.member) {
          const suffix = payload.member.talking ? 'started' : 'ended'
          const memberInstance = get<RoomSessionMember>(payload.member.id)
          memberInstance.isTalking = payload.member.talking
          roomSessionInstance.baseEmitter.emit(
            `${type}.${suffix}`,
            memberInstance
          )
        }
        break
      }
      default:
        break
    }

    getLogger().trace('videoMemberWorker ended')
  }
