/**
 * Once we have new interface for Browser SDK;
 * methods.ts in core should be removed
 * methods.ts in realtime-api should be moved to core
 */

import {
  type VideoMemberEntity,
  type MemberCommandParams,
  type VideoPosition,
  type ExecuteExtendedOptions,
  type RoomMethod,
  type BaseRPCResult,
  type MediaAllowed,
  type VideoMeta,
} from '@signalwire/core'
import {
  RealTimeRoomPlaybackListeners,
  RealTimeRoomRecordingListeners,
  RealTimeRoomStreamListeners,
} from '../../types'
import {
  RoomSessionPlayback,
  decoratePlaybackPromise,
} from '../RoomSessionPlayback'
import {
  RoomSessionRecording,
  decorateRecordingPromise,
} from '../RoomSessionRecording'
import { RoomSessionStream, decorateStreamPromise } from '../RoomSessionStream'
import { BaseRoomInterface } from '.'

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
  ThisType<BaseRoomInterface>

/**
 * Transform for returning `undefined` for `execute`s that were
 * successully resolved. If the `execute` failed for some reason, then
 * the promise will be rejected and this transform will never be
 * executed.
 */
const baseCodeTransform = () => {}

const createRoomMethod = <
  InputType,
  OutputType = InputType,
  ParamsType extends RoomMethodParams = RoomMethodParams
>(
  method: RoomMethod,
  options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
): RoomMethodDescriptor<OutputType, ParamsType> => ({
  value: function (params = {} as ParamsType): Promise<OutputType> {
    return this._client.execute(
      {
        method,
        params: {
          room_session_id: this.roomSessionId,
          ...params,
        },
      },
      options
    )
  },
})

/**
 * Type the params for each room member method that uses the provided
 * memberId or fallback to the instance memberId. Additional params
 * can be passed as `value` or `volume`.
 */
interface RoomMemberMethodParams extends Record<string, unknown> {
  memberId?: string
}

const createRoomMemberMethod = <
  InputType,
  OutputType,
  ParamsType extends RoomMemberMethodParams = RoomMemberMethodParams
>(
  method: RoomMethod,
  options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
): RoomMethodDescriptor<OutputType, ParamsType> => ({
  value: function ({ memberId, ...rest } = {} as ParamsType) {
    return this._client.execute(
      {
        method,
        params: {
          room_session_id: this.roomSessionId,
          member_id: memberId || this.memberId,
          ...rest,
        },
      },
      options
    )
  },
})

/**
 * Room Methods
 */
export const getLayouts = createRoomMethod<{ layouts: string[] }>(
  'video.list_available_layouts',
  {
    transformResolve: (payload) => ({ layouts: payload.layouts }),
  }
)
export const getMembers = createRoomMethod<{ members: VideoMemberEntity[] }>(
  'video.members.get',
  {
    transformResolve: (payload) => ({ members: payload.members }),
  }
)
export interface SetLayoutParams {
  name: string
  positions?: Record<string, VideoPosition>
}
export const setLayout = createRoomMethod<BaseRPCResult, void>(
  'video.set_layout',
  {
    transformResolve: baseCodeTransform,
  }
)
export interface SetPositionsParams {
  positions: Record<string, VideoPosition>
}
export const setPositions = createRoomMethod<BaseRPCResult, void>(
  'video.set_position',
  {
    transformResolve: baseCodeTransform,
  }
)
export const hideVideoMuted = createRoomMethod<BaseRPCResult, void>(
  'video.hide_video_muted',
  {
    transformResolve: baseCodeTransform,
  }
)
export const showVideoMuted = createRoomMethod<BaseRPCResult, void>(
  'video.show_video_muted',
  {
    transformResolve: baseCodeTransform,
  }
)
export const lock = createRoomMethod<BaseRPCResult, void>('video.lock', {
  transformResolve: baseCodeTransform,
})
export const unlock = createRoomMethod<BaseRPCResult, void>('video.unlock', {
  transformResolve: baseCodeTransform,
})

