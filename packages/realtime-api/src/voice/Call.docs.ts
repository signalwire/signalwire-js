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

  /**
   * Hangs up the call.
   * @param reason Optional reason for hanging up
   * 
   * @example
   * 
   * ```js
   * call.hangup();
   * ```
   */
  hangup(
    reason?: 'hangup' | 'cancel' | 'busy' | 'noAnswer' | 'decline' | 'error'
  ): Promise<void>

  /**
   * Answers the incoming call.
   * 
   * @example
   * 
   * ```js
   * client.on('call.received', async (call) => {
   *   try {
   *     await call.answer()
   *     console.log('Inbound call answered')
   *   } catch (error) {
   *     console.error('Error answering inbound call', error)
   *   }
   * })
   * ```
   */
  answer(): Promise<Call>

  /**
   * Play one or multiple media in a Call and waits until the playing has ended.
   *
   * The play method is a generic method for all types of media, see
   * {@link playAudio}, {@link playSilence}, {@link playTTS} or
   * {@link playRingtone} for more specific usages.
   *
   * @param params a media playlist.  // FIXME 
   * 
   * @example
   * 
   * ```js
   * await call.play(new Voice.Playlist({ volume: 1.0 }).add(
   *   Voice.Playlist.TTS({
   *     text: 'Welcome to SignalWire! Please enter your 4 digits PIN',
   *   })
   * ))
   * ```
   */
  play(params: VoicePlaylist): Promise<VoiceCallPlaybackContract>

  /**
   * Plays an audio file.
   * 
   * @example
   * 
   * ```js
   * const playback = await call.playAudio({ url: 'https://cdn.signalwire.com/default-music/welcome.mp3' });
   * await playback.waitForEnded();
   * ```
   */
  playAudio(params: {
    /** HTTP(s) URL to an audio resource to play. */
    url: string,
    /** Volume value between -40dB and +40dB where 0 is unchanged. Default is 0. */
    volume?: number
  }): Promise<VoiceCallPlaybackContract>

  /**
   * Plays some silence.
   * 
   * @example
   * 
   * ```js
   * const playback = await call.playSilence({ duration: 3 });
   * await playback.waitForEnded();
   * ```
   */
  playSilence(params: {
    /** Seconds of silence to play. */
    duration: number
  }): Promise<VoiceCallPlaybackContract>

  /**
   * Plays a ringtone.
   * 
   * @example
   * 
   * ```js
   * const playback = await call.playRingtone({ name: 'it' });
   * await playback.waitForEnded();
   * ```
   */
  playRingtone(params: {
    /** The name of the ringtone. See {@link RingtoneName} for the supported values. */
    name: RingtoneName
    /** Duration of ringtone to play. Defaults to 1 ringtone iteration. */
    duration?: number
    /** Volume value between -40dB and +40dB where 0 is unchanged. Default is 0. */
    volume?: number
  }): Promise<VoiceCallPlaybackContract>

  /**
   * Plays text-to-speech.
   * 
   * @example
   * 
   * ```js
   * const playback = await call.playTTS({ text: 'Welcome to SignalWire!' });
   * await playback.waitForEnded();
   * ```
   */
  playTTS(params: {
    /** Text to play */
    text: string
    /** Language of the text. Defaults to `en-US`. */
    language?: string
    /** Gender of the voice (`male` or `female`). Defaults to `female`. */
    gender?: 'male' | 'female'
    /** Volume value between -40dB and +40dB where 0 is unchanged. Default is 0. */
    volume?: number
  }): Promise<VoiceCallPlaybackContract>

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
