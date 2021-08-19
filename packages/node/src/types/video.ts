import type { GlobalVideoEvents } from '@signalwire/core'
import { Room } from '../Room'

type RealTimeVideoApiGlobalEvents = GlobalVideoEvents

export type EventsHandlerMapping = Record<
  RealTimeVideoApiGlobalEvents,
  (room: Room) => void
>

export type RealTimeVideoApiEvents = {
  [k in RealTimeVideoApiGlobalEvents]: EventsHandlerMapping[k]
}
