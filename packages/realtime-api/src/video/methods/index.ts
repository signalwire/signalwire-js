import { EventEmitter } from '@signalwire/core'
import { ListenSubscriber } from '../../ListenSubscriber'
import type { Client } from '../../client/Client'
import {
  RealTimeRoomEventsHandlerMapping,
  RealTimeRoomListeners,
} from '../../types'

// @ts-expect-error
export interface BaseRoomInterface
  extends ListenSubscriber<
    RealTimeRoomListeners,
    RealTimeRoomEventsHandlerMapping
  > {
  _client: Client
  roomId: string
  roomSessionId: string
  memberId: string
  once<T extends EventEmitter.EventNames<RealTimeRoomEventsHandlerMapping>>(
    event: T,
    fn: EventEmitter.EventListener<RealTimeRoomEventsHandlerMapping, T>
  ): void
  off<T extends EventEmitter.EventNames<RealTimeRoomEventsHandlerMapping>>(
    event: T,
    fn: EventEmitter.EventListener<RealTimeRoomEventsHandlerMapping, T>
  ): void
}

export * as RoomMethods from './methods'
