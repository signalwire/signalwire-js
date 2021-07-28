import { BaseRoomInterface } from '.'
import { Member } from '../types'
import { ExecuteTransform, RoomMethod } from '../utils/interfaces'

interface RoomMethodPropertyDescriptor<T> extends PropertyDescriptor {
  value: (params: RoomMethodParams) => Promise<T>
}
type RoomMethodDescriptor<T = unknown> = RoomMethodPropertyDescriptor<T> &
  ThisType<BaseRoomInterface>
type RoomMethodParams = Record<string, unknown>
interface BaseServerPayload {
  code: string
  message: string
  [k: string]: unknown
}

/**
 * Transform for returning true/false based on the response `code`
 * from the server
 */
const baseCodeTransform = ({ code }: BaseServerPayload) => code === '200'

const createRoomMethod = <InputType, OutputType>(
  method: RoomMethod,
  transform?: ExecuteTransform<InputType, OutputType>
): RoomMethodDescriptor<OutputType> => ({
  value: function (params: RoomMethodParams = {}): Promise<OutputType> {
    return this.execute(
      {
        method,
        params: {
          room_session_id: this.roomSessionId,
          ...params,
        },
      },
      transform
    )
  },
})

/**
 * Type the params for each room member method that uses the provided
 * memberId or fallback to the instance memberId. Additional params
 * can be passed as `value` or `volume`.
 */
interface RoomMemberMethodParams {
  memberId?: string
  [key: string]: unknown
}

const createRoomMemberMethod = <InputType, OutputType>(
  method: RoomMethod,
  transform?: ExecuteTransform<InputType, OutputType>
): RoomMethodDescriptor<OutputType> => ({
  value: function ({ memberId, ...rest }: RoomMemberMethodParams = {}) {
    return this.execute(
      {
        method,
        params: {
          room_session_id: this.roomSessionId,
          member_id: memberId || this.memberId,
          ...rest,
        },
      },
      transform
    )
  },
})

/**
 * Room Methods
 */
export const getLayoutList = createRoomMethod<{ layouts: string[] }, string[]>(
  'video.list_available_layouts',
  (payload) => payload.layouts
)
export const getMemberList = createRoomMethod<{ members: Member[] }, Member[]>(
  'video.members.get',
  (payload) => payload.members
)
export const setLayout = createRoomMethod('video.set_layout')
export const hideVideoMuted = createRoomMethod<BaseServerPayload, boolean>(
  'video.hide_video_muted',
  baseCodeTransform
)
export const showVideoMuted = createRoomMethod<BaseServerPayload, boolean>(
  'video.show_video_muted',
  baseCodeTransform
)

export type GetLayoutList = ReturnType<typeof getLayoutList.value>
export type GetMemberList = ReturnType<typeof getMemberList.value>
export type HideVideoMuted = ReturnType<typeof hideVideoMuted.value>
export type ShowVideoMuted = ReturnType<typeof showVideoMuted.value>
// End Room Methods

/**
 * Room Member Methods
 */
export const audioMuteMember = createRoomMemberMethod<
  BaseServerPayload,
  boolean
>('video.member.audio_mute', baseCodeTransform)
export const audioUnmuteMember = createRoomMemberMethod<
  BaseServerPayload,
  boolean
>('video.member.audio_unmute', baseCodeTransform)
export const videoMuteMember = createRoomMemberMethod<
  BaseServerPayload,
  boolean
>('video.member.video_mute', baseCodeTransform)
export const videoUnmuteMember = createRoomMemberMethod<
  BaseServerPayload,
  boolean
>('video.member.video_unmute', baseCodeTransform)
export const deafMember = createRoomMemberMethod<BaseServerPayload, boolean>(
  'video.member.deaf',
  baseCodeTransform
)
export const undeafMember = createRoomMemberMethod<BaseServerPayload, boolean>(
  'video.member.undeaf',
  baseCodeTransform
)
export const setInputVolumeMember = createRoomMemberMethod<
  BaseServerPayload,
  boolean
>('video.member.set_input_volume', baseCodeTransform)
export const setOutputVolumeMember = createRoomMemberMethod<
  BaseServerPayload,
  boolean
>('video.member.set_output_volume', baseCodeTransform)
export const setInputSensitivityMember = createRoomMemberMethod<
  BaseServerPayload,
  boolean
>('video.member.set_input_sensitivity', baseCodeTransform)
export const removeMember: RoomMethodDescriptor<boolean> = {
  value: function ({ memberId, ...rest }: RoomMemberMethodParams = {}) {
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
      baseCodeTransform
    )
  },
}

export type AudioMuteMember = ReturnType<typeof audioMuteMember.value>
export type AudioUnmuteMember = ReturnType<typeof audioUnmuteMember.value>
export type VideoMuteMember = ReturnType<typeof videoMuteMember.value>
export type VideoUnmuteMember = ReturnType<typeof videoUnmuteMember.value>
export type DeafMember = ReturnType<typeof deafMember.value>
export type UndeafMember = ReturnType<typeof undeafMember.value>
export type SetInputVolumeMember = ReturnType<typeof setInputVolumeMember.value>
export type SetOutputVolumeMember = ReturnType<
  typeof setOutputVolumeMember.value
>
export type SetInputSensitivityMember = ReturnType<
  typeof setInputSensitivityMember.value
>
export type RemoveMember = ReturnType<typeof removeMember.value>
// End Room Member Methods
