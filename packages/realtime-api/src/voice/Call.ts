import {
  CallingCallConnectEventParams,
  CallingCall,
  uuid,
  VoiceCallDisconnectReason,
  toSnakeCaseKeys,
  CallingCallWaitForState,
  CallingCallState,
  VoiceCallConnectMethodParams,
  toExternalJSON,
  VoiceCallConnectPhoneMethodParams,
  VoiceCallConnectSipMethodParams,
  CallingCallConnectFailedEventParams,
} from '@signalwire/core'
import { ListenSubscriber } from '../ListenSubscriber'
import {
  CallCollectMethodParams,
  CallDetectDigitParams,
  CallDetectFaxParams,
  CallDetectMachineParams,
  CallDetectMethodParams,
  CallPlayAudioMethodarams,
  CallPlayMethodParams,
  CallPlayRingtoneMethodParams,
  CallPlaySilenceMethodParams,
  CallPlayTTSMethodParams,
  CallPromptAudioMethodParams,
  CallPromptMethodParams,
  CallPromptRingtoneMethodParams,
  CallPromptTTSMethodParams,
  CallRecordAudioMethodParams,
  CallRecordMethodParams,
  CallTapAudioMethodParams,
  CallTapMethodParams,
  RealTimeCallEvents,
  RealTimeCallListeners,
  RealtimeCallListenersEventsMapping,
} from '../types'
import { toInternalDevices, toInternalPlayParams } from './utils'
import {
  voiceCallCollectWorker,
  voiceCallConnectWorker,
  voiceCallDetectWorker,
  voiceCallPlayWorker,
  voiceCallRecordWorker,
  voiceCallSendDigitsWorker,
  voiceCallTapWorker,
} from './workers'
import { Playlist } from './Playlist'
import { Voice } from './Voice'
import { CallPlayback, decoratePlaybackPromise } from './CallPlayback'
import { CallRecording, decorateRecordingPromise } from './CallRecording'
import { CallPrompt, decoratePromptPromise } from './CallPrompt'
import { CallCollect, decorateCollectPromise } from './CallCollect'
import { CallTap, decorateTapPromise } from './CallTap'
import { DeviceBuilder } from './DeviceBuilder'
import { CallDetect, decorateDetectPromise } from './CallDetect'

interface CallOptions {
  voice: Voice
  payload?: CallingCall
  connectPayload?: CallingCallConnectEventParams
  listeners?: RealTimeCallListeners
}

export class Call extends ListenSubscriber<
  RealTimeCallListeners,
  RealTimeCallEvents
