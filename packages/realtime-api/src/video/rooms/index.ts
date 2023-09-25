import { ListenSubscriber } from '../../ListenSubscriber'
import type { Client } from '../../client/Client'
import {
  RealTimeRoomPlaybackEvents,
  RealTimeRoomPlaybackListeners,
  RealTimeRoomRecordingEvents,
  RealTimeRoomRecordingListeners,
  RealTimeRoomStreamEvents,
  RealTimeRoomStreamListeners,
} from '../../types'

type Listeners =
  | RealTimeRoomPlaybackListeners
  | RealTimeRoomRecordingListeners
  | RealTimeRoomStreamListeners
type Events =
  | RealTimeRoomPlaybackEvents
  | RealTimeRoomRecordingEvents
  | RealTimeRoomStreamEvents

// @ts-expect-error
export interface BaseRoomInterface extends ListenSubscriber<Listeners, Events> {
  _client: Client
  roomId: string
  roomSessionId: string
  memberId: string
}

export * as RoomMethods from './methods'
export * from './RoomSessionRecording'
export * from './RoomSessionPlayback'
export * from './RoomSessionStream'
