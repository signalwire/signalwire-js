export interface CapabilityOnOffStateContract {
  on: boolean
  off: boolean
}

export interface MemberCapabilityContract {
  muteAudio: CapabilityOnOffStateContract
  muteVideo: CapabilityOnOffStateContract
  microphoneVolume: boolean
  microphoneSensitivity: boolean
  speakerVolume: boolean
  deaf: CapabilityOnOffStateContract
  raisehand: CapabilityOnOffStateContract
  position: boolean
  meta: boolean
  remove: boolean
  audioFlags: boolean
  end: boolean
}

export interface CallCapabilitiesContract {
  self: MemberCapabilityContract
  member: MemberCapabilityContract
  end: boolean
  setLayout: boolean
  sendDigit: boolean
  vmutedHide: CapabilityOnOffStateContract
  lock: CapabilityOnOffStateContract
  device: boolean
  screenshare: boolean
}
