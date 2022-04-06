import {
  uuid,
  AssertSameType,
  BaseComponentOptions,
  connect,
  EmitterContract,
  extendComponent,
  VoiceCallMethods,
  VoiceCallContract,
  VoiceCallDialMethodParams,
  VoiceCallDisconnectReason,
  VoiceCallPlayMethodParams,
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
  CallingCallStateEventParams,
  VoiceCallConnectMethodParams,
  CallingCallConnectEventParams,
} from '@signalwire/core'
import { RealTimeCallApiEvents } from '../types'
import { AutoApplyTransformsConsumer } from '../AutoApplyTransformsConsumer'
import { toInternalDevices, toInternalPlayParams } from './utils'
import {
  SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
  SYNTHETIC_CALL_STATE_ENDED_EVENT,
  voiceCallStateWorker,
  voiceCallPlayWorker,
  voiceCallRecordWorker,
  voiceCallPromptWorker,
  voiceCallTapWorker,
  voiceCallConnectWorker,
} from './workers'
import { createCallPlaybackObject } from './CallPlayback'
import { CallRecording, createCallRecordingObject } from './CallRecording'
import { CallPrompt, createCallPromptObject } from './CallPrompt'
import { CallTap, createCallTapObject } from './CallTap'

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
  // events not exposed
  | 'calling.call.state'
  | 'calling.connect.connected'

interface CallMain
  extends VoiceCallContract<Call>,
    EmitterContract<RealTimeCallApiEvents> {}

interface CallDocs extends CallMain {}

export interface Call extends AssertSameType<CallMain, CallDocs> {}

export interface CallFullState extends Call {}

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

export class CallConsumer extends AutoApplyTransformsConsumer<RealTimeCallApiEvents> {
  protected _eventsPrefix = 'calling' as const

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

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
          toLocalEvent<EmitterTransformsEvents>('calling.playback.start'),
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
            const { tag, ...peerParams } = payload.peer
            return toExternalJSON(peerParams)
          },
        },
      ],
    ])
  }

  dial(params: VoiceCallDialMethodParams) {
    return new Promise((resolve, reject) => {
      // TODO: pass resolve/reject to the worker instead of use synthetic events?
      this.setWorker('voiceCallStateWorker', {
        worker: voiceCallStateWorker,
      })
      this.attachWorkers()

      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_ANSWERED_EVENT, (payload: any) => {
        this.callId = payload.call_id
        this.nodeId = payload.node_id

        resolve(this)
      })

      // this.once(SYNTHETIC_CALL_STATE_FAILED_EVENT, () => {
      //   reject(new Error('Failed to establish the call.'))
      // })

      this.execute({
        method: 'calling.dial',
        params: {
          ...params,
          tag: this.__uuid,
          devices: toInternalDevices(params.devices),
        },
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

      // TODO: pass resolve/reject to the worker instead of use synthetic events?
      this.setWorker('voiceCallStateWorker', {
        worker: voiceCallStateWorker,
      })
      this.attachWorkers()

      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_ENDED_EVENT, () => {
        resolve(undefined)
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

      const errorHandler = () => {
        reject(new Error('Failed to answer the call.'))
      }

      // TODO: pass resolve/reject to the worker instead of use synthetic events?
      this.setWorker('voiceCallStateWorker', {
        worker: voiceCallStateWorker,
      })
      this.attachWorkers({ payload: 1 })

      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_ANSWERED_EVENT, () => {
        // @ts-expect-error
        this.off(SYNTHETIC_CALL_STATE_ENDED_EVENT, errorHandler)

        resolve(this)
      })

      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_ENDED_EVENT, errorHandler)

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

  play(params: VoiceCallPlayMethodParams) {
    return new Promise<this>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call play() on a call not established yet.`))
      }

      const controlId = uuid()

      this.setWorker('voiceCallPlayWorker', {
        worker: voiceCallPlayWorker,
      })
      this.attachWorkers({
        payload: {
          controlId,
        },
      })

      const resolveHandler = (callPlayback: any) => {
        resolve(callPlayback)
      }

      this.once(toLocalEvent('calling.playback.start'), resolveHandler)

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
          this.emit(toLocalEvent('calling.playback.start'), startEvent)
        })
        .catch((e) => {
          // @ts-expect-error
          this.off(toLocalEvent('calling.playback.start'), resolveHandler)
          reject(e)
        })
    })
  }

  playAudio(params: VoiceCallPlayAudioMethodParams) {
    const { volume, ...rest } = params
    return this.play({
      media: [{ type: 'audio', ...rest }],
      volume,
    })
  }

  playSilence(params: VoiceCallPlaySilenceMethodParams) {
    return this.play({
      media: [{ type: 'silence', ...params }],
    })
  }

  playRingtone(params: VoiceCallPlayRingtoneMethodParams) {
    const { volume, ...rest } = params
    return this.play({
      media: [{ type: 'ringtone', ...rest }],
      volume,
    })
  }

  playTTS(params: VoiceCallPlayTTSMethodParams) {
    const { volume, ...rest } = params
    return this.play({
      media: [{ type: 'tts', ...rest }],
      volume,
    })
  }

  record(params: VoiceCallRecordMethodParams) {
    return new Promise<CallRecording>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call record() on a call not established yet.`))
      }

      const controlId = uuid()

      this.setWorker('voiceCallRecordWorker', {
        worker: voiceCallRecordWorker,
      })
      this.attachWorkers({
        payload: {
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

      const controlId = uuid()

      this.setWorker('voiceCallPromptWorker', {
        worker: voiceCallPromptWorker,
      })
      this.attachWorkers({
        payload: {
          controlId,
        },
      })

      const resolveHandler = (callRecording: CallPrompt) => {
        resolve(callRecording)
      }
      // @ts-expect-error
      this.on(callingPromptTriggerEvent, resolveHandler)

      // TODO: move this to a method to build `collect`
      const {
        initial_timeout,
        partial_results,
        digits,
        speech,
        media,
        volume,
      } = toSnakeCaseKeys(params)
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
    const { url, ...rest } = params

    return this.prompt({
      media: [{ type: 'audio', url }],
      ...rest,
    })
  }

  promptRingtone(params: VoiceCallPromptRingtoneMethodParams) {
    // FIXME: ringtone `name` is too generic as argument
    const { name, duration, ...rest } = params

    return this.prompt({
      media: [{ type: 'ringtone', name, duration }],
      ...rest,
    })
  }

  promptTTS(params: VoiceCallPromptTTSMethodParams) {
    const { text, language, gender, ...rest } = params

    return this.prompt({
      media: [{ type: 'tts', text, language, gender }],
      ...rest,
    })
  }

  tap(params: VoiceCallTapMethodParams) {
    return new Promise<CallTap>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call tap() on a call not established yet.`))
      }

      const controlId = uuid()

      this.setWorker('voiceCallTapWorker', {
        worker: voiceCallTapWorker,
      })
      this.attachWorkers({
        payload: {
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

      this.setWorker('voiceCallConnectWorker', {
        worker: voiceCallConnectWorker,
      })
      this.attachWorkers()

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

      const { devices, ringback = [] } = params
      this.execute({
        method: 'calling.connect',
        params: {
          node_id: this.nodeId,
          call_id: this.callId,
          tag: this.__uuid,
          devices: toInternalDevices(devices),
          ringback: toInternalPlayParams(ringback),
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

  waitUntilConnected() {
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
