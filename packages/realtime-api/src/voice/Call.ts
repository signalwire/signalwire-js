import {
  uuid,
  AssertSameType,
  BaseComponent,
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
  EventTransform,
  toLocalEvent,
  toExternalJSON,
  CallingCallPlayEventParams,
} from '@signalwire/core'
import { RealTimeCallApiEvents } from '../types'
import { toInternalDevices, toInternalPlayParams } from './utils'
import {
  SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
  SYNTHETIC_CALL_STATE_ENDED_EVENT,
  voiceCallStateWorker,
  voiceCallPlayWorker,
} from './workers'
import { createCallPlaybackObject } from './CallPlayback'

// TODO:
type EmitterTransformsEvents =
  | 'calling.playback.start'
  | 'calling.playback.started'
  | 'calling.playback.updated'
  | 'calling.playback.ended'

interface CallMain
  extends VoiceCallContract<Call>,
    EmitterContract<RealTimeCallApiEvents> {}

interface CallDocs extends CallMain {}

export interface Call extends AssertSameType<CallMain, CallDocs> {}

export interface CallFullState extends Call {}

export class CallConsumer extends BaseComponent<RealTimeCallApiEvents> {
  protected _eventsPrefix = 'calling' as const

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  public callId: string
  public nodeId: string

  constructor(options: BaseComponentOptions<RealTimeCallApiEvents>) {
    super(options)
    this._attachListeners(this.__uuid)
    this.applyEmitterTransforms({ local: true })
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

      // @ts-expect-error
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
