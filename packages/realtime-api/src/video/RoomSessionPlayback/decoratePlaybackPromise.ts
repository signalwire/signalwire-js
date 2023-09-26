import { Promisify } from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { RoomSessionPlayback } from './RoomSessionPlayback'
import { decoratePromise } from '../../decoratePromise'
import { RealTimeRoomPlaybackListeners } from '../../types'

export interface RoomSessionPlaybackEnded {
  id: string
  roomId: string
  roomSessionId: string
  url: string
  state: RoomSessionPlayback['state']
  volume: number
  startedAt?: Date
  endedAt?: Date
  position: number
  seekable: boolean
}

export interface RoomSessionPlaybackPromise
  extends Promise<RoomSessionPlaybackEnded>,
    Promisify<RoomSessionPlaybackEnded> {
  onStarted: () => Promise<RoomSessionPlayback>
  onEnded: () => Promise<RoomSessionPlaybackEnded>
  listen: (
    listeners: RealTimeRoomPlaybackListeners
  ) => Promise<() => Promise<void>>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  setVolume: (volume: number) => Promise<void>
  seek: (timecode: number) => Promise<void>
  forward: (offset: number) => Promise<void>
  rewind: (offset: number) => Promise<void>
}

export const getters = [
  'id',
  'roomId',
  'roomSessionId',
  'url',
  'state',
  'volume',
  'startedAt',
  'endedAt',
  'position',
  'seekable',
]

export const methods = [
  'pause',
  'resume',
  'stop',
  'setVolume',
  'seek',
  'forward',
  'rewind',
]

export function decoratePlaybackPromise(
  this: RoomSession,
  innerPromise: Promise<RoomSessionPlayback>
) {
  // prettier-ignore
  return (decoratePromise<RoomSessionPlayback, RoomSessionPlaybackEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'playback',
    methods,
    getters,
  }) as RoomSessionPlaybackPromise
}
