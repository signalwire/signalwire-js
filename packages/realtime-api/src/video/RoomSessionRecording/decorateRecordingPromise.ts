import { Promisify } from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { RoomSessionRecording } from './RoomSessionRecording'
import { decoratePromise } from '../../decoratePromise'
import { RealTimeRoomRecordingListeners } from '../../types'

export interface RoomSessionRecordingEnded {
  id: string
  roomId: string
  roomSessionId: string
  state: RoomSessionRecording['state']
  duration?: number
  startedAt?: Date
  endedAt?: Date
}

export interface RoomSessionRecordingPromise
  extends Promise<RoomSessionRecordingEnded>,
    Promisify<RoomSessionRecordingEnded> {
  onStarted: () => Promise<RoomSessionRecording>
  onEnded: () => Promise<RoomSessionRecordingEnded>
  listen: (
    listeners: RealTimeRoomRecordingListeners
  ) => Promise<() => Promise<void>>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
}

export const getters = [
  'id',
  'roomId',
  'roomSessionId',
  'state',
  'duration',
  'startedAt',
  'endedAt',
]

export const methods = ['pause', 'resume', 'stop']

export function decorateRecordingPromise(
  this: RoomSession,
  innerPromise: Promise<RoomSessionRecording>
) {
  // prettier-ignore
  return (decoratePromise<RoomSessionRecording, RoomSessionRecordingEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'recording',
    methods,
    getters,
  }) as RoomSessionRecordingPromise
}
