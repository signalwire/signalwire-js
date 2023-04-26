import { BaseComponent, EventEmitter } from '..'

export interface BaseRoomInterface<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseComponent<EventTypes> {
  roomId: string
  roomSessionId: string
  memberId: string
}

export * from './methods'
export * from './methodsRT'
export * from './RoomSessionRecording'
export * from './RoomSessionRTRecording'
export * from './RoomSessionPlayback'
export * from './RoomSessionRTPlayback'
export * from './RoomSessionStream'
