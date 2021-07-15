import type { Constructor, BCConstructor } from './'
import type {
  MemberCommandParams,
  MemberCommandWithValueParams,
  MemberCommandWithVolumeParams,
} from '../../utils/interfaces'

interface RoomMemberMethods {
  audioMute(): Promise<unknown>
  audioUnmute(): Promise<unknown>
  videoMute(): Promise<unknown>
  videoUnmute(): Promise<unknown>
  setMicrophoneVolume(params: MemberCommandWithVolumeParams): Promise<unknown>
  setInputSensitivity(params: MemberCommandWithValueParams): Promise<unknown>
}
export type RoomMemberConstructor = Constructor<RoomMemberMethods>

export function withRoomMemberMethods<T extends BCConstructor>(
  Base: T
): T & RoomMemberConstructor {
  return class extends Base {
    audioMute({ memberId }: MemberCommandParams = {}) {
      return this._memberCommand({
        method: 'video.member.audio_mute',
        memberId,
      })
    }

    audioUnmute({ memberId }: MemberCommandParams = {}) {
      return this._memberCommand({
        method: 'video.member.audio_unmute',
        memberId,
      })
    }

    videoMute({ memberId }: MemberCommandParams = {}) {
      return this._memberCommand({
        method: 'video.member.video_mute',
        memberId,
      })
    }

    videoUnmute({ memberId }: MemberCommandParams = {}) {
      return this._memberCommand({
        method: 'video.member.video_unmute',
        memberId,
      })
    }

    setMicrophoneVolume({ memberId, volume }: MemberCommandWithVolumeParams) {
      return this._memberCommand({
        method: 'video.member.set_output_volume',
        memberId,
        volume: +volume,
      })
    }

    setInputSensitivity({ memberId, value }: MemberCommandWithValueParams) {
      return this._memberCommand({
        method: 'video.member.set_input_sensitivity',
        memberId,
        value: +value,
      })
    }
  }
}
