import { BaseComponent, EventEmitter, InternalUnifiedActionTarget } from '..'

export interface BaseRoomInterface<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseComponent<EventTypes> {
  roomId: string
  roomSessionId: string
  memberId: string
  self: InternalUnifiedActionTarget
}

export * from './methods'
export * from './RoomSessionRecording'
export * from './RoomSessionPlayback'
export * from './RoomSessionStream'
