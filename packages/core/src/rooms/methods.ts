import { BaseRoomInterface } from '.'
import { RoomMethod } from '../utils/interfaces'

type RoomMethodDescriptor = PropertyDescriptor & ThisType<BaseRoomInterface>

type RoomMethodParams = {
  [key: string]: unknown
}
const createRoomMethod = (method: RoomMethod): RoomMethodDescriptor => ({
  value: function (params: RoomMethodParams = {}) {
    return this.execute({
      method,
      params: {
        room_session_id: this.roomSessionId,
        ...params,
      },
    })
  },
})

/**
 * Type the params for each room member method
 * that uses the provided memberId or fallback
 * to the instance memberId.
 * Additional params can be passed as `value`
 * or `volume`.
 */
type RoomMemberMethodParams = {
  memberId?: string
  [key: string]: unknown
}
const createRoomMemberMethod = (method: RoomMethod): RoomMethodDescriptor => ({
  value: function ({ memberId, ...rest }: RoomMemberMethodParams = {}) {
    return this.execute({
      method,
      params: {
        room_session_id: this.roomSessionId,
        member_id: memberId || this.memberId,
        ...rest,
      },
    })
  },
})

/**
 * Room Methods
 */
export const getLayoutList = createRoomMethod('video.list_available_layouts')
export const setLayout = createRoomMethod('video.set_layout')
export const hideVideoMuted = createRoomMethod('video.hide_video_muted')
export const showVideoMuted = createRoomMethod('video.show_video_muted')
export const getMemberList = createRoomMethod('video.members.get')
// End Room Methods

/**
 * Room Member Methods
 */
export const audioMuteMember = createRoomMemberMethod('video.member.audio_mute')
export const audioUnmuteMember = createRoomMemberMethod(
  'video.member.audio_unmute'
)
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
// End Room Member Methods
