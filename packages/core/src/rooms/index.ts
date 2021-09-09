import { BaseComponent } from '..'

// TODO: check generic
export interface BaseRoomInterface extends BaseComponent<{}> {
  roomId: string
  roomSessionId: string
  memberId: string
}

export * from './methods'
export * from './RoomSessionRecording'
