import {
  uuid,
  BaseComponentOptionsWithPayload,
  connect,
  EmitterContract,
  extendComponent,
  VoiceCallMethods,
  VoiceCallContract,
  VoiceCallDisconnectReason,
  VoicePlaylist,
  VoiceCallPlayAudioMethodParams,
  VoiceCallPlaySilenceMethodParams,
  VoiceCallPlayRingtoneMethodParams,
  VoiceCallPlayTTSMethodParams,
  VoiceCallRecordMethodParams,
  VoiceCallPromptMethodParams,
  VoiceCallPromptAudioMethodParams,
  VoiceCallPromptRingtoneMethodParams,
  VoiceCallPromptTTSMethodParams,
  VoiceCallCollectMethodParams,
  toExternalJSON,
  toSnakeCaseKeys,
  VoiceCallTapMethodParams,
  VoiceCallTapAudioMethodParams,
  CallingCallState,
  VoiceCallConnectMethodParams,
  VoiceCallConnectPhoneMethodParams,
  VoiceCallConnectSipMethodParams,
  CallingCallConnectEventParams,
  VoiceCallDetectMethodParams,
  VoiceCallDetectMachineParams,
  VoiceCallDetectFaxParams,
  VoiceCallDetectDigitParams,
  CallingCallWaitForState,
  CallingCall,
  configureStore,
  BaseConsumer,
} from '@signalwire/core'
import { RealTimeCallApiEvents } from '../types'
import { toInternalDevices, toInternalPlayParams } from './utils'
import { Playlist } from './Playlist'
import { CallPlayback } from './CallPlayback'
import { CallRecording } from './CallRecording'
import { CallPrompt, createCallPromptObject } from './CallPrompt'
import { CallTap } from './CallTap'
import { CallDetect, createCallDetectObject } from './CallDetect'
import { CallCollect, createCallCollectObject } from './CallCollect'
import { DeviceBuilder } from './DeviceBuilder'

export type EmitterTransformsEvents =
  | 'calling.playback.start'
  | 'calling.playback.started'
  | 'calling.playback.updated'
  | 'calling.playback.ended'
  | 'calling.playback.failed'
  | 'calling.recording.started'
  | 'calling.recording.updated'
  | 'calling.recording.ended'
  | 'calling.recording.failed'
  | 'calling.prompt.started'
  | 'calling.prompt.updated'
  | 'calling.prompt.ended'
  | 'calling.prompt.failed'
  | 'calling.tap.started'
  | 'calling.tap.ended'
  | 'calling.detect.started'
  | 'calling.detect.ended'
  | 'calling.collect.started'
  | 'calling.collect.updated'
  | 'calling.collect.ended'
  | 'calling.collect.failed'
  | 'calling.call.state'
  // events not exposed
  | 'calling.detect.updated'
  | 'calling.connect.connected'

export interface CallOptions
  extends BaseComponentOptionsWithPayload<CallingCall> {
  connectPayload?: CallingCallConnectEventParams
}

/**
 * A Call object represents an active call. You can get instances of a Call
 * object from a {@link Voice.Client}, by answering or initiating calls.
 */
export interface Call
  extends VoiceCallContract<Call>,
    EmitterContract<RealTimeCallApiEvents> {
  store: ReturnType<typeof configureStore>
  setPayload: (payload: CallingCall) => void
  setConnectPayload: (payload: CallingCallConnectEventParams) => void
}

export class CallConsumer extends BaseConsumer<RealTimeCallApiEvents> {
  private _peer: Call | undefined
  private _payload: CallingCall
  private _connectPayload: CallingCallConnectEventParams

  constructor(options: CallOptions) {
    super(options)

    this._payload = options.payload

    this.on('call.state', () => {
      /**
       * FIXME: this no-op listener is required for our EE transforms to
       * update the call object via the `calling.call.state` transform
       * and apply the "peer" property to the Proxy.
       */
    })

    /**
     * It will take care of keeping instances of this class
     * up-to-date with the latest changes sent from the
     * server. Changes will be available to the consumer via
     * our Proxy API.
     */
  }

