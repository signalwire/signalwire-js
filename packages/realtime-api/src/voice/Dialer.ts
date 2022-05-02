import type {
  CreateVoiceDialerParams,
  VoiceDialer,
  VoiceCallDeviceParams,
  VoiceCallPhoneParams,
  VoiceCallDialPhoneMethodParams,
  VoiceCallSipParams,
  VoiceCallDialSipMethodParams,
} from '@signalwire/core'

export class Dialer implements VoiceDialer {
  private _devices: VoiceDialer['devices'] = []

  constructor(private params: CreateVoiceDialerParams = {}) {}

  get region() {
    return this.params?.region
  }

  get devices() {
    return this._devices
  }

  add(params: VoiceCallDeviceParams | VoiceCallDeviceParams[]) {
    if (Array.isArray(params)) {
      this._devices.push(params)
    } else {
      this._devices.push([params])
    }

    return this
  }

  static Phone(params: VoiceCallDialPhoneMethodParams): VoiceCallPhoneParams {
    return { type: 'phone', ...params }
  }

  static Sip(params: VoiceCallDialSipMethodParams): VoiceCallSipParams {
    return { type: 'sip', ...params }
  }
}