export const setHideVideoMuted: RoomMethodDescriptor<void, boolean> = {
  value: function (value) {
    return this._client.execute(
      {
        method: value ? 'video.hide_video_muted' : 'video.show_video_muted',
        params: {
          room_session_id: this.roomSessionId,
        },
      },
      {
        transformResolve: baseCodeTransform,
      }
    )
  },
}

export interface GetRecordingsOutput {
  recordings: RoomSessionRecording[]
}

export const getRecordings: RoomMethodDescriptor<GetRecordingsOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { recordings } = await this._client.execute<void, any>({
          method: 'video.recording.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })

        const recordingInstances: RoomSessionRecording[] = []
        recordings.forEach((recording: any) => {
          let recordingInstance =
            this._client.instanceMap.get<RoomSessionRecording>(recording.id)
          if (!recordingInstance) {
            recordingInstance = new RoomSessionRecording({
              payload: {
                room_id: this.roomId,
                room_session_id: this.roomSessionId,
                recording,
              },
              roomSession: this as any,
            })
          } else {
            recordingInstance.setPayload({
              room_id: this.roomId,
              room_session_id: this.roomSessionId,
              recording,
            })
          }
          recordingInstances.push(recordingInstance)
          this._client.instanceMap.set<RoomSessionRecording>(
            recordingInstance.id,
            recordingInstance
          )
        })

        resolve({ recordings: recordingInstances })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export type StartRecordingParams = {
  listen?: RealTimeRoomRecordingListeners
}
export const startRecording: RoomMethodDescriptor<any> = {
  value: function ({ listen }: StartRecordingParams = {}) {
    const promise = new Promise<RoomSessionRecording>(
      async (resolve, reject) => {
        const resolveHandler = (recording: RoomSessionRecording) => {
          this.off('recording.ended', rejectHandler)
          resolve(recording)
        }

        const rejectHandler = (recording: RoomSessionRecording) => {
          this.off('recording.started', resolveHandler)
          reject(recording)
        }

        // Subscribe to listeners
        if (listen) {
          mapActionListenersToRoomListeners.call(this, {
            listeners: listen,
            action: 'recording',
          })
        }
        this.once('recording.started', resolveHandler)
        this.once('recording.ended', rejectHandler)

        this._client
          .execute<void, any>({
            method: 'video.recording.start',
            params: {
              room_session_id: this.roomSessionId,
            },
          })
          .then(() => {
            // TODO: handle then?
          })
          .catch((e) => {
            this.off('recording.started', resolveHandler)
            this.off('recording.ended', rejectHandler)
            reject(e)
          })
      }
    )

    return decorateRecordingPromise.call(this as any, promise)
  },
}

export interface GetPlaybacksOutput {
  playbacks: RoomSessionPlayback[]
}

export const getPlaybacks: RoomMethodDescriptor<GetPlaybacksOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { playbacks } = await this._client.execute<void, any>({
          method: 'video.playback.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })

        const playbackInstances: RoomSessionPlayback[] = []
        playbacks.forEach((playback: any) => {
          let playbackInstance =
            this._client.instanceMap.get<RoomSessionPlayback>(playback.id)
          if (!playbackInstance) {
            playbackInstance = new RoomSessionPlayback({
              payload: {
                room_id: this.roomId,
                room_session_id: this.roomSessionId,
                playback,
              },
              roomSession: this as any,
            })
          } else {
            playbackInstance.setPayload({
              room_id: this.roomId,
              room_session_id: this.roomSessionId,
              playback,
            })
          }
          playbackInstances.push(playbackInstance)
          this._client.instanceMap.set<RoomSessionPlayback>(
            playbackInstance.id,
            playbackInstance
          )
        })

        resolve({ playbacks: playbackInstances })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export type PlayParams = {
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
  listen?: RealTimeRoomPlaybackListeners
}
export const play: RoomMethodDescriptor<any, PlayParams> = {
  value: function ({ seekPosition, currentTimecode, listen, ...params }) {
    const promise = new Promise<RoomSessionPlayback>(
      async (resolve, reject) => {
        const seek_position = seekPosition || currentTimecode

        const resolveHandler = (playback: RoomSessionPlayback) => {
          this.off('playback.ended', rejectHandler)
          resolve(playback)
        }

        const rejectHandler = (playback: RoomSessionPlayback) => {
          this.off('playback.started', resolveHandler)
          reject(playback)
        }

        // Subscribe to listeners
        if (listen) {
          mapActionListenersToRoomListeners.call(this, {
            listeners: listen,
            action: 'playback',
          })
        }

        this.once('playback.started', resolveHandler)
        this.once('playback.ended', rejectHandler)

        this._client
          .execute<void, any>({
            method: 'video.playback.start',
            params: {
              room_session_id: this.roomSessionId,
              seek_position,
              ...params,
            },
          })
          .then(() => {
            // TODO: handle then?
          })
          .catch((e) => {
            this.off('playback.started', resolveHandler)
            this.off('playback.ended', rejectHandler)
            reject(e)
          })
      }
    )

    return decoratePlaybackPromise.call(this as any, promise)
  },
}

const createRoomMetaMethod = <ParamsType extends RoomMethodParams>(
  method: RoomMethod
) => {
  return createRoomMethod<BaseRPCResult, void, ParamsType>(method, {
    transformResolve: baseCodeTransform,
    transformParams: (params) => {
      const { room_session_id, ...meta } = params
      return { room_session_id, meta }
    },
  })
}

interface GetMetaOutput {
  meta: VideoMeta
}

export const getMeta = createRoomMethod<GetMetaOutput>('video.get_meta', {
  transformResolve: ({ meta }) => ({ meta }),
})

export interface SetMetaParams extends Record<string, unknown> {}
export const setMeta = createRoomMetaMethod<SetMetaParams>('video.set_meta')

export interface UpdateMetaParams extends Record<string, unknown> {}
export const updateMeta =
  createRoomMetaMethod<UpdateMetaParams>('video.update_meta')

export type DeleteMetaParams = string[]
export const deleteMeta: RoomMethodDescriptor<any, DeleteMetaParams> = {
  value: function (params) {
    return this._client.execute({
      method: 'video.delete_meta',
      params: {
        room_session_id: this.roomSessionId,
        keys: params,
      },
    })
  },
}

export interface GetStreamsOutput {
  streams: RoomSessionStream[]
}

export const getStreams: RoomMethodDescriptor<GetStreamsOutput> = {
  value: function () {
    return new Promise(async (resolve, reject) => {
      try {
        const { streams } = await this._client.execute<void, any>({
          method: 'video.stream.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })

        const streamInstances: RoomSessionStream[] = []
        streams.forEach((stream: any) => {
          let streamInstance = this._client.instanceMap.get<RoomSessionStream>(
            stream.id
          )
          if (!streamInstance) {
            streamInstance = new RoomSessionStream({
              payload: {
                room_id: this.roomId,
                room_session_id: this.roomSessionId,
                stream,
              },
              roomSession: this as any,
            })
          } else {
            streamInstance.setPayload({
              room_id: this.roomId,
              room_session_id: this.roomSessionId,
              stream,
            })
          }
          streamInstances.push(streamInstance)
          this._client.instanceMap.set<RoomSessionStream>(
            streamInstance.id,
            streamInstance
          )
        })

        resolve({ streams: streamInstances })
      } catch (error) {
        reject(error)
      }
    })
  },
}

export interface StartStreamParams {
  url: string
  listen?: RealTimeRoomStreamListeners
}
export const startStream: RoomMethodDescriptor<any, StartStreamParams> = {
  value: function ({ listen, ...params }) {
    const promise = new Promise<RoomSessionStream>(async (resolve, reject) => {
      const resolveHandler = (stream: RoomSessionStream) => {
        this.off('stream.ended', rejectHandler)
        resolve(stream)
      }

      const rejectHandler = (stream: RoomSessionStream) => {
        this.off('stream.started', resolveHandler)
        reject(stream)
      }

      // Subscribe to listeners
      if (listen) {
        mapActionListenersToRoomListeners.call(this, {
          listeners: listen,
          action: 'stream',
        })
      }

      this.once('stream.started', resolveHandler)
      this.once('stream.ended', rejectHandler)

      this._client
        .execute<StartStreamParams, any>({
          method: 'video.stream.start',
          params: {
            room_session_id: this.roomSessionId,
            ...params,
          },
        })
        .then(() => {
          // TODO: handle then?
        })
        .catch((e) => {
          this.off('stream.started', resolveHandler)
          this.off('stream.ended', rejectHandler)
          reject(e)
        })
    })

    return decorateStreamPromise.call(this as any, promise)
  },
}

export const setPrioritizeHandraise: RoomMethodDescriptor<any, boolean> = {
  value: function (params) {
    return this._client.execute({
      method: 'video.prioritize_handraise',
      params: {
        room_session_id: this.roomSessionId,
        enable: params,
      },
    })
  },
}

export type GetLayouts = ReturnType<typeof getLayouts.value>
export type GetMembers = ReturnType<typeof getMembers.value>
export type HideVideoMuted = ReturnType<typeof hideVideoMuted.value>
export type ShowVideoMuted = ReturnType<typeof showVideoMuted.value>
export type SetHideVideoMuted = ReturnType<typeof setHideVideoMuted.value>

export type GetRecordings = ReturnType<typeof getRecordings.value>
export type StartRecording = ReturnType<typeof startRecording.value>

export type GetPlaybacks = ReturnType<typeof getPlaybacks.value>
export type Play = ReturnType<typeof play.value>
export type GetMeta = ReturnType<typeof getMeta.value>
export type SetMeta = ReturnType<typeof setMeta.value>
export type UpdateMeta = ReturnType<typeof updateMeta.value>
export type DeleteMeta = ReturnType<typeof deleteMeta.value>

export type GetStreams = ReturnType<typeof getStreams.value>
export type StartStream = ReturnType<typeof startStream.value>

export type Lock = ReturnType<typeof lock.value>
export type Unlock = ReturnType<typeof unlock.value>
export type SetPrioritizeHandraise = ReturnType<
  typeof setPrioritizeHandraise.value
>
// End Room Methods

/**
 * Room Member Methods
 */
export const audioMuteMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.audio_mute',
  {
    transformResolve: baseCodeTransform,
  }
)
export const audioUnmuteMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.audio_unmute',
  {
    transformResolve: baseCodeTransform,
  }
)
export const videoMuteMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.video_mute',
  {
    transformResolve: baseCodeTransform,
  }
)
export const videoUnmuteMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.video_unmute',
  {
    transformResolve: baseCodeTransform,
  }
)
export const deafMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.deaf',
  {
    transformResolve: baseCodeTransform,
  }
)
export const undeafMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.undeaf',
  {
    transformResolve: baseCodeTransform,
  }
)
// This is used on a RoomSessionMember instance where we have
// `this.roomSessionId` and `this.memberId`
export const setDeaf: RoomMethodDescriptor<void, boolean> = {
  value: function (value) {
    return this._client.execute(
      {
        method: value ? 'video.member.deaf' : 'video.member.undeaf',
        params: {
          room_session_id: this.roomSessionId,
          member_id: this.memberId,
        },
      },
      {
        transformResolve: baseCodeTransform,
      }
    )
  },
}
export const setInputVolumeMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.set_input_volume',
  {
    transformResolve: baseCodeTransform,
  }
)
export const setOutputVolumeMember = createRoomMemberMethod<
  BaseRPCResult,
  void
