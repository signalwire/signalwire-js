/**
 * `methods.ts`   -> Uses old event emitter - being used in browser SDK
 * `methodsRT.ts` -> Uses new event emitter - being used in realtime SDK
 *
 * Once we start using the new event emitter in browser sdk
 * The functions that are written in `methodsRT.ts` should be removed from the `methods.ts`
 * We will also need to delete one of the files and rename new functions/types
 */

import {
  BaseRoomInterface,
  RoomSessionRTPlayback,
  RoomSessionRTRecording,
  createRoomSessionRTPlaybackObject,
  createRoomSessionRTRecordingObject,
} from '.'
import { VideoPosition } from '../types'

type RoomMethodParams = Record<string, unknown>

interface RoomMethodPropertyDescriptor<OutputType, ParamsType>
  extends PropertyDescriptor {
  value: (params: ParamsType) => Promise<OutputType>
}

type RoomMethodDescriptor<
  OutputType = unknown,
  ParamsType = RoomMethodParams
> = RoomMethodPropertyDescriptor<OutputType, ParamsType> &
  // TODO: Replace string with a tighter type
  ThisType<BaseRoomInterface<string>>

/**
 * Room Methods
 */
export type PlayRTParams = {
  url: string
  volume?: number
  positions?: Record<string, VideoPosition>
  layout?: string
  seekPosition?: number
  /**
   * @deprecated Use {@link seekPosition} instead.
   * `currentTimecode` will be removed in v4.0.0
   */
  currentTimecode?: number
}
export interface PlayRTOutput {
  playback: PlayRTParams
  code: string
  message: string
}
export const playRT: RoomMethodDescriptor<any, PlayRTParams> = {
  value: function ({ seekPosition, currentTimecode, ...params }) {
    return new Promise(async (resolve, reject) => {
      try {
        const seek_position = seekPosition || currentTimecode
        const { playback } = await this.execute<void, PlayRTOutput>({
          method: 'video.playback.start',
          params: {
            room_session_id: this.roomSessionId,
            seek_position,
            ...params,
          },
        })
        const playbackInstance = createRoomSessionRTPlaybackObject({
          store: this.store,
          // @ts-expect-error
          emitter: this.emitter,
          payload: {
            room_id: this.roomId,
            room_session_id: this.roomSessionId,
            playback,
          },
        })
        resolve({ playback: playbackInstance })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export interface GetPlaybacksRTOutput {
  playbacks: RoomSessionRTPlayback[]
}

export const getRTPlaybacks: RoomMethodDescriptor<GetPlaybacksRTOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { playbacks } = await this.execute<unknown, GetPlaybacksRTOutput>(
          {
            method: 'video.playback.list',
            params: {
              room_session_id: this.roomSessionId,
            },
          }
        )
        const playbackInstances = playbacks.map((playback) =>
          createRoomSessionRTPlaybackObject({
            store: this.store,
            // @ts-expect-error
            emitter: this.emitter,
            payload: {
              room_id: this.roomId,
              room_session_id: this.roomSessionId,
              playback,
            },
          })
        )
        resolve({ playbacks: playbackInstances })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export type StartRecordingRTParams = {
  id: string
  state: string
  duration: number
  started_at: Date
  ended_at: Date
}
export interface StartRecordingRTOutput {
  recording: StartRecordingRTParams
  code: string
  message: string
  recording_id: string
}
export const startRTRecording: RoomMethodDescriptor<
  any,
  StartRecordingRTParams
> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { recording } = await this.execute<void, StartRecordingRTOutput>({
          method: 'video.recording.start',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
        const recordingInstance = createRoomSessionRTRecordingObject({
          store: this.store,
          // @ts-expect-error
          emitter: this.emitter,
          payload: {
            room_id: this.roomId,
            room_session_id: this.roomSessionId,
            recording,
          },
        })
        resolve({ recording: recordingInstance })
      } catch (error) {
        reject(error)
      }
    })
  },
}
export interface GetRecordingsRTOutput {
  recordings: RoomSessionRTRecording[]
}

export const getRTRecordings: RoomMethodDescriptor<GetRecordingsRTOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { recordings } = await this.execute<
          unknown,
          GetRecordingsRTOutput
        >({
          method: 'video.recording.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
        console.log('recordings', recordings)
        const recordingInstances = recordings.map((recording) =>
          createRoomSessionRTRecordingObject({
            store: this.store,
            // @ts-expect-error
            emitter: this.emitter,
            payload: {
              room_id: this.roomId,
              room_session_id: this.roomSessionId,
              recording,
            },
          })
        )
        console.log('recordingInstances', recordingInstances?.[0]?.state)
        resolve({ recordings: recordingInstances })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export type GetRTPlaybacks = ReturnType<typeof getRTPlaybacks.value>
export type PlayRT = ReturnType<typeof playRT.value>

export type GetRTRecordings = ReturnType<typeof getRTRecordings.value>
export type StartRTRecording = ReturnType<typeof startRTRecording.value>
