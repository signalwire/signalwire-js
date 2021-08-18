import type { GlobalVideoEvents } from '@signalwire/core'
import { Room } from '../Room'

export type EventsHandlerMapping = Record<
  GlobalVideoEvents,
  (room: Room) => void
>

export type RelayVideoApiEvents = {
  [k in GlobalVideoEvents]: EventsHandlerMapping[k]
}
