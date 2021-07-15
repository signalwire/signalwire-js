import { createAction } from '@reduxjs/toolkit'
import { RoomMethod } from '@signalwire/core'

export const audioSetSpeakerAction = createAction<string>(
  'swJs/audioSetSpeakerAction'
)

interface Instance {
  roomSessionId: string
  memberId: string
}

type RoomCommandActionParams = {
  instance: Instance
  [key: string]: unknown
}
const createRoomCommandAction = (method: RoomMethod) => {
  return ({ instance, ...rest }: RoomCommandActionParams) => ({
    method,
    params: {
      room_session_id: instance.roomSessionId,
      ...rest,
    },
  })
}
type RoomCommandMemberActionParams = {
  instance: Instance
  memberId?: string
  [key: string]: unknown
}
const createRoomMemberCommandAction = (method: RoomMethod) => {
  return ({ instance, memberId, ...rest }: RoomCommandMemberActionParams) => ({
    method,
    params: {
      room_session_id: instance.roomSessionId,
      member_id: memberId || instance.memberId,
      ...rest,
    },
  })
}

/**
 * Room Commands
 */
export const getLayoutListAction = createRoomCommandAction(
  'video.list_available_layouts'
)
export const setLayoutAction = createRoomCommandAction('video.set_layout')
export const hideVideoMutedAction = createRoomCommandAction(
  'video.hide_video_muted'
)
export const showVideoMutedAction = createRoomCommandAction(
  'video.show_video_muted'
)
export const getMemberListAction = createRoomCommandAction('video.members.get')
// End Room Commands

/**
 * Room Member Commands
 */
export const audioMuteMemberAction = createRoomMemberCommandAction(
  'video.member.audio_mute'
)
export const audioUnmuteMemberAction = createRoomMemberCommandAction(
  'video.member.audio_unmute'
)
export const videoMuteMemberAction = createRoomMemberCommandAction(
  'video.member.video_mute'
)
export const videoUnmuteMemberAction = createRoomMemberCommandAction(
  'video.member.video_unmute'
)
// prettier-ignore
export const deafMemberAction = createRoomMemberCommandAction(
  'video.member.deaf'
)
export const undeafMemberAction = createRoomMemberCommandAction(
  'video.member.undeaf'
)
export const removeMemberAction = createRoomMemberCommandAction(
  'video.member.remove'
)
export const setInputVolumeMemberAction = createRoomMemberCommandAction(
  'video.member.set_input_volume'
)
export const setOutputVolumeMemberAction = createRoomMemberCommandAction(
  'video.member.set_output_volume'
)
export const setInputSensitivityMemberAction = createRoomMemberCommandAction(
  'video.member.set_input_sensitivity'
)
// End Room Member Commands