>('video.member.set_output_volume', {
  transformResolve: baseCodeTransform,
})
export const setInputSensitivityMember = createRoomMemberMethod<
  BaseRPCResult,
  void
>('video.member.set_input_sensitivity', {
  transformResolve: baseCodeTransform,
})

interface PromoteDemoteMemberParams extends Required<MemberCommandParams> {
  mediaAllowed?: MediaAllowed
}

export interface PromoteMemberParams extends PromoteDemoteMemberParams {
  permissions?: string[]
  meta?: VideoMeta
  joinAudioMuted?: boolean
  joinVideoMuted?: boolean
}
export const promote: RoomMethodDescriptor<void, PromoteMemberParams> = {
  value: function ({
    memberId,
    mediaAllowed,
    joinAudioMuted,
    joinVideoMuted,
    ...rest
  }) {
    return this._client.execute<unknown, void, PromoteMemberParams>(
      {
        method: 'video.member.promote',
        params: {
          room_session_id: this.roomSessionId,
          member_id: memberId,
          media_allowed: mediaAllowed,
          join_audio_muted: joinAudioMuted,
          join_video_muted: joinVideoMuted,
          ...rest,
        },
      },
      {
        transformResolve: baseCodeTransform as any,
      }
    )
  },
}

export interface DemoteMemberParams extends PromoteDemoteMemberParams {}
export const demote: RoomMethodDescriptor<void, DemoteMemberParams> = {
  value: function ({ memberId, mediaAllowed }) {
    return this._client.execute<unknown, void, DemoteMemberParams>(
      {
        method: 'video.member.demote',
        params: {
          room_session_id: this.roomSessionId,
          member_id: memberId,
          media_allowed: mediaAllowed,
        },
      },
      {
        transformResolve: baseCodeTransform as any,
      }
    )
  },
}

