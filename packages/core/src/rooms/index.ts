import { BaseComponent, EventEmitter } from '..'

export interface BaseRoomInterface<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseComponent<EventTypes> {
  roomId: string
  roomSessionId: string
  memberId: string
}

/**
 * Remove the below interface once we unified Browser and RealTime SDK interface
 */
export interface BaseRoomRTInterface<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseComponent<EventTypes> {
  _client: BaseComponent<EventTypes>
  roomId: string
  roomSessionId: string
  memberId: string
}

export * from './methods'
export * as RTMethods from './methodsRT'
export * from './RoomSessionRecording'
export * from './RoomSessionPlayback'
export * from './RoomSessionStream'
