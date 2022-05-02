import { SipCodec, SipHeader, VoiceDialer } from '@signalwire/core'
import { Call } from './Call'
import { Voice } from './Voice'

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
   *
   * With this method you can specify a configuration of devices to call in
   * series and/or in parallel: as soon as one device answers the call, the
   * returned promise is resolved. You specify a configuration through a
   * {@link VoiceDialer} object.
   *
   * @example Calls a phone number. If the number doesn't answer within 30
   * seconds, calls two different SIP endpoints in parallel.
   *
   * ```js
   * const dialer = new Voice.Dialer()
   *   .add(Voice.Dialer.Phone({ from: '+XXXXXX', to: '+YYYYYY', timeout: 30 }))
   *   .add([
   *     Voice.Dialer.Sip({ from: 'sip:aaa@bbb.cc', to: 'sip:xxx@yyy.zz' }),
   *     Voice.Dialer.Sip({ from: 'sip:aaa@bbb.cc', to: 'sip:ppp@qqq.rr' })
   *   ])
   *
   * try {
   *   const call = await client.dial(dialer)
   *   console.log("Call answered")
   * } catch (e) {
   *   console.log("Call not answered")
   * }
   * ```
   *
   * @param dialer The dialer specifying the devices to call.
   * 
   * @returns A call object.
   */
  dial(dialer: VoiceDialer): Promise<Call>

  dialPhone(params: {
    from?: string | undefined;
    to: string;
    timeout?: number | undefined;
  }): Promise<Call>

  dialSip(params: {
    from: string;
    to: string;
    timeout?: number | undefined;
    headers?: SipHeader[] | undefined;
    codecs?: SipCodec[] | undefined;
    webrtcMedia?: boolean | undefined;
  }): Promise<Call>
}
