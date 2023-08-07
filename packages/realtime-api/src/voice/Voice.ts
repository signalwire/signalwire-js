import {
  connect,
  BaseComponentOptions,
  toExternalJSON,
  ClientContextContract,
  uuid,
  BaseConsumer,
} from '@signalwire/core'
import type {
  DisconnectableClientContract,
  VoiceDeviceBuilder,
  VoiceCallDialPhoneMethodParams,
  VoiceCallDialSipMethodParams,
  ToExternalJSONResult,
  CallingCallDialFailedEventParams,
  VoiceDialerParams,
} from '@signalwire/core'
import { RealtimeClient } from '../client/index'
import { Call } from './Call'
import { voiceCallingWroker } from './workers'
import { DeviceBuilder } from './DeviceBuilder'
import type { RealTimeCallApiEvents } from '../types'
import { toInternalDevices } from './utils'

export * from './VoiceClient'
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

/**
 * List of events for {@link Voice.Call}.
 */
export interface VoiceClientApiEvents extends RealTimeCallApiEvents {}

export interface Voice
  extends DisconnectableClientContract<Voice, VoiceClientApiEvents>,
    ClientContextContract {
  /** @internal */
  _session: RealtimeClient

  /**
   * Disconnects this client. The client will stop receiving events and you will
   * need to create a new instance if you want to use it again.
   *
   * @example
   *
   * ```js
   * client.disconnect()
   * ```
   */
  disconnect(): void

  /**
   * Makes an outbound Call and waits until it has been answered or hung up.
   * This is an advanced method that lets you call multiple devices in parallel
   * or series: for simpler use cases, see {@link dialPhone} and
   * {@link dialSip}.
   *
   * With this method you can specify a configuration of devices to call in
   * series and/or in parallel: as soon as one device answers the call, the
   * returned promise is resolved. You specify a configuration through a
   * {@link VoiceDeviceBuilder} object.
   *
   * @param dialer - {@link VoiceDeviceBuilder}
   *
   * @example Calls a phone number. If the number doesn't answer within 30
   * seconds, calls two different SIP endpoints in parallel.
   *
   * ```js
   * const devices = new Voice.DeviceBuilder()
   *   .add(Voice.DeviceBuilder.Phone({ from: '+XXXXXX', to: '+YYYYYY', timeout: 30 }))
   *   .add([
   *     Voice.DeviceBuilder.Sip({ from: 'sip:aaa@bbb.cc', to: 'sip:xxx@yyy.zz' }),
   *     Voice.DeviceBuilder.Sip({ from: 'sip:aaa@bbb.cc', to: 'sip:ppp@qqq.rr' })
   *   ])
   *
   * try {
   *   const call = await client.dial(devices)
   *   console.log("Call answered")
   * } catch (e) {
   *   console.log("Call not answered")
   * }
   * ```
   *
   * @param dialer The Dialer specifying the devices to call.
   *
   * @returns A call object.
   */
  dial(dialer: VoiceDeviceBuilder): Promise<Call>
  /**
   * Makes an outbound call to a PSTN number.
   *
   * @param params - {@link VoiceCallDialPhoneMethodParams}
   *
   * @example
   *
   * ```js
   * try {
   *   const call = await client.dialPhone({
   *     from: '+YYYYYYYYYY',
   *     to: '+XXXXXXXXXX',
   *     timeout: 30,
   *   })
   * } catch (e) {
   *   console.log("Call not answered.")
   * }
   * ```
   *
   * @returns A call object.
   */
  dialPhone(params: VoiceCallDialPhoneMethodParams): Promise<Call>
  /**
   * Makes an outbound call to a SIP endpoint.
   *
   * @param params - {@link VoiceCallDialSipMethodParams}
   *
   * @example
   *
   * ```js
   * try {
   *   const call = await client.dialPhone({
   *     from: 'sip:xxx@yyy.zz',
   *     to: 'sip:ppp@qqq.rr',
   *     timeout: 30,
   *   })
   * } catch (e) {
   *   console.log("Call not answered.")
   * }
   * ```
   *
   * @returns A call object.
   */
  dialSip(params: VoiceCallDialSipMethodParams): Promise<Call>
}

/** @internal */
class VoiceAPI extends BaseConsumer<VoiceClientApiEvents> {
  private _tag: string

  constructor(options: BaseComponentOptions) {
    super(options)

    this._tag = uuid()

    this.runWorker('voiceCallingWorker', {
      worker: voiceCallingWroker,
      initialState: {
        tag: this._tag,
      },
    })
  }

  dial(params: VoiceDialerParams) {
    return new Promise((resolve, reject) => {
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

      this.execute({
        method: 'calling.dial',
        params: executeParams,
      }).catch((e) => {
        reject(e)
      })
    })
  }

  dialPhone({
    region,
    maxPricePerMinute,
    ...params
  }: VoiceCallDialPhoneMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Phone(params))
    // dial is available through the VoiceClient Proxy
    return this.dial({
      maxPricePerMinute,
      region,
      devices,
    })
  }

  dialSip({
    region,
    maxPricePerMinute,
    ...params
  }: VoiceCallDialSipMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Sip(params))
    // dial is available through the VoiceClient Proxy
    return this.dial({
      maxPricePerMinute,
      region,
      devices,
    })
  }
}

/** @internal */
export const createVoiceObject = (params: BaseComponentOptions): Voice => {
  const voice = connect<VoiceClientApiEvents, VoiceAPI, Voice>({
    store: params.store,
    Component: VoiceAPI,
  })(params)

  return voice
}
