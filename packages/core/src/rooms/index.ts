import { BaseComponent, EventEmitter } from '..'

export interface BaseRoomInterface<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseComponent<EventTypes> {
  roomId: string
  roomSessionId: string
  memberId: string
}

export * from './methods'
export * from './RoomSessionRecording'
export * from './RoomSessionPlayback'
export * from './RoomSessionStream'
export * from './RoomSessionMember'
