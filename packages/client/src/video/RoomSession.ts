import {
  UserOptions,
} from '@signalwire/core'

import type { MakeRoomOptions } from '../Client'
import { VideoRoomSession } from './VideoRoomSession'

/**
 * List of properties/methods the user shouldn't be able to
 * use until they sucessfully call `roomSession.join()`.
 */
export const UNSAFE_PROP_ACCESS = [
  'audioMute',
  'audioUnmute',
  'deaf',
  'getLayouts',
  'getMembers',
  'getRecordings',
  'hideVideoMuted',
  'leave',
  'removerMember',
  'restoreOutboundAudio',
  'restoreOutboundVideo',
  'setInputSensitivity',
  'setInputVolume',
  'setLayout',
  'setPositions',
  'setMemberPosition',
  'setOutputVolume',
  'showVideoMuted',
  'startRecording',
  'stopOutboundAudio',
  'stopOutboundVideo',
  'undeaf',
  'videoMute',
  'videoUnmute',
  'setMicrophoneVolume',
  'setSpeakerVolume',
  'getMeta',
  'setMeta',
  'updateMeta',
  'deleteMeta',
  'getMemberMeta',
  'setMemberMeta',
  'updateMemberMeta',
  'deleteMemberMeta',
  'promote',
  'demote',
  'lock',
  'unlock',
]

export interface RoomSessionOptions extends UserOptions, MakeRoomOptions {}

export interface RoomSession extends VideoRoomSession {
  new (opts: RoomSessionOptions): this
}