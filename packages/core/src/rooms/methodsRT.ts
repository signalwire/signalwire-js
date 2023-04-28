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
  RoomSessionRTStream,
  createRoomSessionRTPlaybackObject,
  createRoomSessionRTRecordingObject,
  createRoomSessionRTStreamObject,
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
  playback: RoomSessionRTPlayback
}
export const playRT: RoomMethodDescriptor<PlayRTOutput, PlayRTParams> = {
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
        await this.injectInInstanceMap<RoomSessionRTPlayback>([
          playbackInstance,
        ])
        resolve({ playback: playbackInstance })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export interface GetRTPlaybacksOutput {
  playbacks: RoomSessionRTPlayback[]
}
export const getRTPlaybacks: RoomMethodDescriptor<GetRTPlaybacksOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { playbacks } = await this.execute<unknown, GetRTPlaybacksOutput>(
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
        await this.injectInInstanceMap<RoomSessionRTPlayback>(playbackInstances)
        resolve({ playbacks: playbackInstances })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export interface StartRTRecordingOutput {
  recording: RoomSessionRTRecording
}
export const startRTRecording: RoomMethodDescriptor<StartRTRecordingOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { recording } = await this.execute<void, StartRTRecordingOutput>({
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
        await this.injectInInstanceMap<RoomSessionRTRecording>([
          recordingInstance,
        ])
        resolve({ recording: recordingInstance })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export interface GetRTRecordingsOutput {
  recordings: RoomSessionRTRecording[]
}
export const getRTRecordings: RoomMethodDescriptor<GetRTRecordingsOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { recordings } = await this.execute<void, GetRTRecordingsOutput>({
          method: 'video.recording.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
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
        await this.injectInInstanceMap<RoomSessionRTRecording>(
          recordingInstances
        )
        resolve({ recordings: recordingInstances })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export interface StartRTStreamParams {
  url: string
}
export interface StartRTStreamOutput {
  stream: RoomSessionRTStream
}
export const startRTStream: RoomMethodDescriptor<
  StartRTStreamOutput,
  StartRTStreamParams
> = {
  value: function (params) {
    return new Promise(async (resolve, reject) => {
      try {
        const { stream } = await this.execute<
          StartRTStreamParams,
          StartRTStreamOutput
        >({
          method: 'video.stream.start',
          params: {
            room_session_id: this.roomSessionId,
            ...params,
          },
        })
        const streamInstance = createRoomSessionRTStreamObject({
          store: this.store,
          // @ts-expect-error
          emitter: this.emitter,
          payload: {
            room_id: this.roomId,
            room_session_id: this.roomSessionId,
            stream,
          },
        })
        await this.injectInInstanceMap<RoomSessionRTStream>([streamInstance])
        resolve({ stream: streamInstance })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export interface GetRTStreamsOutput {
  streams: RoomSessionRTStream[]
}
export const getRTStreams: RoomMethodDescriptor<GetRTStreamsOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { streams } = await this.execute<void, GetRTStreamsOutput>({
          method: 'video.stream.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
        const streamInstances = streams.map((stream) =>
          createRoomSessionRTStreamObject({
            store: this.store,
            // @ts-expect-error
            emitter: this.emitter,
            payload: {
              room_id: this.roomId,
              room_session_id: this.roomSessionId,
              stream,
            },
          })
        )
        await this.injectInInstanceMap<RoomSessionRTStream>(streamInstances)
        resolve({ streams: streamInstances })
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

export type GetRTStreams = ReturnType<typeof getRTStreams.value>
export type StartRTStream = ReturnType<typeof startRTStream.value>
