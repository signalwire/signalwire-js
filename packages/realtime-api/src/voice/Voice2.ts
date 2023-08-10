import { toExternalJSON, uuid } from '@signalwire/core'
import type {
  VoiceCallDialPhoneMethodParams,
  VoiceCallDialSipMethodParams,
  ToExternalJSONResult,
  CallingCallDialFailedEventParams,
  VoiceDialerParams,
  CallReceived,
} from '@signalwire/core'
import { Call } from './Call2'
import { voiceCallingWorker } from './workers'
import { DeviceBuilder } from './DeviceBuilder'
import type {
  RealTimeCallApiEvents,
  RealTimeCallListeners,
  VoiceEvents,
} from '../types'
import { toInternalDevices } from './utils'
import { BaseNamespace, ListenOptions } from '../BaseNamespace'
import { SWClient } from '../SWClient'

interface VoiceListenOptions extends ListenOptions {
  onCallReceived?: (call: Call) => unknown
}

type VoiceListenersKeys = keyof Omit<VoiceListenOptions, 'topics'>

export class Voice extends BaseNamespace<VoiceListenOptions, VoiceEvents> {
  private _tag: string
  protected _eventMap: Record<VoiceListenersKeys, CallReceived> = {
    onCallReceived: 'call.received',
  }
  protected _callListeners: RealTimeCallListeners | undefined

  constructor(options: SWClient) {
    super({ swClient: options })

    this._tag = uuid()

    this._client.runWorker('voiceCallingWorker', {
      worker: voiceCallingWorker,
      initialState: {
        voice: this,
        tag: this._tag,
      },
    })
  }

  set callListeners(listeners) {
    this._callListeners = listeners
  }

  get callListeners() {
    return this._callListeners
  }

  dial(params: VoiceDialerParams & { listen?: RealTimeCallListeners }) {
    return new Promise<Call>((resolve, reject) => {
      this.callListeners = params.listen

      const resolveHandler = (call: Call) => {
        // @ts-expect-error
        this.off('dial.failed', rejectHandler)
        resolve(call)
      }

      const rejectHandler = (
        error: ToExternalJSONResult<CallingCallDialFailedEventParams>
      ) => {
        // @ts-expect-error
        this.off('dial.answered', resolveHandler)
        reject(toExternalJSON(error))
      }

      // @ts-expect-error
      this.once('dial.answered', resolveHandler)
      // @ts-expect-error
      this.once('dial.failed', rejectHandler)

      let executeParams: Record<string, any>
      if (params instanceof DeviceBuilder) {
        const { devices } = params
        executeParams = {
          tag: this._tag,
          devices: toInternalDevices(devices),
        }
      } else if ('region' in params) {
        const { region, devices: deviceBuilder } = params
        executeParams = {
          tag: this._tag,
          region,
          devices: toInternalDevices(deviceBuilder.devices),
        }
      } else {
        throw new Error('[dial] Invalid input')
      }

      this._client
        .execute({
          method: 'calling.dial',
          params: executeParams,
        })
        .catch((e) => {
          reject(e)
        })
    })
  }

  dialPhone({
    region,
    maxPricePerMinute,
    listen,
    ...params
  }: VoiceCallDialPhoneMethodParams & { listen?: RealTimeCallListeners }) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Phone(params))
    return this.dial({
      maxPricePerMinute,
      region,
      devices,
      listen,
    })
  }

  dialSip({
    region,
    maxPricePerMinute,
    listen,
    ...params
  }: VoiceCallDialSipMethodParams & { listen?: RealTimeCallListeners }) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Sip(params))
    return this.dial({
      maxPricePerMinute,
      region,
      devices,
      listen,
    })
  }
}

export { Call } from './Call'
export type { RealTimeCallApiEvents }
export { DeviceBuilder }
export { Playlist } from './Playlist'
export type { CallPlayback } from './CallPlayback'
export type { CallPrompt } from './CallPrompt'
export type { CallRecording } from './CallRecording'
export type { CallTap } from './CallTap'
export type {
  CallingCallDirection,
  CallingCallState,
  CallingCallWaitForState,
  ClientEvents,
  CollectDigitsConfig,
  CollectSpeechConfig,
  CreateVoicePlaylistParams,
  NestedArray,
  RingtoneName,
  SipCodec,
  SipHeader,
  SpeechOrDigits,
  TapDevice,
  TapDeviceRTP,
  TapDeviceWS,
  TapDirection,
  VoiceCallConnectMethodParams,
  VoiceCallConnectPhoneMethodParams,
  VoiceCallConnectSipMethodParams,
  VoiceCallContract,
  VoiceCallDetectContract,
  VoiceCallDetectDigitParams,
  VoiceCallDetectFaxParams,
  VoiceCallDetectMachineParams,
  VoiceCallDetectMethodParams,
  VoiceCallCollectContract,
  VoiceCallCollectMethodParams,
  VoiceCallDeviceParams,
  VoiceCallDialPhoneMethodParams,
  VoiceCallDialRegionParams,
  VoiceCallDialSipMethodParams,
  VoiceCallDisconnectReason,
  VoiceCallPhoneParams,
  VoiceCallPlayAudioMethodParams,
  VoiceCallPlayAudioParams,
  VoiceCallPlaybackContract,
  VoiceCallPlayParams,
  VoiceCallPlayRingtoneMethodParams,
  VoiceCallPlayRingtoneParams,
  VoiceCallPlaySilenceMethodParams,
  VoiceCallPlaySilenceParams,
  VoiceCallPlayTTSMethodParams,
  VoiceCallPlayTTSParams,
  VoiceCallPromptAudioMethodParams,
  VoiceCallPromptContract,
  VoiceCallPromptMethodParams,
  VoiceCallPromptRingtoneMethodParams,
  VoiceCallPromptTTSMethodParams,
  VoiceCallRecordingContract,
  VoiceCallRecordMethodParams,
  VoiceCallSipParams,
  VoiceCallTapAudioMethodParams,
  VoiceCallTapContract,
  VoiceCallTapMethodParams,
  VoiceDeviceBuilder,
  VoiceDialerParams,
  VoicePlaylist,
} from '@signalwire/core'