export interface SetMemberPositionParams extends MemberCommandParams {
  position: VideoPosition
}
export const setMemberPosition = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.set_position',
  {
    transformResolve: baseCodeTransform,
  }
)
export const removeMember: RoomMethodDescriptor<
  void,
  Required<RoomMemberMethodParams>
> = {
  value: function ({ memberId, ...rest }) {
    if (!memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }
    return this._client.execute(
      {
        method: 'video.member.remove',
        params: {
          room_session_id: this.roomSessionId,
          member_id: memberId,
          ...rest,
        },
      },
      {
        transformResolve: baseCodeTransform,
      }
    )
  },
}

export const removeAllMembers: RoomMethodDescriptor<void, void> = {
  value: function () {
    return this._client.execute(
      {
        method: 'video.member.remove',
        params: {
          room_session_id: this.roomSessionId,
          member_id: 'all',
        },
      },
      {
        transformResolve: baseCodeTransform,
      }
    )
  },
}

interface GetMemberMetaOutput {
  meta: VideoMeta
}

export const getMemberMeta = createRoomMemberMethod<
  BaseRPCResult & VideoMeta,
  GetMemberMetaOutput
>('video.member.get_meta', {
  transformResolve: ({ meta }) => ({ meta }),
})
export interface SetMemberMetaParams extends MemberCommandParams {
  meta: VideoMeta
}
export const setMemberMeta = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.set_meta',
  {
    transformResolve: baseCodeTransform,
  }
)

