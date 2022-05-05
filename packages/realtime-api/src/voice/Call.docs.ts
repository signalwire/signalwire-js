import type {
  VoiceCallContract,
  VoiceCallDialMethodParams,
  VoiceCallDisconnectReason,
  SipHeader,
  EmitterContract,
  VoiceDialer,
  VoicePlaylist,
  VoiceCallPlaybackContract,
} from '@signalwire/core'
import type { RealTimeCallApiEvents } from '../types'
import type { Call } from './Call'

type InheritedMembers = 'tag' | 'callId' | 'nodeId' | 'state' | 'context'

export interface CallDocs
  extends Pick<VoiceCallContract<Call>, InheritedMembers>,
    EmitterContract<RealTimeCallApiEvents> {
  /** Unique id for this voice call */
  readonly id: string

  /** The type of call. Only phone and sip are currently supported. */
  type: 'phone' | 'sip'
  device: any // FIXME:

  /** The phone number that the call is coming from. */
  from: string

  /** The phone number you are attempting to call. */
  to: string

  /** Whether you are making or receiving the call. */
  direction: 'inbound' | 'outbound'

  headers?: SipHeader[]

  dial(params: VoiceDialer): Promise<Call>
  hangup(
    reason?: 'hangup' | 'cancel' | 'busy' | 'noAnswer' | 'decline' | 'error'
  ): Promise<void>
  answer(): Promise<Call>
  play(params: VoicePlaylist): Promise<VoiceCallPlaybackContract>
  playAudio(params: {
      volume?: number
    }): Promise<VoiceCallPlaybackContract>
  playSilence(): Promise<VoiceCallPlaybackContract>
  playRingtone(
    params: {volume?: number}
  ): Promise<VoiceCallPlaybackContract>
  playTTS(
    params: {volume?: number}
  ): Promise<VoiceCallPlaybackContract>
  record(
    params: VoiceCallRecordMethodParams
  ): Promise<VoiceCallRecordingContract>
  recordAudio(
    params?: VoiceCallRecordMethodParams['audio']
  ): Promise<VoiceCallRecordingContract>
  prompt(params: VoiceCallPromptMethodParams): Promise<VoiceCallPromptContract>
  promptAudio(
    params: VoiceCallPromptAudioMethodParams
  ): Promise<VoiceCallPromptContract>
  promptRingtone(
    params: VoiceCallPromptRingtoneMethodParams
  ): Promise<VoiceCallPromptContract>
  promptTTS(
    params: VoiceCallPromptTTSMethodParams
  ): Promise<VoiceCallPromptContract>
  // TODO: add derived prompt methods
  sendDigits(digits: string): Promise<Call>
  tap(params: VoiceCallTapMethodParams): Promise<VoiceCallTapContract>
  tapAudio(params: VoiceCallTapAudioMethodParams): Promise<VoiceCallTapContract>
  connect(params: VoiceCallConnectMethodParams): Promise<VoiceCallContract>
  waitUntilConnected(): Promise<this>
  disconnect(): Promise<void>
  detect(params: VoiceCallDetectMethodParams): Promise<VoiceCallDetectContract>
  amd(
    params?: Omit<VoiceCallDetectMachineParams, 'type'>
  ): Promise<VoiceCallDetectContract>
  detectFax(
    params?: Omit<VoiceCallDetectFaxParams, 'type'>
  ): Promise<VoiceCallDetectContract>
  detectDigit(
    params?: Omit<VoiceCallDetectDigitParams, 'type'>
  ): Promise<VoiceCallDetectContract>
}
