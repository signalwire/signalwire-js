import {
  CallCapabilitiesContract,
  CapabilityOnOffStateContract,
  MemberCapabilityContract,
} from '../interfaces/capabilities'

class CapabilityOnOffState implements CapabilityOnOffStateContract {
  constructor(private _flags: string[]) {}

  get on() {
    return this._flags.some((flag) => !flag.endsWith('.off'))
  }

  get off() {
    return this._flags.some((flag) => !flag.endsWith('.on'))
  }
}

class MemberCapability implements MemberCapabilityContract {
  private _muteAudio?: CapabilityOnOffState
  private _muteVideo?: CapabilityOnOffState
  private _deaf?: CapabilityOnOffState
  private _raisehand?: CapabilityOnOffState

  constructor(
    private _flags: string[],
    private _memberType: 'self' | 'member'
  ) {}

  get muteAudio() {
    this._muteAudio =
      this._muteAudio ??
      new CapabilityOnOffState(
        this._flags.filter(
          (flag) =>
            flag === this._memberType ||
            flag === `${this._memberType}.mute` ||
            flag.startsWith(`${this._memberType}.mute.audio`)
        )
      )
    return this._muteAudio
  }

  get muteVideo() {
    this._muteVideo =
      this._muteVideo ??
      new CapabilityOnOffState(
        this._flags.filter(
          (flag) =>
            flag === this._memberType ||
            flag === `${this._memberType}.mute` ||
            flag.startsWith(`${this._memberType}.mute.video`)
        )
      )
    return this._muteVideo
  }

  get microphoneVolume() {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag === `${this._memberType}.microphone` ||
        flag.startsWith(`${this._memberType}.microphone.volume`)
    )
  }

  get microphoneSensitivity() {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag === `${this._memberType}.microphone` ||
        flag.startsWith(`${this._memberType}.microphone.sensitivity`)
    )
  }

  get speakerVolume() {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag === `${this._memberType}.speaker` ||
        flag.startsWith(`${this._memberType}.speaker.volume`)
    )
  }

  get deaf() {
    this._deaf =
      this._deaf ??
      new CapabilityOnOffState(
        this._flags.filter(
          (flag) =>
            flag === this._memberType ||
            flag.startsWith(`${this._memberType}.deaf`)
        )
      )
    return this._deaf
  }

  get raisehand() {
    this._raisehand =
      this._raisehand ??
      new CapabilityOnOffState(
        this._flags.filter(
          (flag) =>
            flag === this._memberType ||
            flag.startsWith(`${this._memberType}.raisehand`)
        )
      )
    return this._raisehand
  }

  get position() {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag.startsWith(`${this._memberType}.position`)
    )
  }

  get meta() {
    return this._flags.some(
      (flag) =>
        flag === this._memberType || flag.startsWith(`${this._memberType}.meta`)
    )
  }

  get remove() {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag.startsWith(`${this._memberType}.remove`)
    )
  }

  get audioFlags() {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag.startsWith(`${this._memberType}.audioflags.set`)
    )
  }

  get end() {
    return this._flags.some(
      (flag) =>
        flag === this._memberType ||
        flag === `${this._memberType}.end`
    );
  }
}

export class CallCapabilities implements CallCapabilitiesContract {
  private _self?: MemberCapabilityContract
  private _member?: MemberCapabilityContract
  private _vmutedHide?: CapabilityOnOffState
  private _lock?: CapabilityOnOffState

  constructor(private _flags: string[]) {}

  private _buildMemberCapability(memberType: 'self' | 'member') {
    return new MemberCapability(
      this._flags.filter((flag) => flag.startsWith(memberType)),
      memberType
    )
  }

  get self() {
    this._self = this._self ?? this._buildMemberCapability('self')
    return this._self
  }

  get member() {
    this._member = this._member ?? this._buildMemberCapability('member')
    return this._member
  }

  get end() {
    return this._flags.some((capability) => capability === 'end')
  }

  get setLayout() {
    return this._flags.some((capability) => capability.startsWith('layout'))
  }

  get sendDigit() {
    return this._flags.some((capability) => capability.startsWith('digit'))
  }

  get vmutedHide() {
    this._vmutedHide =
      this._vmutedHide ??
      new CapabilityOnOffState(
        this._flags.filter((flag) => flag.startsWith('vmuted'))
      )
    return this._vmutedHide
  }

  get lock() {
    this._lock =
      this._lock ??
      new CapabilityOnOffState(
        this._flags.filter((flag) => flag.startsWith('lock'))
      )
    return this._lock
  }

  get device() {
    return this._flags.some((capability) => capability === 'device')
  }

  get screenshare() {
    return this._flags.some((capability) => capability === 'screenshare')
  }
}

export const mapCapabilityPayload = (capabilities: string[]) =>
  new CallCapabilities(capabilities)
