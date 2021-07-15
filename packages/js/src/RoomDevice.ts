import { BaseConnection } from '@signalwire/webrtc'
import { MemberCommandParams } from './utils/interfaces'
import {
  audioMuteMemberAction,
  audioUnmuteMemberAction,
  videoMuteMemberAction,
  videoUnmuteMemberAction,
  setOutputVolumeMemberAction,
  setInputSensitivityMemberAction,
} from './features/actions'

export class RoomDevice extends BaseConnection {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }

  audioMute({ memberId }: MemberCommandParams = {}) {
    const action = audioMuteMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  audioUnmute({ memberId }: MemberCommandParams = {}) {
    const action = audioUnmuteMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  videoMute({ memberId }: MemberCommandParams = {}) {
    const action = videoMuteMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  videoUnmute({ memberId }: MemberCommandParams = {}) {
    const action = videoUnmuteMemberAction({ instance: this, memberId })
    return this.execute(action)
  }

  public setMicrophoneVolume({ volume }: { volume: number }) {
    const action = setOutputVolumeMemberAction({
      instance: this,
      volume: +volume,
    })
    return this.execute(action)
  }

  public setInputSensitivity({ value }: { value: number }) {
    const action = setInputSensitivityMemberAction({
      instance: this,
      value: +value,
    })
    return this.execute(action)
  }
}