  /** Unique id for this voice call */
  get id() {
    return this._payload?.call_id
  }

  get callId() {
    return this._payload?.call_id
  }

  get state() {
    return this._payload?.call_state
  }

  get callState() {
    return this._payload?.call_state
  }

  get tag() {
    return this.__uuid
  }

  get nodeId() {
    return this._payload.node_id
  }

  get device() {
    return this._payload.device
  }

  /** The type of call. Only phone and sip are currently supported. */
  get type() {
    return this.device?.type ?? ''
  }

  /** The phone number that the call is coming from. */
  get from() {
    if (this.type === 'phone') {
      return (
        // @ts-expect-error
        (this.device?.params?.from_number || this.device?.params?.fromNumber) ??
        ''
      )
    }
    return (
      // @ts-expect-error
      this.device?.params?.from ?? ''
    )
  }

  /** The phone number you are attempting to call. */
  get to() {
    if (this.type === 'phone') {
      return (
        // @ts-expect-error
        (this.device?.params?.to_number || this.device?.params?.toNumber) ?? ''
      )
    }
    return (
      // @ts-expect-error
      this.device?.params?.to ?? ''
    )
  }

  get headers() {
    // @ts-expect-error
    return this.device?.params?.headers ?? []
  }

  get active() {
    return this.state === 'answered'
  }

  get connected() {
    return this.connectState === 'connected'
  }

  get direction() {
    return this._payload?.direction
  }

  get context() {
    return this._payload.context
  }

  get connectState() {
    return this._connectPayload?.connect_state
  }

  get peer() {
    return this._peer
  }

  set peer(callInstance: Call | undefined) {
    this._peer = callInstance
  }

  /** @internal */
  protected setPayload(payload: CallingCall) {
    this._payload = payload
  }