export interface UpdateMemberMetaParams extends MemberCommandParams {
  meta: VideoMeta
}
export const updateMemberMeta = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.update_meta',
  {
    transformResolve: baseCodeTransform,
  }
)
export interface DeleteMemberMetaParams extends MemberCommandParams {
  keys: string[]
}
export const deleteMemberMeta = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.delete_meta',
  {
    transformResolve: baseCodeTransform,
  }
)

export interface SetRaisedHandRoomParams {
  memberId: string
  raised?: boolean
}

export interface SetRaisedHandMemberParams {
  raised?: boolean
}

export const setRaisedHand: RoomMethodDescriptor<
  void,
  SetRaisedHandRoomParams | SetRaisedHandMemberParams
> = {
  value: function (value) {
    const { raised = true, memberId = this.memberId } =
      (value as SetRaisedHandRoomParams) || {}

    if (!memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }

    return this._client.execute(
      {
        method: raised ? 'video.member.raisehand' : 'video.member.lowerhand',
        params: {
          room_session_id: this.roomSessionId,
          member_id: memberId,
        },
      },
      {
        transformResolve: baseCodeTransform,
      }
    )
  },
}

export type AudioMuteMember = ReturnType<typeof audioMuteMember.value>
export type AudioUnmuteMember = ReturnType<typeof audioUnmuteMember.value>
export type VideoMuteMember = ReturnType<typeof videoMuteMember.value>
export type VideoUnmuteMember = ReturnType<typeof videoUnmuteMember.value>
export type DeafMember = ReturnType<typeof deafMember.value>
export type UndeafMember = ReturnType<typeof undeafMember.value>
export type SetDeaf = ReturnType<typeof setDeaf.value>
export type SetLayout = ReturnType<typeof setLayout.value>
export type SetPositions = ReturnType<typeof setPositions.value>
export type SetInputVolumeMember = ReturnType<typeof setInputVolumeMember.value>
export type SetOutputVolumeMember = ReturnType<
  typeof setOutputVolumeMember.value
