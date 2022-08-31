import type {
  BaseRoomInterface,
  RoomSessionRecording,
  RoomSessionPlayback,
  RoomSessionStream,
} from '.'
import type {
  VideoMemberEntity,
  MemberCommandParams,
  VideoPosition,
} from '../types'
import { toLocalEvent } from '../utils'
import type {
  ExecuteExtendedOptions,
  RoomMethod,
  BaseRPCResult,
  MediaAllowed,
} from '../utils/interfaces'

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
    return this.execute(
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
    return this.execute(
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

export const setHideVideoMuted: RoomMethodDescriptor<void, boolean> = {
  value: function (value) {
    return this.execute(
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
    return new Promise(async (resolve) => {
      const handler = (instance: any) => {
        resolve(instance)
      }
      this.on(toLocalEvent('video.recording.list'), handler)

      try {
        const payload = await this.execute({
          method: 'video.recording.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
        this.emit(toLocalEvent('video.recording.list'), {
          ...(payload as object),
          room_session_id: this.roomSessionId,
        })
      } catch (error) {
        this.off(toLocalEvent('video.recording.list'), handler)
        throw error
      }
    })
  },
}

export const startRecording: RoomMethodDescriptor<void> = {
  value: function () {
    return new Promise(async (resolve) => {
      const handler = (instance: any) => {
        resolve(instance)
      }
      this.on(toLocalEvent('video.recording.start'), handler)

      try {
        const payload = await this.execute({
          method: 'video.recording.start',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
        this.emit(toLocalEvent('video.recording.start'), {
          ...(payload as object),
          room_session_id: this.roomSessionId,
        })
      } catch (error) {
        this.off(toLocalEvent('video.recording.start'), handler)
        throw error
      }
    })
  },
}

export interface GetPlaybacksOutput {
  playbacks: RoomSessionPlayback[]
}

export const getPlaybacks: RoomMethodDescriptor<GetPlaybacksOutput> = {
  value: function () {
    return new Promise(async (resolve) => {
      const handler = (instance: any) => {
        resolve(instance)
      }
      this.on(toLocalEvent('video.playback.list'), handler)

      try {
        const payload = await this.execute({
          method: 'video.playback.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
        this.emit(toLocalEvent('video.playback.list'), {
          ...(payload as object),
          room_session_id: this.roomSessionId,
        })
      } catch (error) {
        this.off(toLocalEvent('video.playback.list'), handler)
        throw error
      }
    })
  },
}

export type PlayParams = {
  url: string
  volume?: number
  positions?: Record<string, VideoPosition>
  layout?: string
  currentTimecode?: number
}
export const play: RoomMethodDescriptor<any, PlayParams> = {
  value: function (params) {
    return new Promise(async (resolve) => {
      const handler = (instance: any) => {
        resolve(instance)
      }
      this.on(toLocalEvent('video.playback.start'), handler)

      try {
        const payload = await this.execute({
          method: 'video.playback.start',
          params: {
            room_session_id: this.roomSessionId,
            ...params,
          },
        })
        this.emit(toLocalEvent('video.playback.start'), {
          ...(payload as object),
          room_session_id: this.roomSessionId,
        })
      } catch (error) {
        this.off(toLocalEvent('video.playback.start'), handler)
        throw error
      }
    })
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
  meta: Record<any, any>
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
    return this.execute({
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
    return new Promise(async (resolve) => {
      const handler = (instance: any) => {
        resolve(instance)
      }
      this.on(toLocalEvent('video.stream.list'), handler)

      try {
        const payload = await this.execute({
          method: 'video.stream.list',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
        this.emit(toLocalEvent('video.stream.list'), {
          ...(payload as object),
          room_session_id: this.roomSessionId,
        })
      } catch (error) {
        this.off(toLocalEvent('video.stream.list'), handler)
        throw error
      }
    })
  },
}

export interface StartStreamParams {
  url: string
}
export const startStream: RoomMethodDescriptor<any, StartStreamParams> = {
  value: function (params) {
    return new Promise(async (resolve) => {
      const handler = (instance: any) => {
        resolve(instance)
      }
      this.on(toLocalEvent('video.stream.start'), handler)

      try {
        const payload = await this.execute({
          method: 'video.stream.start',
          params: {
            room_session_id: this.roomSessionId,
            ...params,
          },
        })
        this.emit(toLocalEvent('video.stream.start'), {
          ...(payload as object),
          room_session_id: this.roomSessionId,
        })
      } catch (error) {
        this.off(toLocalEvent('video.stream.start'), handler)
        throw error
      }
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
    return this.execute(
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

const createMemberPromoteDemoteMethod = <
  OutputType,
  ParamsType extends PromoteDemoteMemberParams
>(
  method: 'video.member.promote' | 'video.member.demote'
): RoomMethodDescriptor<OutputType, ParamsType> => {
  return {
    value: function ({ memberId, mediaAllowed, ...rest }) {
      return this.execute<unknown, OutputType, ParamsType>(
        {
          method,
          params: {
            room_session_id: this.roomSessionId,
            member_id: memberId,
            media_allowed: mediaAllowed,
            ...rest,
          },
        },
        {
          transformResolve: baseCodeTransform as any,
        }
      )
    },
  }
}
export interface PromoteMemberParams extends PromoteDemoteMemberParams {
  permissions?: string[]
}
export const promote: RoomMethodDescriptor<void, PromoteMemberParams> =
  createMemberPromoteDemoteMethod('video.member.promote')

export interface DemoteMemberParams extends PromoteDemoteMemberParams {}
export const demote: RoomMethodDescriptor<void, DemoteMemberParams> =
  createMemberPromoteDemoteMethod('video.member.demote')
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
    return this.execute(
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
    return this.execute(
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
  meta: Record<any, any>
}

export const getMemberMeta = createRoomMemberMethod<
  BaseRPCResult & { meta: Record<any, any> },
  GetMemberMetaOutput
>('video.member.get_meta', {
  transformResolve: ({ meta }) => ({ meta }),
})
export interface SetMemberMetaParams extends MemberCommandParams {
  meta: Record<string, unknown>
}
export const setMemberMeta = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.set_meta',
  {
    transformResolve: baseCodeTransform,
  }
)

export interface UpdateMemberMetaParams extends MemberCommandParams {
  meta: Record<string, unknown>
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
// End Room Member Methods
