import {
  CallCapabilities,
  CapabilityOnOffState,
  MemberCapability,
} from '@signalwire/core'

export const stripNamespacePrefix = (
  event: string,
  namespace?: string
): string => {
  if (namespace && typeof namespace === 'string') {
    const regex = new RegExp(`^${namespace}\.`)
    return event.replace(regex, '')
  }
  const items = event.split('.')
  if (items.length > 1) {
    items.shift()
    return items.join('.')
  }
  return event
}

class CapabilityOnOffStateImpl implements CapabilityOnOffState {
  constructor(private _flags: string[]) {}

  get on(): boolean {
    return this._flags.some((flag) =>
      /^(.*\.on|(?:(?!.*\.off$).*))$/.test(flag)
    )
  }

  get off(): boolean {
    return this._flags.some((flag) =>
      /^(.*\.off|(?:(?!.*\.on$).*))$/.test(flag)
    )
  }
}

class MemberCapabilityImpl implements MemberCapability {
  private _muteAudio?: CapabilityOnOffStateImpl
  private _muteVideo?: CapabilityOnOffStateImpl
  private _deaf?: CapabilityOnOffStateImpl
  private _raisehand?: CapabilityOnOffStateImpl

  constructor(
    private _flags: string[],
    private _memberType: 'self' | 'member'
  ) {}

  get muteAudio(): CapabilityOnOffState {
    this._muteAudio =
      this._muteAudio ??
      new CapabilityOnOffStateImpl(
        this._flags.filter(
          (flag) =>
            flag === this._memberType ||
            flag === `${this._memberType}.mute` ||
            flag.startsWith(`${this._memberType}.mute.audio`)
        )
      )
    return this._muteAudio!
  }

  get muteVideo(): CapabilityOnOffState {
    this._muteVideo =
      this._muteVideo ??
      new CapabilityOnOffStateImpl(
        this._flags.filter(
          (flag) =>
            flag === this._memberType ||
            flag === `${this._memberType}.mute` ||
            flag.startsWith(`${this._memberType}.mute.video`)
        )
      )
    return this._muteVideo!
  }

  get microphoneVolume(): boolean {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag === `${this._memberType}.microphone` ||
        flag.startsWith(`${this._memberType}.microphone.volume`)
    )
  }

  get microphoneSensitivity(): boolean {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag === `${this._memberType}.microphone` ||
        flag.startsWith(`${this._memberType}.microphone.sensitivity`)
    )
  }

  get speakerVolume(): boolean {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
      flag === `${this._memberType}.speaker` ||
        flag.startsWith(`${this._memberType}.speaker.volume`)
    )
  }

  get deaf(): CapabilityOnOffState {
    this._deaf =
      this._deaf ??
      new CapabilityOnOffStateImpl(
        this._flags.filter(
          (flag) =>
            flag === this._memberType ||
            flag.startsWith(`${this._memberType}.deaf`)
        )
      )
    return this._deaf!
  }

  get raisehand(): CapabilityOnOffState {
    this._raisehand =
      this._raisehand ??
      new CapabilityOnOffStateImpl(
        this._flags.filter(
          (flag) =>
            flag === this._memberType ||
            flag.startsWith(`${this._memberType}.raisehand`)
        )
      )
    return this._raisehand!
  }

  get position(): boolean {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag.startsWith(`${this._memberType}.position`)
    )
  }

  get meta(): boolean {
    return this._flags.some(
      (flag) =>
        flag === this._memberType || flag.startsWith(`${this._memberType}.meta`)
    )
  }

  get remove(): boolean {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag.startsWith(`${this._memberType}.remove`)
    )
  }
}

class CallCapabilitiesImpl implements CallCapabilities {
  private _self?: MemberCapability
  private _member?: MemberCapability
  private _vmutedHide?: CapabilityOnOffStateImpl
  private _lock?: CapabilityOnOffStateImpl

  constructor(private _flags: string[]) {}

  private _buildMemberCapacity(memberType: 'self' | 'member') {
    return new MemberCapabilityImpl(
      this._flags.filter((flag) => flag.startsWith(memberType)),
      memberType
    )
  }

  get self(): MemberCapability {
    this._self = this._self ?? this._buildMemberCapacity('self')
    return this._self!
  }

  get member(): MemberCapability {
    this._member = this._member ?? this._buildMemberCapacity('member')
    return this._member!
  }

  get end(): boolean {
    return this._flags.some((capability) => capability === 'end')
  }

  get setLayout(): boolean {
    return this._flags.some((capability) => capability.startsWith('layout'))
  }

  get sendDigit(): boolean {
    return this._flags.some((capability) => capability.startsWith('digit'))
  }

  get vmutedHide(): CapabilityOnOffState {
    this._vmutedHide =
      this._vmutedHide ??
      new CapabilityOnOffStateImpl(
        this._flags.filter((flag) => flag.startsWith('vmuted'))
      )
    return this._vmutedHide!
  }

  get lock(): CapabilityOnOffState {
    this._lock =
      this._lock ??
      new CapabilityOnOffStateImpl(
        this._flags.filter((flag) => flag.startsWith('lock'))
      )
    return this._lock!
  }

  get device(): boolean {
    return this._flags.some((capability) => capability === 'device')
  }

  get screenshare(): boolean {
    return this._flags.some((capability) => capability === 'screenshare')
  }
}

export const mapCapabilityPayload = (capabilities: string[]) =>
  new CallCapabilitiesImpl(capabilities)
