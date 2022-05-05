import type {
  VoiceCallContract,
  SipHeader,
  EmitterContract,
  VoicePlaylist,
  VoiceCallPlaybackContract,
  VoiceDeviceBuilder,
  VoiceCallRecordMethodParams,
  VoiceCallRecordingContract,
  VoiceCallPromptContract,
  RingtoneName,
  VoiceCallTapContract,
  VoiceCallTapMethodParams,
  TapDevice,
  VoiceCallDetectMethodParams,
  VoiceCallDetectContract,
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

  dial(
    params:
      | VoiceDeviceBuilder
      | {
          devices: VoiceDeviceBuilder
          region: string
        }
  ): Promise<Call>

  hangup(
    reason?: 'hangup' | 'cancel' | 'busy' | 'noAnswer' | 'decline' | 'error'
  ): Promise<void>
  answer(): Promise<Call>
  play(params: VoicePlaylist): Promise<VoiceCallPlaybackContract>
  playAudio(params: { volume?: number }): Promise<VoiceCallPlaybackContract>
  playSilence(params: { duration: number }): Promise<VoiceCallPlaybackContract>
  playRingtone(params: { volume?: number }): Promise<VoiceCallPlaybackContract>
  playTTS(params: { volume?: number }): Promise<VoiceCallPlaybackContract>
  record(
    params: VoiceCallRecordMethodParams
  ): Promise<VoiceCallRecordingContract>
  recordAudio(
    params?: VoiceCallRecordMethodParams['audio']
  ): Promise<VoiceCallRecordingContract>
  prompt(params: {
    playlist: VoicePlaylist
    initialTimeout?: number
    partialResults?: boolean
  }): Promise<VoiceCallPromptContract>
  promptAudio(params: {
    url: string
    volume?: number
    initialTimeout?: number
    partialResults?: boolean
  }): Promise<VoiceCallPromptContract>
  promptRingtone(params: {
    name: RingtoneName
    duration?: number
    volume?: number
    initialTimeout?: number
    partialResults?: boolean
  }): Promise<VoiceCallPromptContract>
  promptTTS(params: {
    text: string
    language?: string
    gender?: 'male' | 'female'
    volume?: number
    initialTimeout?: number
    partialResults?: boolean
  }): Promise<VoiceCallPromptContract>
  // TODO: add derived prompt methods
  sendDigits(digits: string): Promise<Call>
  tap(params: VoiceCallTapMethodParams): Promise<VoiceCallTapContract>
  tapAudio(params: {
    device: TapDevice
    direction: 'listen' | 'speak' | 'both'
  }): Promise<VoiceCallTapContract>
  connect(
    params:
      | VoiceDeviceBuilder
      | {
          devices: VoiceDeviceBuilder
          ringback?: VoicePlaylist
        }
  ): Promise<VoiceCallContract>
  waitUntilConnected(): Promise<this>
  waitFor(
    params: ('ending' | 'ended') | ('ending' | 'ended')[]
  ): Promise<boolean>
  disconnect(): Promise<void>
  detect(params: VoiceCallDetectMethodParams): Promise<VoiceCallDetectContract>
  amd(params?: {
    timeout?: number
    waitForBeep?: boolean
    initialTimeout?: number
    endSilenceTimeout?: number
    machineVoiceThreshold?: number
    machineWordsThreshold?: number
  }): Promise<VoiceCallDetectContract>
  detectFax(params?: {
    timeout?: number
    waitForBeep?: boolean
    tone?: 'CED' | 'CNG'
  }): Promise<VoiceCallDetectContract>
  detectDigit(params?: {
    timeout?: number
    waitForBeep?: boolean
    digits?: string
  }): Promise<VoiceCallDetectContract>
}
