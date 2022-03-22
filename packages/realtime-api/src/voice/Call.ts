import {
  AssertSameType,
  BaseComponentOptions,
  connect,
  ConsumerContract,
  extendComponent,
  VoiceCallMethods,
  VoiceCallContract,
  VoiceCallDialMethodParams,
  uuid,
} from '@signalwire/core'
import { AutoSubscribeConsumer } from '../AutoSubscribeConsumer'
import { RealTimeCallApiEvents } from '../types'
import * as methods from './methods'
import { toInternalDevices } from './methods'
import { SYNTHETIC_MEMBER_LIST_UPDATED_EVENT, voiceCallStateWorker } from './workers'

// TODO:
type EmitterTransformsEvents = ''

interface CallMain
  extends VoiceCallContract,
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

  constructor(options: BaseComponentOptions<RealTimeCallApiEvents>) {
    super(options)

    // TODO: check if this makes sense.
    // this._attachListeners(this.__uuid)
    this._attachListeners('')

    this.setWorker('voiceCallStateWorker', {
      worker: voiceCallStateWorker,
    })
    this.attachWorkers()
  }

  dial(params: VoiceCallDialMethodParams) {
    return new Promise((resolve) => {
      // @ts-expect-error
      this.once(SYNTHETIC_MEMBER_LIST_UPDATED_EVENT, () => {
        console.log('------------> ANSWERED!')
        resolve('answered')
      })

      // this.once('__internal__call.failed', () => {
      //   console.log('------------> FAILED!')
      //   reject('failed')
      // })

      this.execute({
        method: 'calling.dial',
        params: {
          ...params,
          tag: uuid(),
          devices: toInternalDevices(params.devices),
        },
      })
    })
  }
}

export const CallAPI = extendComponent<
  CallConsumer,
  Omit<VoiceCallMethods, 'dial'>
>(CallConsumer, {
  hangup: methods.callHangup,
})

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
