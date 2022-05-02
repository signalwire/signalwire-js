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
