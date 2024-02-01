import { toExternalJSON, uuid } from '@signalwire/core'
import type {
  ToExternalJSONResult,
  CallingCallDialFailedEventParams,
} from '@signalwire/core'
import { Call } from './Call'
import { voiceCallReceiveWorker, voiceCallDialWorker } from './workers'
import { DeviceBuilder } from './DeviceBuilder'
import type {
  VoiceDialMethodParams,
  VoiceDialPhonelMethodParams,
  VoiceDialSipMethodParams,
  VoiceEvents,
  VoiceListeners,
  VoiceListenersEventsMapping,
} from '../types'
import { toInternalDevices } from './utils'
import { BaseNamespace } from '../BaseNamespace'
import { SWClient } from '../SWClient'

interface VoiceListenOptions extends VoiceListeners {
  topics: string[]
}

export class Voice extends BaseNamespace<VoiceListenOptions, VoiceEvents> {
  protected _eventMap: VoiceListenersEventsMapping = {
    onCallReceived: 'call.received',
  }

  constructor(options: SWClient) {
    super(options)

    this._client.runWorker('voiceCallReceiveWorker', {
      worker: voiceCallReceiveWorker,
      initialState: {
        voice: this,
      },
    })
  }

  dial(params: VoiceDialMethodParams) {
    return new Promise<Call>((resolve, reject) => {
      const _tag = uuid()

      this._client.runWorker('voiceCallDialWorker', {
        worker: voiceCallDialWorker,
        initialState: {
          voice: this,
          tag: _tag,
          listeners: params.listen,
        },
      })

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
          tag: _tag,
          devices: toInternalDevices(devices),
        }
      } else if ('region' in params) {
        const { region, nodeId, devices: deviceBuilder } = params
        executeParams = {
          tag: _tag,
          region,
          node_id: nodeId,
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
    nodeId,
    listen,
    ...params
  }: VoiceDialPhonelMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Phone(params))
    return this.dial({
      maxPricePerMinute,
      region,
      nodeId,
      devices,
      listen,
    })
  }

  dialSip({
    region,
    maxPricePerMinute,
    nodeId,
    listen,
    ...params
  }: VoiceDialSipMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Sip(params))
    return this.dial({
      maxPricePerMinute,
      region,
      nodeId,
      devices,
      listen,
    })
  }
}

export { Call } from './Call'
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
export type {
  CallPlayMethodParams,
  CallPlayAudioMethodarams,
  CallPlaySilenceMethodParams,
  CallPlayRingtoneMethodParams,
  CallPlayTTSMethodParams,
  CallRecordMethodParams,
  CallRecordAudioMethodParams,
  CallPromptMethodParams,
  CallPromptAudioMethodParams,
  CallPromptRingtoneMethodParams,
  CallPromptTTSMethodParams,
  CallCollectMethodParams,
  CallTapMethodParams,
  CallTapAudioMethodParams,
  CallDetectMethodParams,
  CallDetectMachineParams,
  CallDetectFaxParams,
  CallDetectDigitParams,
} from '../types/voice'
