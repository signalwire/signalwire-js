import {
  AssertSameType,
  BaseComponentOptions,
  connect,
  ConsumerContract,
  extendComponent,
  VoiceCallMethods,
  VoiceCallContract,
} from '@signalwire/core'
import { AutoSubscribeConsumer } from '../AutoSubscribeConsumer'
import { RealTimeCallApiEvents } from '../types'
import * as methods from './methods'

// TODO:
type EmitterTransformsEvents = ''

interface CallMain
  extends VoiceCallContract,
    ConsumerContract<RealTimeCallApiEvents, CallFullState> {}

interface CallDocs extends CallMain {}

export interface Call extends AssertSameType<CallMain, CallDocs> {}

export interface CallFullState extends Call {}

export class CallConsumer extends AutoSubscribeConsumer<RealTimeCallApiEvents> {
  protected _eventsPrefix = 'voice' as const

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }
}

export const CallAPI = extendComponent<CallConsumer, VoiceCallMethods>(
  CallConsumer,
  {
    dial: methods.callDial,
    hangup: methods.callHangup,
  }
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
