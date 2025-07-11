import {
  CapabilityError,
  MemberCommandParams,
  MemberCommandWithValueParams,
  MemberCommandWithVolumeParams,
  Rooms,
  SetAudioFlagsParams,
} from '@signalwire/core'
import { CallSessionConnection } from '../CallSession'

const isSelfMember = (
  params: MemberCommandParams | undefined,
  ctx: CallSessionConnection
) => {
  return !params?.memberId || params.memberId === ctx.member.id
}

export function validateAudioMute(
  this: CallSessionConnection,
  params?: MemberCommandParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self.muteAudio.off
    : this.capabilities?.member.muteAudio.off
  if (!capability) {
    throw new CapabilityError('Missing audio mute capability')
  }
}

export function validateAudioUnmute(
  this: CallSessionConnection,
  params?: MemberCommandParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self.muteAudio.on
    : this.capabilities?.member.muteAudio.on
  if (!capability) {
    throw new CapabilityError('Missing audio unmute capability')
  }
}

export function validateVideoMute(
  this: CallSessionConnection,
  params?: MemberCommandParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self.muteVideo.off
    : this.capabilities?.member.muteVideo.off
  if (!capability) {
    throw new CapabilityError('Missing video mute capability')
  }
}

export function validateVideoUnmute(
  this: CallSessionConnection,
  params?: MemberCommandParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self.muteVideo.on
    : this.capabilities?.member.muteVideo.on
  if (!capability) {
    throw new CapabilityError('Missing video unmute capability')
  }
}

export function validateDeaf(
  this: CallSessionConnection,
  params?: MemberCommandParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self.deaf.on
    : this.capabilities?.member.deaf.on
  if (!capability) {
    throw new CapabilityError('Missing deaf capability')
  }
}

export function validateUndeaf(
  this: CallSessionConnection,
  params?: MemberCommandParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self.deaf.off
    : this.capabilities?.member.deaf.off
  if (!capability) {
    throw new CapabilityError('Missing undeaf capability')
  }
}

export function validateRemoveMember(
  this: CallSessionConnection,
  params: Required<MemberCommandParams>
) {
  if (!params?.memberId) {
    throw new TypeError('Invalid or missing "memberId" argument')
  }
  const capability = this.capabilities?.member.remove
  if (!capability) {
    throw new CapabilityError('Missing remove member capability')
  }
}

export function validateSetRaiseHand(
  this: CallSessionConnection,
  params?: Rooms.SetRaisedHandRoomParams
) {
  const { raised = true } = params || {}
  const self = isSelfMember(params, this)
  const raiseCap = self
    ? this.capabilities?.self.raisehand.on
    : this.capabilities?.member.raisehand.on
  const lowerCap = self
    ? this.capabilities?.self.raisehand.off
    : this.capabilities?.member.raisehand.off
  if (raised && !raiseCap) {
    throw new CapabilityError('Missing raisehand capability')
  }
  if (!raised && !lowerCap) {
    throw new CapabilityError('Missing lowerhand capability')
  }
}

export function validateSetLayout(this: CallSessionConnection) {
  if (!this.capabilities?.setLayout) {
    throw new CapabilityError('Missing setLayout capability')
  }
}

export function validateSetInputVolume(
  this: CallSessionConnection,
  params: MemberCommandWithVolumeParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self?.microphoneVolume
    : this.capabilities?.member?.microphoneVolume
  if (!capability) {
    throw new CapabilityError('Missing setInputVolume capability')
  }
  if (params.volume < -50 || params.volume > 50) {
    throw new RangeError('The volume ranges from -50 to 50')
  }
}

export function validateSetOutputVolume(
  this: CallSessionConnection,
  params: MemberCommandWithVolumeParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self?.speakerVolume
    : this.capabilities?.member?.speakerVolume
  if (!capability) {
    throw new CapabilityError('Missing setOutputVolume capability')
  }
  if (params.volume < -50 || params.volume > 50) {
    throw new RangeError('The volume ranges from -50 to 50')
  }
}

export function validateSetInputSensitivity(
  this: CallSessionConnection,
  params: MemberCommandWithValueParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self.microphoneSensitivity
    : this.capabilities?.member.microphoneSensitivity
  if (!capability) {
    throw new CapabilityError('Missing setInputSensitivity capability')
  }
  if (params.value < 0 || params.value > 100) {
    throw new RangeError('The sensitivity value ranges from 0 to 100')
  }
}

export function validateSetPositions(
  this: CallSessionConnection,
  params: Rooms.SetPositionsParams
) {
  if (params.positions && !Object.keys(params.positions).length) {
    throw new TypeError('Invalid positions specified')
  }
  const hasSelfPositions = Object.keys(params.positions).some((p) =>
    ['self', `${this.memberId}`].includes(p)
  )
  const capability = hasSelfPositions
    ? this.capabilities?.self.position
    : this.capabilities?.member.position
  if (!capability) {
    throw new CapabilityError('Missing setPositions capability')
  }
}

export function validateLock(this: CallSessionConnection) {
  if (!this.capabilities?.lock.on) {
    throw new CapabilityError('Missing lock capability')
  }
}

export function validateUnlock(this: CallSessionConnection) {
  if (!this.capabilities?.lock.off) {
    throw new CapabilityError('Missing unlock capability')
  }
}

export function validateSetAudioFlags(
  this: CallSessionConnection,
  params?: SetAudioFlagsParams
) {
  const isSelf = isSelfMember(params, this)
  const capability = isSelf
    ? this.capabilities?.self.audioFlags
    : this.capabilities?.member.audioFlags
  if (!capability) {
    throw new CapabilityError('Missing audio flags capability')
  }

  const { echoCancellation, autoGain, noiseSuppression } = params || {}
  if (
    echoCancellation === undefined &&
    autoGain === undefined &&
    noiseSuppression === undefined
  ) {
    throw new TypeError(
      'Invalid parameters: you must specify at least one of `echoCancellation`, `autoGain`, or `noiseSuppression`'
    )
  }
}
