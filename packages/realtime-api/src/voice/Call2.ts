import {
  CallingCallConnectEventParams,
  CallingCall,
  uuid,
  VoiceCallDisconnectReason,
  VoicePlaylist,
  VoiceCallPlayAudioMethodParams,
  VoiceCallPlaySilenceMethodParams,
  VoiceCallPlayRingtoneMethodParams,
  VoiceCallPlayTTSMethodParams,
  CallingCallWaitForState,
  CallingCallState,
} from '@signalwire/core'
import { ListenSubscriber } from '../ListenSubscriber'
import {
  CallPlaybackListeners,
  RealTimeCallEvents,
  RealTimeCallListeners,
  RealtimeCallListenersEventsMapping,
} from '../types'
import { toInternalPlayParams } from './utils'
import { voiceCallPlayWorker } from './workers'
import { Playlist } from './Playlist'
import { Voice } from './Voice2'
import { CallPlayback } from './CallPlayback'

export interface CallOptions {
  voice: Voice
  payload: CallingCall
  connectPayload?: CallingCallConnectEventParams
  listeners?: RealTimeCallListeners
}

export class Call extends ListenSubscriber<
  RealTimeCallListeners,
  RealTimeCallEvents
> {
  private __uuid: string
  private _peer: Call | undefined
  private _payload: CallingCall
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
  }

  constructor(options: CallOptions) {
    super({ swClient: options.voice._sw })

    this.__uuid = uuid()
    this._payload = options.payload
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
    return this._payload.context
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
    this._payload = { ...this._payload, ...payload }
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
  play(params: VoicePlaylist, listen?: CallPlaybackListeners) {
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
  playAudio(
    params: VoiceCallPlayAudioMethodParams & { listen?: CallPlaybackListeners }
  ) {
    const { volume, listen, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Audio(rest))
    return this.play(playlist, listen)
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
  playSilence(
    params: VoiceCallPlaySilenceMethodParams & {
      listen?: CallPlaybackListeners
    }
  ) {
    const { listen, ...rest } = params
    const playlist = new Playlist().add(Playlist.Silence(rest))
    return this.play(playlist, listen)
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
  playRingtone(
    params: VoiceCallPlayRingtoneMethodParams & {
      listen?: CallPlaybackListeners
    }
  ) {
    const { volume, listen, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Ringtone(rest))
    return this.play(playlist, listen)
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
  playTTS(
    params: VoiceCallPlayTTSMethodParams & { listen?: CallPlaybackListeners }
  ) {
    const { volume, listen, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.TTS(rest))
    return this.play(playlist, listen)
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
}
