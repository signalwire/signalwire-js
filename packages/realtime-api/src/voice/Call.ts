import {
  uuid,
  AssertSameType,
  BaseComponentOptions,
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
  CallingCallRecordEventParams,
  VoiceCallRecordMethodParams,
  CallingCallCollectEventParams,
  VoiceCallPromptMethodParams,
  VoiceCallPromptAudioMethodParams,
  VoiceCallPromptRingtoneMethodParams,
  VoiceCallPromptTTSMethodParams,
  EventTransform,
  toLocalEvent,
  toExternalJSON,
  toSnakeCaseKeys,
  CallingCallPlayEventParams,
  VoiceCallTapMethodParams,
  VoiceCallTapAudioMethodParams,
  CallingCallTapEventParams,
  CallingCallState,
  CallingCallStateEventParams,
  VoiceCallConnectMethodParams,
  VoiceCallConnectPhoneMethodParams,
  VoiceCallConnectSipMethodParams,
  CallingCallConnectEventParams,
  VoiceCallDetectMethodParams,
  VoiceCallDetectMachineParams,
  VoiceCallDetectFaxParams,
  VoiceCallDetectDigitParams,
  CallingCallDetectEventParams,
  VoiceDialerParams,
} from '@signalwire/core'
import { RealTimeCallApiEvents } from '../types'
import { AutoApplyTransformsConsumer } from '../AutoApplyTransformsConsumer'
import { toInternalDevices, toInternalPlayParams } from './utils'
import { Playlist } from './Playlist'
import {
  voiceCallStateWorker,
  voiceCallPlayWorker,
  voiceCallRecordWorker,
  voiceCallPromptWorker,
  voiceCallTapWorker,
  voiceCallConnectWorker,
  voiceCallDialWorker,
  voiceCallSendDigitsWorker,
  voiceCallDetectWorker,
  VoiceCallDialWorkerHooks,
  VoiceCallSendDigitsWorkerHooks,
} from './workers'
import { CallPlayback, createCallPlaybackObject } from './CallPlayback'
import { CallRecording, createCallRecordingObject } from './CallRecording'
import { CallPrompt, createCallPromptObject } from './CallPrompt'
import { CallTap, createCallTapObject } from './CallTap'
import { CallDetect, createCallDetectObject } from './CallDetect'
import { DeviceBuilder } from './DeviceBuilder'
import { CallDocs } from './Call.docs'

type EmitterTransformsEvents =
  | 'calling.playback.start'
  | 'calling.playback.started'
  | 'calling.playback.updated'
  | 'calling.playback.ended'
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
  // events not exposed
  | 'calling.call.state'
  | 'calling.detect.updated'
  | 'calling.connect.connected'

interface CallMain
  extends VoiceCallContract<Call>,
    EmitterContract<RealTimeCallApiEvents> {}

/**
 * A Call object represents an active call. You can get instances of a Call
 * object from a {@link Voice.Client}, by answering or initiating calls.
 */
export interface Call extends AssertSameType<CallMain, CallDocs> {}

export interface CallFullState extends Call {}

/**
 * Used to resolve the play() method and to update the CallPlayback object through the EmitterTransform
 */
export const callingPlaybackTriggerEvent =
  toLocalEvent<EmitterTransformsEvents>('calling.playback.trigger')

/**
 * Used to resolve the record() method and to update the CallRecording object through the EmitterTransform
 */
export const callingRecordTriggerEvent = toLocalEvent<EmitterTransformsEvents>(
  'calling.recording.trigger'
)

/**
 * Used to resolve the prompt() method and to update the CallPrompt object through the EmitterTransform
 */
export const callingPromptTriggerEvent = toLocalEvent<EmitterTransformsEvents>(
  'calling.prompt.trigger'
)

/**
 * Used to resolve the tap() method and to update the CallTap object through the EmitterTransform
 */
export const callingTapTriggerEvent = toLocalEvent<EmitterTransformsEvents>(
  'calling.tap.trigger'
)

