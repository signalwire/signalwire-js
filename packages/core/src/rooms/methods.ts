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
export const hideVideoMuted = createRoomMethod('video.hide_video_muted')
export const showVideoMuted = createRoomMethod('video.show_video_muted')

export type GetLayoutList = ReturnType<typeof getLayoutList.value>
export type GetMemberList = ReturnType<typeof getMemberList.value>
// End Room Methods

/**
 * Transform for returning true/false based on the response `code`
 * from the server
 */
const baseCodeTransform = ({ code }: BaseServerPayload) => code === '200'

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
export const videoMuteMember = createRoomMemberMethod('video.member.video_mute')
export const videoUnmuteMember = createRoomMemberMethod(
  'video.member.video_unmute'
)
export const deafMember = createRoomMemberMethod('video.member.deaf')
export const undeafMember = createRoomMemberMethod('video.member.undeaf')
export const setInputVolumeMember = createRoomMemberMethod(
  'video.member.set_input_volume'
)
export const setOutputVolumeMember = createRoomMemberMethod(
  'video.member.set_output_volume'
)
export const setInputSensitivityMember = createRoomMemberMethod(
  'video.member.set_input_sensitivity'
)
export const removeMember: RoomMethodDescriptor = {
  value: function ({ memberId, ...rest }: RoomMemberMethodParams = {}) {
    if (!memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }
    return this.execute({
      method: 'video.member.remove',
      params: {
        room_session_id: this.roomSessionId,
        member_id: memberId,
        ...rest,
      },
    })
  },
}

export type AudioMuteMember = ReturnType<typeof audioMuteMember.value>
export type AudioUnmuteMember = ReturnType<typeof audioUnmuteMember.value>
// End Room Member Methods
