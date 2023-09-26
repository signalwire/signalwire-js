import { EventEmitter } from '@signalwire/core'
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
  once<T extends EventEmitter.EventNames<Events>>(
    event: T,
    fn: EventEmitter.EventListener<Events, T>
  ): void
  off<T extends EventEmitter.EventNames<Events>>(
    event: T,
    fn: EventEmitter.EventListener<Events, T>
  ): void
}

export * as RoomMethods from './methods'
export * from './RoomSessionStream'
