import type { Constructor, BCConstructor } from '.'
import type {
  MemberCommandParams,
  // MemberCommandWithValueParams,
  MemberCommandWithVolumeParams,
} from '../../utils/interfaces'

interface RoomControlMethods {
  getMemberList(): Promise<unknown>
  deaf(params: MemberCommandParams): Promise<unknown>
  undeaf(params: MemberCommandParams): Promise<unknown>
  setSpeakerVolume(params: MemberCommandWithVolumeParams): Promise<unknown>
  removeMember(params: Required<MemberCommandParams>): Promise<unknown>
  hideVideoMuted(): Promise<unknown>
  showVideoMuted(): Promise<unknown>
}
export type RoomControlConstructor = Constructor<RoomControlMethods>

export function withRoomControlMethods<T extends BCConstructor>(
  Base: T
): T & RoomControlConstructor {
  return class extends Base {
    getMemberList() {
      return this.execute({
        method: 'video.members.get',
        params: {
          room_session_id: this.roomSessionId,
        },
      })
    }

    deaf({ memberId }: MemberCommandParams = {}) {
      return this._memberCommand({
        method: 'video.member.deaf',
        memberId,
      })
    }

    undeaf({ memberId }: MemberCommandParams = {}) {
      return this._memberCommand({
        method: 'video.member.undeaf',
        memberId,
      })
    }

    setSpeakerVolume({ memberId, volume }: MemberCommandWithVolumeParams) {
      return this._memberCommand({
        method: 'video.member.set_input_volume',
        memberId,
        volume: +volume,
      })
    }

    removeMember({ memberId }: Required<MemberCommandParams>) {
      if (!memberId) {
        throw new TypeError('Invalid or missing "memberId" argument')
      }
      return this._memberCommand({
        method: 'video.member.remove',
        memberId,
      })
    }

    hideVideoMuted() {
      return this.execute({
        method: 'video.hide_video_muted',
        params: {
          room_session_id: this.roomSessionId,
        },
      })
    }

    showVideoMuted() {
      return this.execute({
        method: 'video.show_video_muted',
        params: {
          room_session_id: this.roomSessionId,
        },
      })
    }
  }
}