>
export type SetInputSensitivityMember = ReturnType<
  typeof setInputSensitivityMember.value
>
export type SetMemberPosition = ReturnType<typeof setMemberPosition.value>
export type RemoveMember = ReturnType<typeof removeMember.value>
export type RemoveAllMembers = ReturnType<typeof removeAllMembers.value>
export type GetMemberMeta = ReturnType<typeof getMemberMeta.value>
export type SetMemberMeta = ReturnType<typeof setMemberMeta.value>
export type UpdateMemberMeta = ReturnType<typeof updateMemberMeta.value>
export type DeleteMemberMeta = ReturnType<typeof deleteMemberMeta.value>
export type PromoteMember = ReturnType<typeof promote.value>
export type DemoteMember = ReturnType<typeof demote.value>
export type SetRaisedHand = ReturnType<typeof setRaisedHand.value>
// End Room Member Methods

/**
 * This function converts action listeners into room listeners and attach those to room
 * For eg: Playback's onStarted changes into onPlaybackStarted
 */
interface MapActionListenersToRoomListenerParams {
  listeners:
    | RealTimeRoomPlaybackListeners
    | RealTimeRoomRecordingListeners
    | RealTimeRoomStreamListeners
  action: 'playback' | 'recording' | 'stream'
}
function mapActionListenersToRoomListeners(
  this: BaseRoomInterface,
  options: MapActionListenersToRoomListenerParams
) {
  const { listeners, action } = options

  if (!['playback', 'recording', 'stream'].includes(action)) return

  const playListenMapper = {
    onStarted: 'onPlaybackStarted',
    onUpdated: 'onPlaybackUpdated',
    onEnded: 'onPlaybackEnded',
  }

  const recordListenMapper = {
    onStarted: 'onRecordingStarted',
    onUpdated: 'onRecordingUpdated',
    onEnded: 'onRecordingEnded',
  }

  const streamListenMapper = {
    onStarted: 'onStreamStarted',
    onEnded: 'onStreamEnded',
  }

  let mapper: Record<string, string> = {}

  if (action === 'playback') {
    mapper = playListenMapper
  }
  if (action === 'recording') {
    mapper = recordListenMapper
  }
  if (action === 'stream') {
    mapper = streamListenMapper
  }

  const roomListeners = Object.keys(listeners).reduce((acc: any, key) => {
    const mappedKey = mapper[key]
    if (mappedKey) {
      // @ts-expect-error
      acc[mappedKey] = listeners[key]
    }
    return acc
  }, {})
  this.listen(roomListeners)
}