/**
 * Used to resolve the detect() method and to update the CallDetect object through the EmitterTransform
 */
export const callingDetectTriggerEvent = toLocalEvent<EmitterTransformsEvents>(
  'calling.detect.trigger'
)

export class CallConsumer extends AutoApplyTransformsConsumer<RealTimeCallApiEvents> {
  protected _eventsPrefix = 'calling' as const

  public callId: string
  public nodeId: string
  public peer: string

  constructor(options: BaseComponentOptions<RealTimeCallApiEvents>) {
    super(options)
    this._attachListeners(this.__uuid)
    this.applyEmitterTransforms({ local: true })

    // @ts-expect-error
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
    this.runWorker('voiceCallStateWorker', {
      worker: voiceCallStateWorker,
    })
  }

  get id() {
    return this.callId
  }

  get tag() {
    return this.__uuid
  }

  get type() {
    // @ts-expect-error
    return this.device?.type ?? ''
  }

  get from() {
    if (this.type === 'phone') {
      // @ts-expect-error
      return this.device?.params?.fromNumber ?? ''
    } else if (this.type === 'sip') {
      // @ts-expect-error
      return this.device?.params?.from ?? ''
    }
    // @ts-expect-error
    return this.device?.params?.from ?? ''
  }

  get to() {
    if (this.type === 'phone') {
      // @ts-expect-error
      return this.device?.params?.toNumber ?? ''
    } else if (this.type === 'sip') {
      // @ts-expect-error
      return this.device?.params?.to ?? ''
    }
    // @ts-expect-error
    return this.device?.params?.to ?? ''
  }

