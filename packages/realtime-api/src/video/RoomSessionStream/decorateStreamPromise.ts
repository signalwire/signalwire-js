import { Promisify } from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { RoomSessionStream } from './RoomSessionStream'
import { decoratePromise } from '../../decoratePromise'
import { RealTimeRoomStreamListeners } from '../../types'

export interface RoomSessionStreamEnded {
  id: string
  roomId: string
  roomSessionId: string
  state: RoomSessionStream['state']
  duration?: number
  url?: string
  startedAt?: Date
  endedAt?: Date
}

export interface RoomSessionStreamPromise
  extends Promise<RoomSessionStreamEnded>,
    Promisify<RoomSessionStreamEnded> {
  onStarted: () => Promise<RoomSessionStream>
  onEnded: () => Promise<RoomSessionStreamEnded>
  listen: (
    listeners: RealTimeRoomStreamListeners
  ) => Promise<() => Promise<void>>
  stop: () => Promise<void>
}

export const getters = [
  'id',
  'roomId',
  'roomSessionId',
  'url',
  'state',
  'duration',
  'startedAt',
  'endedAt',
]

export const methods = ['stop']

export function decorateStreamPromise(
  this: RoomSession,
  innerPromise: Promise<RoomSessionStream>
) {
  // prettier-ignore
  return (decoratePromise<RoomSessionStream, RoomSessionStreamEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'stream',
    methods,
    getters,
  }) as RoomSessionStreamPromise
}
