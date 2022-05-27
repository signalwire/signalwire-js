import type { SipCodec, SipHeader, VoiceDeviceBuilder } from '@signalwire/core'
import type { Call } from './Call'
import type { Voice } from './Voice'

type InheritedMembers =
  | '_session'
  | 'on'
  | 'off'
  | 'once'
  | 'removeAllListeners'
  | 'disconnect'

export interface VoiceClientDocs extends Pick<Voice, InheritedMembers> {
  new (opts: {
    /** SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
    project: string
    /** SignalWire project token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
    token: string
    /** SignalWire contexts, e.g. 'home', 'office' */
    contexts: string[]
  }): this

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
  dialPhone(params: {
    /**
     * The party the call is coming from. Must be a SignalWire number or SIP
     * endpoint that you own.
     */
    from?: string | undefined
    /** The party you are attempting to call. */
    to: string
    /**
     * The time, in seconds, the call will ring before it is considered
     * unanswered.
     */
    timeout?: number | undefined
  }): Promise<Call>

  /**
   * Makes an outbound call to a SIP endpoint.
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
  dialSip(params: {
    /**
     * The party the call is coming from. Must be a SignalWire number or SIP
     * endpoint that you own.
     */
    from: string
    /** The party you are attempting to call. */
    to: string
    /**
     * The time, in seconds, the call will ring before it is considered
     * unanswered.
     */
    timeout?: number | undefined
    /**
     * Array of `SipHeader` objects like: `{ name: string, value: string }`.
     * Must be X- headers only, see example below.
     */
    headers?: SipHeader[] | undefined
    /**
     * Optional array of desired codecs in order of preference. Supported values
     * are PCMU, PCMA, OPUS, G729, G722, VP8, H264. Default is parent leg
     * codec(s).
     */
    codecs?: SipCodec[] | undefined
    /** If true, WebRTC media is negotiated. Default is parent leg setting. */
    webrtcMedia?: boolean | undefined
  }): Promise<Call>

  addContexts(contexts: string[]): Promise<{ message: string; code: number }>
  removeContexts(contexts: string[]): Promise<{ message: string; code: number }>
}