  /** @internal */
  protected setConnectPayload(payload: CallingCallConnectEventParams) {
    this._connectPayload = payload
  }

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
  hangup(reason: VoiceCallDisconnectReason = 'hangup') {
    return new Promise((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(
          new Error(
            `Can't call hangup() on a call that hasn't been established.`
          )
        )
      }

      this.on('call.state', (params) => {
        if (params.state === 'ended') {
          resolve(new Error('Failed to hangup the call.'))
        }
      })

      this.execute({
        method: 'calling.end',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          reason: reason,
        },
      }).catch((e) => {
        reject(e)
      })
    })
  }

  /**
   * Pass the incoming call to another consumer.
   *
   * @example
   *
   * ```js
   * call.pass();
   * ```
   */
  pass() {
    return new Promise<void>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call pass() on a call without callId.`))
      }

      this.execute({
        method: 'calling.pass',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
        },
      })
        .then(() => {
          resolve()
        })
        .catch((e) => {
          reject(e)
        })
    })
  }

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
  answer() {
    return new Promise<this>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call answer() on a call without callId.`))
      }

      this.on('call.state', (params) => {
        if (params.state === 'answered') {
          resolve(this)
        } else if (params.state === 'ended') {
          reject(new Error('Failed to answer the call.'))
        }
      })

      this.execute({
        method: 'calling.answer',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
        },
      }).catch((e) => {
        reject(e)
      })
    })
  }

  /**
   * Play one or multiple media in a Call and waits until the playing has ended.
   *
   * The play method is a generic method for all types of media, see
   * {@link playAudio}, {@link playSilence}, {@link playTTS} or
   * {@link playRingtone} for more specific usages.
   *
   * @param params a media playlist. See {@link Voice.Playlist}.
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
  play(params: VoicePlaylist) {
    return new Promise<CallPlayback>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call play() on a call not established yet.`))
      }

      const resolveHandler = (callPlayback: CallPlayback) => {
        this.off('playback.failed', rejectHandler)
        resolve(callPlayback)
      }

      const rejectHandler = (callPlayback: CallPlayback) => {
        this.off('playback.started', resolveHandler)
        reject(callPlayback)
      }

      this.once('playback.started', resolveHandler)
      this.once('playback.failed', rejectHandler)

      const controlId = uuid()

      this.execute({
        method: 'calling.play',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: controlId,
          volume: params.volume,
          play: toInternalPlayParams(params.media),
        },
      })
        .then(() => {
          // TODO: handle then?
        })
        .catch((e) => {
          this.off('playback.started', resolveHandler)
          this.off('playback.failed', rejectHandler)
          reject(e)
        })
    })
  }

  /**
   * Plays an audio file.
   *
   * @example
   *
   * ```js
   * const playback = await call.playAudio({ url: 'https://cdn.signalwire.com/default-music/welcome.mp3' });
   * await playback.ended();
   * ```
   */
  playAudio(params: VoiceCallPlayAudioMethodParams) {
    const { volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Audio(rest))
    return this.play(playlist)
  }

  /**
   * Plays some silence.
   *
   * @example
   *
   * ```js
   * const playback = await call.playSilence({ duration: 3 });
   * await playback.ended();
   * ```
   */
  playSilence(params: VoiceCallPlaySilenceMethodParams) {
    const playlist = new Playlist().add(Playlist.Silence(params))
    return this.play(playlist)
  }

  /**
   * Plays a ringtone.
   *
   * @example
   *
   * ```js
   * const playback = await call.playRingtone({ name: 'it' });
   * await playback.ended();
   * ```
   */
  playRingtone(params: VoiceCallPlayRingtoneMethodParams) {
    const { volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Ringtone(rest))
    return this.play(playlist)
  }

  /**
   * Plays text-to-speech.
   *
   * @example
   *
   * ```js
   * const playback = await call.playTTS({ text: 'Welcome to SignalWire!' });
   * await playback.ended();
   * ```
   */
  playTTS(params: VoiceCallPlayTTSMethodParams) {
    const { volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.TTS(rest))
    return this.play(playlist)
  }

  /**
   * Generic method to record a call. Please see {@link recordAudio}.
   */
  record(params: VoiceCallRecordMethodParams) {
    return new Promise<CallRecording>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call record() on a call not established yet.`))
      }

      const resolveHandler = (callRecording: CallRecording) => {
        this.off('recording.failed', rejectHandler)
        resolve(callRecording)
      }

      const rejectHandler = (callRecording: CallRecording) => {
        this.off('recording.started', resolveHandler)
        reject(callRecording)
      }

      this.once('recording.started', resolveHandler)
      this.once('recording.failed', rejectHandler)

      const controlId = uuid()
      const record = toSnakeCaseKeys(params)

      this.execute({
        method: 'calling.record',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: controlId,
          record,
        },
      })
        .then(() => {
          // TODO: handle then?
        })
        .catch((e) => {
          this.off('recording.started', resolveHandler)
          this.off('recording.failed', rejectHandler)
          reject(e)
        })
    })
  }

  /**
   * Records the audio from the call.
   *
   * @example
   *
   * ```js
   * const recording = await call.recordAudio({ direction: 'both' })
   * await recording.stop()
   * ```
   */
  recordAudio(params: VoiceCallRecordMethodParams['audio'] = {}) {
    return this.record({
      audio: params,
    })
  }

  /**
   * Generic method to prompt the user for input. Please see {@link promptAudio}, {@link promptRingtone}, {@link promptTTS}.
   */
  prompt(params: VoiceCallPromptMethodParams) {
    return new Promise<CallPrompt>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call record() on a call not established yet.`))
      }
      if (!params.playlist) {
        reject(new Error(`Missing 'playlist' params.`))
      }

      const controlId = `${uuid()}.prompt`

      const { volume, media } = params.playlist
      // TODO: move this to a method to build `collect`
      const { initial_timeout, digits, speech } = toSnakeCaseKeys(params)
      const collect = {
        initial_timeout,
        digits,
        speech,
      }

      this.execute({
        method: 'calling.play_and_collect',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: controlId,
          volume,
          play: toInternalPlayParams(media),
          collect,
        },
      })
        .then(() => {
          const promptInstance = createCallPromptObject({
            store: this.store,
            // @ts-expect-error
            payload: {
              control_id: controlId,
              call_id: this.id,
              node_id: this.nodeId,
            },
          })
          this.instanceMap.set<CallPrompt>(controlId, promptInstance)
          this.emit('prompt.started', promptInstance)
          resolve(promptInstance)
        })
        .catch((e) => {
          this.emit('prompt.failed', e)
          reject(e)
        })
    })
  }

  /**
   * Play an audio while collecting user input from the call, such as `digits` or `speech`.
   *
   * @example
   *
   * Prompting for digits and waiting for a result:
   *
   * ```js
   * const prompt = await call.promptAudio({
   *   url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
   *   digits: {
   *     max: 5,
   *     digitTimeout: 2,
   *     terminators: '#*'
   *   }
   * })
   * const { type, digits, terminator } = await prompt.ended()
   * ```
   */
  promptAudio(params: VoiceCallPromptAudioMethodParams) {
    const { url, volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Audio({ url }))

    return this.prompt({
      playlist,
      ...rest,
    })
  }

  /**
   * Play a ringtone while collecting user input from the call, such as `digits` or `speech`.
   *
   * @example
   *
   * Prompting for digits and waiting for a result:
   *
   * ```js
   * const prompt = await call.promptRingtone({
   *   name: 'it',
   *   duration: 10,
   *   digits: {
   *     max: 5,
   *     digitTimeout: 2,
   *     terminators: '#*'
   *   }
   * })
   * const { type, digits, terminator } = await prompt.ended()
   * ```
   */
  promptRingtone(params: VoiceCallPromptRingtoneMethodParams) {
    const { name, duration, volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(
      Playlist.Ringtone({ name, duration })
    )

    return this.prompt({
      playlist,
      ...rest,
    })
  }

  /**
   * Say some text while collecting user input from the call, such as `digits` or `speech`.
   *
   * @example
   *
   * Prompting for digits and waiting for a result:
   *
   * ```js
   * const prompt = await call.promptTTS({
   *   text: 'Please enter your PIN',
   *   digits: {
   *     max: 5,
   *     digitTimeout: 2,
   *     terminators: '#*'
   *   }
   * })
   * const { type, digits, terminator } = await prompt.ended()
   * ```
   */
  promptTTS(params: VoiceCallPromptTTSMethodParams) {
    const { text, language, gender, volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(
      Playlist.TTS({ text, language, gender })
    )

    return this.prompt({
      playlist,
      ...rest,
    })
  }

  /**
   * Play DTMF digits to the other party on the call.
   *
   * @example
   *
   * ```js
   * await call.sendDigits('123')
   * ```
   */
  sendDigits(digits: string) {
    return new Promise((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(
          new Error(`Can't call sendDigits() on a call not established yet.`)
        )
      }

      const callStateHandler = (params: any) => {
        if (params.callState === 'ended' || params.callState === 'ending') {
          reject(
            new Error(
              "Call is ended or about to end, couldn't send digits in time."
            )
          )
        }
      }

      this.once('call.state', callStateHandler)

      const cleanup = () => {
        this.off('call.state', callStateHandler)
      }

      const resolveHandler = (call: Call) => {
        cleanup()
        // @ts-expect-error
        this.off('send_digits.failed', rejectHandler)
        resolve(call)
      }

      const rejectHandler = (error: Error) => {
        cleanup()
        // @ts-expect-error
        this.off('send_digits.finished', resolveHandler)
        reject(error)
      }

      // @ts-expect-error
      this.once('send_digits.finished', resolveHandler)
      // @ts-expect-error
      this.once('send_digits.failed', rejectHandler)

      const controlId = uuid()

      this.execute({
        method: 'calling.send_digits',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: controlId,
          digits,
        },
      }).catch((e) => {
        reject(e)
      })
    })
  }

  /**
   * Intercept call media and stream it to the specified WebSocket endpoint.
   * Prefer using {@link tapAudio} if you only need to tap audio.
   *
   * @example
   *
   * ```js
   * const tap = await call.tapAudio({
   *   audio: {
   *     direction: 'both',
   *   },
   *   device: {
   *     type: 'ws',
   *     uri: 'wss://example.domain.com/endpoint',
   *   },
   * })
   *
   * await tap.stop()
   * ```
   */
  tap(params: VoiceCallTapMethodParams) {
    return new Promise<CallTap>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call tap() on a call not established yet.`))
      }

      const resolveHandler = (callTap: CallTap) => {
        this.off('tap.ended', rejectHandler)
        resolve(callTap)
      }

      const rejectHandler = (callTap: CallTap) => {
        this.off('tap.started', resolveHandler)
        reject(callTap)
      }

      this.once('tap.started', resolveHandler)
      this.once('tap.ended', rejectHandler)

      const controlId = uuid()

      // TODO: Move to a method to build the objects and transform camelCase to snake_case
      const {
        audio = {},
        device: { type, ...rest },
      } = params

      this.execute({
        method: 'calling.tap',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: controlId,
          tap: {
            type: 'audio',
            params: audio,
          },
          device: {
            type,
            params: rest,
          },
        },
      })
        .then(() => {
          // TODO: handle then?
        })
        .catch((e) => {
          this.off('tap.started', resolveHandler)
          this.off('tap.ended', rejectHandler)
          reject(e)
        })
    })
  }

  /**
   * Intercept call audio and stream it to the specified WebSocket endpoint.
   *
   * @example
   *
   * ```js
   * const tap = await call.tapAudio({
   *   direction: 'both',
   *   device: {
   *     type: 'ws',
   *     uri: 'wss://example.domain.com/endpoint',
   *   },
   * })
   *
   * await tap.stop()
   * ```
   */
  tapAudio(params: VoiceCallTapAudioMethodParams) {
    const { direction, device } = params
    return this.tap({ audio: { direction }, device })
  }

  /**
   * Attempt to connect an existing call to a new outbound call. You can wait
   * until the call is disconnected by calling {@link waitForDisconnected}.
   *
   * This is a generic method that allows you to connect to multiple devices in
   * series, parallel, or combinations of both with the use of a
   * {@link Voice.DeviceBuilder}. For simpler use cases, prefer using
   * {@link connectPhone} or {@link connectSip}.
   *
   * @example
   *
   * Connecting to a new SIP call.
   *
   * ```js
   * const plan = new Voice.DeviceBuilder().add(
   *   Voice.DeviceBuilder.Sip({
   *     from: 'sip:user1@domain.com',
   *     to: 'sip:user2@domain.com',
   *     timeout: 30,
   *   })
   * )
   *
   * const peer = await call.connect(plan)
   * ```
   */
  connect(params: VoiceCallConnectMethodParams) {
    return new Promise<any>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call connect() on a call not established yet.`))
      }

      // We can ignore the "ringback" error since we just want to cleanup "...rest"
      // @ts-expect-error
      const { devices, ringback, ...rest } = params
      const executeParams: Record<string, any> = {
        tag: this.__uuid,
        ...toSnakeCaseKeys(rest),
      }
      if ('ringback' in params) {
        executeParams.ringback = toInternalPlayParams(
          params.ringback?.media ?? []
        )
      }

      if (params instanceof DeviceBuilder) {
        executeParams.devices = toInternalDevices(params.devices)
      } else if (devices instanceof DeviceBuilder) {
        executeParams.devices = toInternalDevices(devices.devices)
      } else {
        throw new Error('[connect] Invalid "devices" parameter.')
      }

      const resolveHandler = (payload: Call) => {
        // @ts-expect-error
        this.off('connect.failed', rejectHandler)
        resolve(payload)
      }

      const rejectHandler = (payload: Call) => {
        // @ts-expect-error
        this.off('connect.connected', resolveHandler)
        reject(toExternalJSON(payload))
      }

      // @ts-expect-error
      this.once('connect.connected', resolveHandler)
      // @ts-expect-error
      this.once('connect.failed', rejectHandler)

      this.execute({
        method: 'calling.connect',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          tag: this.__uuid,
          ...executeParams,
        },
      }).catch((e) => {
        // @ts-expect-error
        this.off('connect.connected', resolveHandler)
        // @ts-expect-error
        this.off('connect.failed', rejectHandler)

        reject(e)
      })
    })
  }

  /**
   * Attempt to connect an existing call to a new outbound phone call. You can
   * wait until the call is disconnected by calling {@link waitForDisconnected}.
   *
   * @example
   *
   * ```js
   * const peer = await call.connectPhone({
   *   from: '+xxxxxx',
   *   to: '+yyyyyy',
   *   timeout: 30
   * })
   * ```
   */
  connectPhone({
    ringback,
    maxPricePerMinute,
    ...params
  }: VoiceCallConnectPhoneMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Phone(params))
    return this.connect({ devices, maxPricePerMinute, ringback })
  }

  /**
   * Attempt to connect an existing call to a new outbound SIP call. You can
   * wait until the call is disconnected by calling {@link waitForDisconnected}.
   *
   * @example
   *
   * ```js
   * const peer = await call.connectPhone({
   *   from: 'sip:user1@domain.com',
   *   to: 'sip:user2@domain.com',
   *   timeout: 30
   * })
   * ```
   */
  connectSip({
    ringback,
    maxPricePerMinute,
    ...params
  }: VoiceCallConnectSipMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Sip(params))
    return this.connect({ devices, maxPricePerMinute, ringback })
  }

  disconnect() {
    return new Promise<void>((resolve, reject) => {
      if (!this.callId || !this.nodeId || !this.peer) {
        reject(
          new Error(`Can't call disconnect() on a call not connected yet.`)
        )
      }

      const resolveHandler = () => {
        resolve()
      }
      // @ts-expect-error
      this.once('connect.disconnected', resolveHandler)

      this.execute({
        method: 'calling.disconnect',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
        },
      }).catch((e) => {
        // @ts-expect-error
        this.off('connect.disconnected', resolveHandler)

        reject(e)
      })
    })
  }

  /**
   * @deprecated use {@link disconnected} instead.
   */
  waitForDisconnected() {
    return this.disconnect
  }

  disconnected() {
    return new Promise<this>((resolve) => {
      const resolveHandler = () => {
        resolve(this)
      }
      // @ts-expect-error
      this.once('connect.disconnected', resolveHandler)
      // @ts-expect-error
      this.once('connect.failed', resolveHandler)

      if (this.state === 'ended' || this.state === 'ending') {
        return resolveHandler()
      }
    })
  }

  /**
   * Generic method. Please see {@link amd}, {@link detectFax}, {@link detectDigit}.
   */
  detect(params: VoiceCallDetectMethodParams) {
    return new Promise<CallDetect>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call detect() on a call not established yet.`))
      }

      const controlId = uuid()

      // TODO: build params in a method
      const { timeout, type, waitForBeep = false, ...rest } = params

      this.execute({
        method: 'calling.detect',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: controlId,
          timeout,
          detect: {
            type,
            params: toSnakeCaseKeys(rest),
          },
        },
      })
        .then(() => {
          const detectInstance = createCallDetectObject({
            store: this.store,
            payload: {
              control_id: controlId,
              call_id: this.id,
              node_id: this.nodeId,
              waitForBeep,
            },
          })
          this.instanceMap.set<CallDetect>(controlId, detectInstance)
          // @ts-expect-error
          this.emit('detect.started', detectInstance)
          resolve(detectInstance)
        })
        .catch((e) => {
          // @ts-expect-error
          this.emit('detect.ended', e)
          reject(e)
        })
    })
  }

  /**
   * Detects the presence of an answering machine.
   *
   * @example
   *
   * ```js
   * const detect = await call.amd()
   * const result = await detect.ended()
   *
   * console.log('Detect result:', result.type)
   * ```
   */
  amd(params: Omit<VoiceCallDetectMachineParams, 'type'> = {}) {
    return this.detect({
      ...params,
      type: 'machine',
    })
  }

  /**
   * Alias for amd()
   */
  detectAnsweringMachine = this.amd

  /**
   * Detects the presence of a fax machine.
   *
   * @example
   *
   * ```js
   * const detect = await call.detectFax()
   * const result = await detect.ended()
   *
   * console.log('Detect result:', result.type)
   * ```
   */
  detectFax(params: Omit<VoiceCallDetectFaxParams, 'type'> = {}) {
    return this.detect({
      ...params,
      type: 'fax',
    })
  }

  /**
   * Detects digits in the audio stream.
   *
   * @example
   *
   * ```js
   * const detect = await call.detectDigit()
   * const result = await detect.ended()
   *
   * console.log('Detect result:', result.type)
   * ```
   */
  detectDigit(params: Omit<VoiceCallDetectDigitParams, 'type'> = {}) {
    return this.detect({
      ...params,
      type: 'digit',
    })
  }

  /**
   * Returns a promise that is resolved only after the current call is in one of
   * the specified states.
   *
   * @returns true if the requested states have been reached, false if they
   * won't be reached because the call ended.
   *
   * @example
   *
   * ```js
   * await call.waitFor('ended')
   * ```
   */
  waitFor(params: CallingCallWaitForState | CallingCallWaitForState[]) {
    return new Promise((resolve) => {
      if (!params) {
        resolve(true)
      }

      const events = Array.isArray(params) ? params : [params]
      const emittedCallStates = new Set<CallingCallState>()
      const shouldResolve = () => emittedCallStates.size === events.length
      const shouldWaitForEnded = events.includes('ended')
      // If the user is not awaiting for the `ended` state
      // and we've got that from the server then we won't
      // get the event/s the user was awaiting for
      const shouldResolveUnsuccessful = (state: CallingCallState) => {
        return !shouldWaitForEnded && state === 'ended'
      }

      this.on('call.state', (params) => {
        if (events.includes(params.state as CallingCallWaitForState)) {
          emittedCallStates.add(params.state)
        } else if (shouldResolveUnsuccessful(params.state)) {
          return resolve(false)
        }

        if (shouldResolve()) {
          resolve(true)
        }
      })
    })
  }

  /**
   * Collect user input from the call, such as `digits` or `speech`.
   *
   * @example
   *
   * Collect digits and waiting for a result:
   *
   * ```js
   * const collectObj = await call.collect({
   *   digits: {
   *     max: 5,
   *     digitTimeout: 2,
   *     terminators: '#*'
   *   }
   * })
   * const { digits, terminator } = await collectObj.ended()
   * ```
   */
  collect(params: VoiceCallCollectMethodParams) {
    return new Promise<CallCollect>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call collect() on a call not established yet.`))
      }

      const controlId = uuid()

      // TODO: move this to a method to build the params
      const {
        initial_timeout,
        partial_results,
        digits,
        speech,
        continuous,
        send_start_of_input,
        start_input_timers,
      } = toSnakeCaseKeys(params)

      this.execute({
        method: 'calling.collect',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          control_id: controlId,
          initial_timeout,
          digits,
          speech,
          partial_results,
          continuous,
          send_start_of_input,
          start_input_timers,
        },
      })
        .then(() => {
          const collectInstance = createCallCollectObject({
            store: this.store,
            // @ts-expect-error
            payload: {
              control_id: controlId,
              call_id: this.id,
              node_id: this.nodeId,
            },
          })
          this.instanceMap.set<CallCollect>(controlId, collectInstance)
          this.emit('collect.started', collectInstance)
          resolve(collectInstance)
        })
        .catch((e) => {
          this.emit('collect.failed', e)
          reject(e)
        })
    })
  }
}

// FIXME: instead of Omit methods, i used "Partial<VoiceCallMethods>"
export const CallAPI = extendComponent<CallConsumer, Partial<VoiceCallMethods>>(
  CallConsumer,
  {}
)

export const createCallObject = (params: CallOptions): Call => {
  const call = connect<RealTimeCallApiEvents, CallConsumer, Call>({
    store: params.store,
    Component: CallAPI,
  })(params)

  return call
}