> {
  private _voice: Voice
  private _context: string | undefined
  private _peer: Call | undefined
  private _payload: CallingCall | undefined
  private _connectPayload: CallingCallConnectEventParams | undefined
  protected _eventMap: RealtimeCallListenersEventsMapping = {
    onStateChanged: 'call.state',
    onPlaybackStarted: 'playback.started',
    onPlaybackUpdated: 'playback.updated',
    onPlaybackFailed: 'playback.failed',
    onPlaybackEnded: 'playback.ended',
    onRecordingStarted: 'recording.started',
    onRecordingUpdated: 'recording.updated',
    onRecordingFailed: 'recording.failed',
    onRecordingEnded: 'recording.ended',
    onPromptStarted: 'prompt.started',
    onPromptUpdated: 'prompt.updated',
    onPromptFailed: 'prompt.failed',
    onPromptEnded: 'prompt.ended',
    onCollectStarted: 'collect.started',
    onCollectInputStarted: 'collect.startOfInput',
    onCollectUpdated: 'collect.updated',
    onCollectFailed: 'collect.failed',
    onCollectEnded: 'collect.ended',
    onTapStarted: 'tap.started',
    onTapEnded: 'tap.ended',
    onDetectStarted: 'detect.started',
    onDetectUpdated: 'detect.updated',
    onDetectEnded: 'detect.ended',
  }

  constructor(options: CallOptions) {
    super({ swClient: options.voice._sw })

    this._voice = options.voice
    this._payload = options.payload
    this._context = options.payload?.context
    this._connectPayload = options.connectPayload

    if (options.listeners) {
      this.listen(options.listeners)
    }
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
    return this._payload?.tag
  }

  get nodeId() {
    return this._payload?.node_id
  }

  get device() {
    return this._payload?.device
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
    // @ts-expect-error
    return this.device?.params?.to ?? ''
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
    return this._context
  }

  get connectState() {
    return this._connectPayload?.connect_state
  }

  get peer() {
    return this._peer
  }

  /** @internal */
  set peer(callInstance: Call | undefined) {
    this._peer = callInstance
  }

  /** @internal */
  setPayload(payload: CallingCall) {
    this._payload = payload
  }

  /** @internal */
  setConnectPayload(payload: CallingCallConnectEventParams) {
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
    return new Promise<void>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(
          new Error(
            `Can't call hangup() on a call that hasn't been established.`
          )
        )
      }

      this.on('call.state', (params) => {
        if (params.callState === 'ended') {
          resolve()
        }
      })

      this._client
        .execute({
          method: 'calling.end',
          params: {
            node_id: this.nodeId,
            call_id: this.callId,
            reason: reason,
          },
        })
        .catch((e) => {
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

      this._client
        .execute({
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
   * voice.client.listen({
   *  topics: ['home'],
   *  onCallReceived: async (call) => {
   *    try {
   *      await call.answer()
   *      console.log('Inbound call answered')
   *    } catch (error) {
   *      console.error('Error answering inbound call', error)
   *    }
   *  }
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

      this._client
        .execute({
          method: 'calling.answer',
          params: {
            node_id: this.nodeId,
            call_id: this.callId,
          },
        })
        .catch((e) => {
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
  play(params: CallPlayMethodParams) {
    const promise = new Promise<CallPlayback>((resolve, reject) => {
      const { playlist, listen } = params

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

      this._client.runWorker('voiceCallPlayWorker', {
        worker: voiceCallPlayWorker,
        initialState: {
          controlId,
          listeners: listen,
        },
      })

      this._client
        .execute({
          method: 'calling.play',
          params: {
            node_id: this.nodeId,
            call_id: this.callId,
            control_id: controlId,
            volume: playlist.volume,
            play: toInternalPlayParams(playlist.media),
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

    return decoratePlaybackPromise.call(this, promise)
  }

  /**
   * Plays an audio file.
   *
   * @example
   *
   * ```js
   * const playback = await call.playAudio({ url: 'https://cdn.signalwire.com/default-music/welcome.mp3' });
   * ```
   */
  playAudio(params: CallPlayAudioMethodarams) {
    const { volume, listen, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Audio(rest))
    return this.play({ playlist, listen })
  }

  /**
   * Plays some silence.
   *
   * @example
   *
   * ```js
   * const playback = await call.playSilence({ duration: 3 });
   * ```
   */
  playSilence(params: CallPlaySilenceMethodParams) {
    const { listen, ...rest } = params
    const playlist = new Playlist().add(Playlist.Silence(rest))
    return this.play({ playlist, listen })
  }

  /**
   * Plays a ringtone.
   *
   * @example
   *
   * ```js
   * const playback = await call.playRingtone({ name: 'it' });
   * ```
   */
  playRingtone(params: CallPlayRingtoneMethodParams) {
    const { volume, listen, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Ringtone(rest))
    return this.play({ playlist, listen })
  }

  /**
   * Plays text-to-speech.
   *
   * @example
   *
   * ```js
   * const playback = await call.playTTS({ text: 'Welcome to SignalWire!' });
   * ```
   */
  playTTS(params: CallPlayTTSMethodParams) {
    const { volume, listen, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.TTS(rest))
    return this.play({ playlist, listen })
  }

  /**
   * Generic method to record a call. Please see {@link recordAudio}.
   */
  record(params: CallRecordMethodParams) {
    const promise = new Promise<CallRecording>((resolve, reject) => {
      const { audio, listen } = params

      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call record() on a call not established yet.`))
      }

      const resolveHandler = (callRecording: CallRecording) => {
        resolve(callRecording)
      }

      const rejectHandler = (callRecording: CallRecording) => {
        this.off('recording.started', resolveHandler)
        reject(callRecording)
      }

      this.once('recording.started', resolveHandler)
      this.once('recording.failed', rejectHandler)

      const controlId = uuid()
      const record = toSnakeCaseKeys({ audio })

      this._client.runWorker('voiceCallRecordWorker', {
        worker: voiceCallRecordWorker,
        initialState: {
          controlId,
          listeners: listen,
        },
      })

      this._client
        .execute({
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

    return decorateRecordingPromise.call(this, promise)
  }

  /**
   * Records the audio from the call.
   *
   * @example
   *
   * ```js
   * const recording = await call.recordAudio({ direction: 'both' })
   * ```
   */
  recordAudio(params: CallRecordAudioMethodParams = {}) {
    const { listen, ...rest } = params
    return this.record({
      audio: rest,
      listen,
    })
  }

  /**
   * Generic method to prompt the user for input. Please see {@link promptAudio}, {@link promptRingtone}, {@link promptTTS}.
   */
  prompt(params: CallPromptMethodParams) {
    const promise = new Promise<CallPrompt>((resolve, reject) => {
      const { listen, ...rest } = params

      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call record() on a call not established yet.`))
      }
      if (!params.playlist) {
        reject(new Error(`Missing 'playlist' params.`))
      }

      const controlId = `${uuid()}.prompt`

      const { volume, media } = params.playlist
      // TODO: move this to a method to build `collect`
      const { initial_timeout, digits, speech } = toSnakeCaseKeys(rest)
      const collect = {
        initial_timeout,
        digits,
        speech,
      }

      this._client.runWorker('voiceCallPlayWorker', {
        worker: voiceCallPlayWorker,
        initialState: {
          controlId,
        },
      })

      this._client.runWorker('voiceCallCollectWorker', {
        worker: voiceCallCollectWorker,
        initialState: {
          controlId,
        },
      })

      this._client
        .execute({
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
          const promptInstance = new CallPrompt({
            call: this,
            listeners: listen,
            // @ts-expect-error
            payload: {
              control_id: controlId,
              call_id: this.id!,
              node_id: this.nodeId!,
            },
          })
          this._client.instanceMap.set<CallPrompt>(controlId, promptInstance)
          this.emit('prompt.started', promptInstance)
          promptInstance.emit('prompt.started', promptInstance)
          resolve(promptInstance)
        })
        .catch((e) => {
          this.emit('prompt.failed', e)
          reject(e)
        })
    })

    return decoratePromptPromise.call(this, promise)
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
  promptAudio(params: CallPromptAudioMethodParams) {
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
  promptRingtone(params: CallPromptRingtoneMethodParams) {
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
  promptTTS(params: CallPromptTTSMethodParams) {
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
    return new Promise<Call>((resolve, reject) => {
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

      this._client.runWorker('voiceCallSendDigitsWorker', {
        worker: voiceCallSendDigitsWorker,
        initialState: {
          controlId,
        },
      })

      this._client
        .execute({
          method: 'calling.send_digits',
          params: {
            node_id: this.nodeId,
            call_id: this.callId,
            control_id: controlId,
            digits,
          },
        })
        .catch((e) => {
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
   * ```
   */
  tap(params: CallTapMethodParams) {
    const promise = new Promise<CallTap>((resolve, reject) => {
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
        listen,
      } = params

      this._client.runWorker('voiceCallTapWorker', {
        worker: voiceCallTapWorker,
        initialState: {
          controlId,
          listeners: listen,
        },
      })

      this._client
        .execute({
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

    return decorateTapPromise.call(this, promise)
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
  tapAudio(params: CallTapAudioMethodParams) {
    const { direction, ...rest } = params
    return this.tap({ audio: { direction }, ...rest })
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

      const _tag = uuid()

      // We can ignore the "ringback" error since we just want to cleanup "...rest"
      // @ts-expect-error
      const { devices, ringback, ...rest } = params
      const executeParams: Record<string, any> = {
        tag: _tag,
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

      const rejectHandler = (payload: CallingCallConnectFailedEventParams) => {
        // @ts-expect-error
        this.off('connect.connected', resolveHandler)
        reject(toExternalJSON(payload))
      }

      // @ts-expect-error
      this.once('connect.connected', resolveHandler)
      // @ts-expect-error
      this.once('connect.failed', rejectHandler)

      this._client.runWorker('voiceCallConnectWorker', {
        worker: voiceCallConnectWorker,
        initialState: {
          voice: this._voice,
          tag: _tag,
        },
      })

      this._client
        .execute({
          method: 'calling.connect',
          params: {
            node_id: this.nodeId,
            call_id: this.callId,
            tag: _tag,
            ...executeParams,
          },
        })
        .catch((e) => {
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

      this._client
        .execute({
          method: 'calling.disconnect',
          params: {
            node_id: this.nodeId,
            call_id: this.callId,
          },
        })
        .catch((e) => {
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
  detect(params: CallDetectMethodParams) {
    const promise = new Promise<CallDetect>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call detect() on a call not established yet.`))
      }

      const controlId = uuid()

      // TODO: build params in a method
      const { listen, timeout, type, waitForBeep = false, ...rest } = params

      this._client.runWorker('voiceCallDetectWorker', {
        worker: voiceCallDetectWorker,
        initialState: {
          controlId,
          listeners: listen,
        },
      })

      this._client
        .execute({
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
          const detectInstance = new CallDetect({
            call: this,
            payload: {
              control_id: controlId,
              call_id: this.id!,
              node_id: this.nodeId!,
              waitForBeep: params.waitForBeep ?? false,
            },
            listeners: listen,
          })
          this._client.instanceMap.set<CallDetect>(controlId, detectInstance)
          this.emit('detect.started', detectInstance)
          detectInstance.emit('detect.started', detectInstance)
          resolve(detectInstance)
        })
        .catch((e) => {
          this.emit('detect.ended', e)
          reject(e)
        })
    })

    return decorateDetectPromise.call(this, promise)
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
  amd(params: CallDetectMachineParams = {}) {
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
  detectFax(params: CallDetectFaxParams = {}) {
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
  detectDigit(params: CallDetectDigitParams = {}) {
    return this.detect({
      ...params,
      type: 'digit',
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
  collect(params: CallCollectMethodParams) {
    const promise = new Promise<CallCollect>((resolve, reject) => {
      const { listen, ...rest } = params

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
      } = toSnakeCaseKeys(rest)

      this._client.runWorker('voiceCallCollectWorker', {
        worker: voiceCallCollectWorker,
        initialState: {
          controlId,
        },
      })

      this._client
        .execute({
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
          const collectInstance = new CallCollect({
            call: this,
            listeners: listen,
            // @ts-expect-error
            payload: {
              control_id: controlId,
              call_id: this.id!,
              node_id: this.nodeId!,
            },
          })
          this._client.instanceMap.set<CallCollect>(controlId, collectInstance)
          this.emit('collect.started', collectInstance)
          collectInstance.emit('collect.started', collectInstance)
          resolve(collectInstance)
        })
        .catch((e) => {
          this.emit('collect.failed', e)
          reject(e)
        })
    })

    return decorateCollectPromise.call(this, promise)
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
          emittedCallStates.add(params.state!)
        } else if (shouldResolveUnsuccessful(params.state!)) {
          return resolve(false)
        }

        if (shouldResolve()) {
          resolve(true)
        }
      })
    })
  }
}
