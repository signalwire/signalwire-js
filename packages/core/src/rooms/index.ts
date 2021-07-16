import { BaseComponent } from '..'

export interface BaseRoomInterface extends BaseComponent {
  roomId: string
  roomSessionId: string
  memberId: string
}

export * from './methods'
