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
  RoomSessionPlayback,
  createRoomSessionRTPlaybackObject,
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
        const { playback } = await this.execute<unknown, PlayRTOutput>({
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
  playbacks: RoomSessionPlayback[]
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