  get headers() {
    // @ts-expect-error
    return this.device?.params?.headers ?? []
  }

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<
      EmitterTransformsEvents | EmitterTransformsEvents[],
      EventTransform
    >([
      [
        [
          callingPlaybackTriggerEvent,
          'calling.playback.started',
          'calling.playback.updated',
          'calling.playback.ended',
        ],
        {
          type: 'voiceCallPlayback',
          instanceFactory: (_payload: any) => {
            return createCallPlaybackObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: CallingCallPlayEventParams) => {
            return toExternalJSON(payload)
          },
        },
      ],
      [
        [
          callingRecordTriggerEvent,
          'calling.recording.started',
          'calling.recording.updated',
          'calling.recording.ended',
          'calling.recording.failed',
        ],
        {
          type: 'voiceCallRecord',
          instanceFactory: (_payload: any) => {
            return createCallRecordingObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: CallingCallRecordEventParams) => {
            return toExternalJSON(payload)
          },
        },
      ],
      [
        [
          callingPromptTriggerEvent,
          'calling.prompt.started',
          'calling.prompt.updated',
          'calling.prompt.ended',
          'calling.prompt.failed',
        ],
        {
          type: 'voiceCallPrompt',
          instanceFactory: (_payload: any) => {
            return createCallPromptObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: CallingCallCollectEventParams) => {
            return toExternalJSON(payload)
          },
        },
      ],
      [
        [callingTapTriggerEvent, 'calling.tap.started', 'calling.tap.ended'],
        {
          type: 'voiceCallTap',
          instanceFactory: (_payload: any) => {
            return createCallTapObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: CallingCallTapEventParams) => {
            return toExternalJSON(payload)
          },
        },
      ],
      [
        ['calling.call.state'],
        {
          type: 'voiceCallState',
          instanceFactory: (_payload: any) => {
            return this
          },
          payloadTransform: (payload: CallingCallStateEventParams) => {
            return toExternalJSON(payload)
          },
        },
      ],
      [
        ['calling.connect.connected'],
        {
          type: 'voiceCallConnect',
          instanceFactory: (_payload: any) => {
            return createCallObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: CallingCallConnectEventParams) => {
            /**
             * Within a `calling.connect` process `tag` refers to the originator leg.
             * We need to remove tag from the server payload to let the new (connected)
             * Call object to use its own tag value set to `this.__uuid`.
             */
            const { tag, ...peerParams } = payload.peer
            return toExternalJSON(peerParams)
          },
        },
      ],
      [
        [
          callingDetectTriggerEvent,
          'calling.detect.started',
          'calling.detect.updated',
          'calling.detect.ended',
        ],
        {
          type: 'voiceCallDetect',
          instanceFactory: (_payload: any) => {
            return createCallDetectObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: CallingCallDetectEventParams) => {
            return toExternalJSON(payload)
          },
        },
      ],
    ])
  }

  dial(params: VoiceDialerParams) {
    return new Promise((resolve, reject) => {
      this.runWorker<VoiceCallDialWorkerHooks>('voiceCallDialWorker', {
        worker: voiceCallDialWorker,
        onDone: resolve,
        onFail: reject,
      })

      let executeParams: Record<string, any>
      if (params instanceof DeviceBuilder) {
        const { devices } = params
        executeParams = {
          tag: this.__uuid,
          devices: toInternalDevices(devices),
        }
      } else if ('region' in params) {
        const { region, devices: deviceBuilder } = params
        executeParams = {
          tag: this.__uuid,
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

  hangup(reason: VoiceCallDisconnectReason = 'hangup') {
    return new Promise((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(
          new Error(
            `Can't call hangup() on a call that hasn't been established.`
          )
        )
      }

      // @ts-expect-error
      this.on('call.state', (params) => {
        if (params.callState === 'ended') {
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

  answer() {
    return new Promise<this>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call answer() on a call without callId.`))
      }

      // @ts-expect-error
      this.on('call.state', (params) => {
        if (params.callState === 'answered') {
          resolve(this)
        } else if (params.callState === 'ended') {
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

  play(params: VoicePlaylist) {
    return new Promise<CallPlayback>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call play() on a call not established yet.`))
      }

      const controlId = uuid()

      this.runWorker('voiceCallPlayWorker', {
        worker: voiceCallPlayWorker,
        initialState: {
          controlId,
        },
      })

      const resolveHandler = (callPlayback: any) => {
        resolve(callPlayback)
      }

      // @ts-expect-error
      this.on(callingPlaybackTriggerEvent, resolveHandler)

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
          const startEvent: CallingCallPlayEventParams = {
            control_id: controlId,
            call_id: this.id,
            node_id: this.nodeId,
            state: 'playing',
          }
          // @ts-expect-error
          this.emit(callingPlaybackTriggerEvent, startEvent)
        })
        .catch((e) => {
          // @ts-expect-error
          this.off(callingPlaybackTriggerEvent, resolveHandler)
          reject(e)
        })
    })
  }

  playAudio(params: VoiceCallPlayAudioMethodParams) {
    const { volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Audio(rest))
    return this.play(playlist)
  }

  playSilence(params: VoiceCallPlaySilenceMethodParams) {
    const playlist = new Playlist().add(Playlist.Silence(params))
    return this.play(playlist)
  }

  playRingtone(params: VoiceCallPlayRingtoneMethodParams) {
    const { volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Ringtone(rest))
    return this.play(playlist)
  }

  playTTS(params: VoiceCallPlayTTSMethodParams) {
    const { volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.TTS(rest))
    return this.play(playlist)
  }

  record(params: VoiceCallRecordMethodParams) {
    return new Promise<CallRecording>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call record() on a call not established yet.`))
      }

      const controlId = uuid()

      this.runWorker('voiceCallRecordWorker', {
        worker: voiceCallRecordWorker,
        initialState: {
          controlId,
        },
      })

      const resolveHandler = (callRecording: CallRecording) => {
        resolve(callRecording)
      }

      // @ts-expect-error
      this.on(callingRecordTriggerEvent, resolveHandler)

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
          const startEvent: Omit<CallingCallRecordEventParams, 'state'> = {
            control_id: controlId,
            call_id: this.id,
            node_id: this.nodeId,
            // state: 'recording',
            record,
          }
          // @ts-expect-error
          this.emit(callingRecordTriggerEvent, startEvent)
        })
        .catch((e) => {
          // @ts-expect-error
          this.off(callingRecordTriggerEvent, resolveHandler)
          reject(e)
        })
    })
  }

  recordAudio(params: VoiceCallRecordMethodParams['audio'] = {}) {
    return this.record({
      audio: params,
    })
  }

  prompt(params: VoiceCallPromptMethodParams) {
    return new Promise<CallPrompt>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call record() on a call not established yet.`))
      }
      if (!params.playlist) {
        reject(new Error(`Missing 'playlist' params.`))
      }

      const controlId = uuid()

      this.runWorker('voiceCallPromptWorker', {
        worker: voiceCallPromptWorker,
        initialState: {
          controlId,
        },
      })

      const resolveHandler = (callRecording: CallPrompt) => {
        resolve(callRecording)
      }
      // @ts-expect-error
      this.on(callingPromptTriggerEvent, resolveHandler)

      const { volume, media } = params.playlist
      // TODO: move this to a method to build `collect`
      const { initial_timeout, partial_results, digits, speech } =
        toSnakeCaseKeys(params)
      const collect = {
        initial_timeout,
        partial_results,
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
          const startEvent: Omit<CallingCallCollectEventParams, 'result'> = {
            control_id: controlId,
            call_id: this.id,
            node_id: this.nodeId,
          }
          // TODO: (review) There's no event for prompt started so we generate it here
          this.emit('prompt.started', startEvent)

          // @ts-expect-error
          this.emit(callingPromptTriggerEvent, startEvent)
        })
        .catch((e) => {
          this.off('prompt.started', resolveHandler)

          // @ts-expect-error
          this.off(callingPromptTriggerEvent, resolveHandler)
          reject(e)
        })
    })
  }

  promptAudio(params: VoiceCallPromptAudioMethodParams) {
    const { url, volume, ...rest } = params
    const playlist = new Playlist({ volume }).add(Playlist.Audio({ url }))

    return this.prompt({
      playlist,
      ...rest,
    })
  }

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

  sendDigits(digits: string) {
    return new Promise((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(
          new Error(`Can't call sendDigits() on a call not established yet.`)
        )
      }

      const controlId = uuid()

      const cleanup = () => {
        // @ts-expect-error
        this.off('call.state', callStateHandler)
      }

      this.runWorker<VoiceCallSendDigitsWorkerHooks>(
        'voiceCallSendDigitsWorker',
        {
          worker: voiceCallSendDigitsWorker,
          initialState: {
            controlId,
          },
          onDone: (args) => {
            cleanup()
            resolve(args)
          },
          onFail: ({ error }) => {
            cleanup()
            reject(error)
          },
        }
      )

      const callStateHandler = (params: any) => {
        if (params.callState === 'ended' || params.callState === 'ending') {
          reject(
            new Error(
              "Call is ended or about to end, couldn't send digits in time."
            )
          )
        }
      }
      // @ts-expect-error
      this.once('call.state', callStateHandler)

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

  tap(params: VoiceCallTapMethodParams) {
    return new Promise<CallTap>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call tap() on a call not established yet.`))
      }

      const controlId = uuid()

      this.runWorker('voiceCallTapWorker', {
        worker: voiceCallTapWorker,
        initialState: {
          controlId,
        },
      })

      const resolveHandler = (callTap: CallTap) => {
        resolve(callTap)
      }

      // @ts-expect-error
      this.on(callingTapTriggerEvent, resolveHandler)

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
          const startEvent: Omit<
            CallingCallTapEventParams,
            'state' | 'tap' | 'device'
          > = {
            control_id: controlId,
            call_id: this.id,
            node_id: this.nodeId,
          }
          // @ts-expect-error
          this.emit(callingTapTriggerEvent, startEvent)
        })
        .catch((e) => {
          // @ts-expect-error
          this.off(callingTapTriggerEvent, resolveHandler)
          reject(e)
        })
    })
  }

  tapAudio(params: VoiceCallTapAudioMethodParams) {
    const { direction, device } = params
    return this.tap({ audio: { direction }, device })
  }

  connect(params: VoiceCallConnectMethodParams) {
    return new Promise<any>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call connect() on a call not established yet.`))
      }

      let executeParams: Record<string, any>
      if (params instanceof DeviceBuilder) {
        const { devices } = params
        executeParams = {
          tag: this.__uuid,
          devices: toInternalDevices(devices),
        }
      } else if ('ringback' in params) {
        const { ringback, devices: deviceBuilder } = params
        executeParams = {
          tag: this.__uuid,
          ringback: toInternalPlayParams(ringback?.media ?? []),
          devices: toInternalDevices(deviceBuilder.devices),
        }
      } else {
        throw new Error('[connect] Invalid input')
      }

      this.runWorker('voiceCallConnectWorker', {
        worker: voiceCallConnectWorker,
      })

      const resolveHandler = (payload: CallingCallConnectEventParams) => {
        // @ts-expect-error
        this.off('connect.failed', rejectHandler)

        resolve(payload)
      }

      const rejectHandler = (payload: CallingCallConnectEventParams) => {
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

  connectPhone({ ringback, ...params }: VoiceCallConnectPhoneMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Phone(params))
    return this.connect({ devices, ringback })
  }

  connectSip({ ringback, ...params }: VoiceCallConnectSipMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Sip(params))
    return this.connect({ devices, ringback })
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

  waitForDisconnected() {
    return new Promise<this>((resolve) => {
      const resolveHandler = () => {
        resolve(this)
      }
      // @ts-expect-error
      this.once('connect.disconnected', resolveHandler)
      // @ts-expect-error
      this.once('connect.failed', resolveHandler)
    })
  }

  detect(params: VoiceCallDetectMethodParams) {
    return new Promise<CallDetect>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call detect() on a call not established yet.`))
      }

      // TODO: build params in a method
      const { waitForBeep = false, timeout, type, ...rest } = params
      const controlId = uuid()

      this.runWorker('voiceCallDetectWorker', {
        worker: voiceCallDetectWorker,
        initialState: {
          controlId,
          waitForBeep,
        },
      })

      const resolveHandler = (callDetect: CallDetect) => {
        resolve(callDetect)
      }

      // @ts-expect-error
      this.on(callingDetectTriggerEvent, resolveHandler)

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
          const startEvent: CallingCallDetectEventParams = {
            control_id: controlId,
            call_id: this.id,
            node_id: this.nodeId,
          }
          // @ts-expect-error
          this.emit(callingDetectTriggerEvent, startEvent)
        })
        .catch((e) => {
          // @ts-expect-error
          this.off(callingDetectTriggerEvent, resolveHandler)
          reject(e)
        })
    })
  }

  amd(params: Omit<VoiceCallDetectMachineParams, 'type'> = {}) {
    return this.detect({
      ...params,
      type: 'machine',
    })
  }

  detectFax(params: Omit<VoiceCallDetectFaxParams, 'type'> = {}) {
    return this.detect({
      ...params,
      type: 'fax',
    })
  }

  detectDigit(params: Omit<VoiceCallDetectDigitParams, 'type'> = {}) {
    return this.detect({
      ...params,
      type: 'digit',
    })
  }

  waitFor(params: CallingCallState | CallingCallState[]) {
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

      // @ts-expect-error
      this.on('call.state', (params) => {
        if (events.includes(params.callState)) {
          emittedCallStates.add(params.callState)
        } else if (shouldResolveUnsuccessful(params.callState)) {
          return resolve(false)
        }

        if (shouldResolve()) {
          resolve(true)
        }
      })
    })
  }
}

// FIXME: instead of Omit methods, i used "Partial<VoiceCallMethods>"
export const CallAPI = extendComponent<CallConsumer, Partial<VoiceCallMethods>>(
  CallConsumer,
  {}
)

export const createCallObject = (
  params: BaseComponentOptions<EmitterTransformsEvents>
): Call => {
  const call = connect<RealTimeCallApiEvents, CallConsumer, Call>({
    store: params.store,
    Component: CallAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return call
}
