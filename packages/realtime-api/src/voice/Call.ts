import {
  AssertSameType,
  BaseComponentOptions,
  connect,
  ConsumerContract,
  extendComponent,
  VoiceCallMethods,
  VoiceCallContract,
  VoiceCallDialMethodParams,
  VoiceCallDisconnectReason,
} from '@signalwire/core'
import { AutoSubscribeConsumer } from '../AutoSubscribeConsumer'
import { RealTimeCallApiEvents } from '../types'
import { toInternalDevices } from './utils'
import {
  SYNTHETIC_CALL_STATE_FAILED_EVENT,
  SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
  SYNTHETIC_CALL_STATE_ENDED_EVENT,
  voiceCallStateWorker,
} from './workers'

// TODO:
type EmitterTransformsEvents = ''

interface CallMain
  extends VoiceCallContract<Call>,
    ConsumerContract<RealTimeCallApiEvents, CallFullState> {}

interface CallDocs extends CallMain {}

export interface Call extends AssertSameType<CallMain, CallDocs> {}

export interface CallFullState extends Call {}

export class CallConsumer extends AutoSubscribeConsumer<RealTimeCallApiEvents> {
  protected _eventsPrefix = 'calling' as const

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  private _callId: string
  private _nodeId: string

  constructor(options: BaseComponentOptions<RealTimeCallApiEvents>) {
    super(options)
    this._attachListeners(this.__uuid)
  }

  get id() {
    return this._callId
  }

  get tag() {
    return this.__uuid
  }

  set callId(callId: string) {
    this._callId = callId
  }

  set nodeId(nodeId: string) {
    this._nodeId = nodeId
  }

  dial(params: VoiceCallDialMethodParams) {
    return new Promise((resolve, reject) => {
      // TODO: pass resolve/reject to the worker instead of use synthetic events?
      this.setWorker('voiceCallStateWorker', {
        worker: voiceCallStateWorker,
      })
      this.attachWorkers()

      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_ANSWERED_EVENT, (payload) => {
        this._callId = payload.call_id
        this._nodeId = payload.node_id

        resolve(this)
      })

      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_FAILED_EVENT, () => {
        reject(new Error('Failed to establish the call.'))
      })

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
      if (!this._callId || !this._nodeId) {
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

      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_FAILED_EVENT, () => {
        reject(new Error('Failed to hangup the call.'))
      })

      this.execute({
        method: 'calling.end',
        params: {
          node_id: this._nodeId,
          call_id: this._callId,
          reason: reason,
        },
      }).catch((e) => {
        reject(e)
      })
    })
  }

  answer() {
    return new Promise<this>((resolve, reject) => {
      if (!this._callId || !this._nodeId) {
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
        // @ts-expect-error
        this.off(SYNTHETIC_CALL_STATE_FAILED_EVENT, errorHandler)

        resolve(this)
      })

      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_ENDED_EVENT, errorHandler)
      // @ts-expect-error
      this.once(SYNTHETIC_CALL_STATE_FAILED_EVENT, errorHandler)

      this.execute({
        method: 'calling.answer',
        params: {
          node_id: this._nodeId,
          call_id: this._callId,
        },
      }).catch((e) => {
        reject(e)
      })
    })
  }
}

export const CallAPI = extendComponent<
  CallConsumer,
  Omit<VoiceCallMethods, 'dial' | 'hangup' | 'answer'>
>(CallConsumer, {})

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
