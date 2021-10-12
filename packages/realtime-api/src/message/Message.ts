import { 
  BaseComponent,
  BaseComponentOptions,
  connect,
  EventTransform,
  MessageEventTypes,
  uuid,
} from '@signalwire/core'
import { Message } from '@signalwire/core/src/redux/interfaces'
import {
  MessageAPIEventHandlerMapping,
  MessageMethodParams,
  SMSMessageMethodParams,
  MMSMessageMethodParams,
  MessageMethodResponse,
  MessageObject,
  BaseMessageMethodParams
} from '../types'

const STATES_TO_RESOLVE_SENT_REQUESTS = [
  'delivered', 'undelivered'
]
interface MessageAPI {
  send(params: MessageMethodParams): Promise<MessageObject>
  sendSMS(params: SMSMessageMethodParams): Promise<MessageObject>
  sendMMS(params: MMSMessageMethodParams): Promise<MessageObject>
}

const messagePayloadTransform = (payload: any) => {
  // console.log(payload)
  const {
    id: _,
    message_id: id, 
    from_number: from, 
    to_number: to, 
    message_state: state, 
    ...rest 
  } = payload
  return {
    id,
    to,
    from,
    state,
    get delivered(): boolean {
      return this.state === 'delivered'
    },
    get sent(): boolean {
      return this.state === 'sent'
    },
    ...rest
  }
}

export class MessageComponent extends BaseComponent<MessageAPIEventHandlerMapping> implements MessageAPI {
  protected _eventsPrefix = 'messaging' as const
  private _sendRequests: Map<string, { resolve: (value: MessageObject) => void, reject: (reason?: any) => void }> = new Map()
  private _onMessageStateChangeCallbacks: Map<string, (message: MessageObject) => void> = new Map()
  constructor(public options: BaseComponentOptions<MessageAPIEventHandlerMapping>) {
    super(options)
    this._attachListeners('')
    this.applyEmitterTransforms()
  }
  
  /* @internal */
  public onMessageStateChange(message: Message) {
    const messageObject = messagePayloadTransform(message)

    if (this._onMessageStateChangeCallbacks.has(messageObject.localMessageUUID)) {
      const callback = this._onMessageStateChangeCallbacks.get(messageObject.localMessageUUID)!
      callback(messageObject)
      this._onMessageStateChangeCallbacks.delete(messageObject.localMessageUUID)
    }

    if (
      messageObject.state && messageObject.localMessageUUID
      && STATES_TO_RESOLVE_SENT_REQUESTS.includes(messageObject.state)
      && this._sendRequests.has(messageObject.localMessageUUID))
    {
      const { resolve } = this._sendRequests.get(messageObject.localMessageUUID)!
      resolve(messageObject)
      this._sendRequests.delete(messageObject.localMessageUUID)
    }
  }

  private _send({ to: to_number, from: from_number, onMessageStateChange, ...params}: BaseMessageMethodParams): Promise<MessageObject> {
    const localMessageUUID = uuid()
     this.execute({
      method: 'messaging.send',
      params: {
        to_number,
        from_number,
        tag: `${this.__uuid}:${localMessageUUID}`,
        ...params
      }
    })
    if (onMessageStateChange) {
      this._onMessageStateChangeCallbacks.set(localMessageUUID, onMessageStateChange)
    }
    return new Promise<MessageObject>((resolve, reject) => {
      this._sendRequests.set(localMessageUUID, { resolve, reject })
    })
  }

  send({type, ...params}: MessageMethodParams): Promise<MessageObject> {
    if (type === 'sms') {
      return this.sendSMS(params as SMSMessageMethodParams)
    } else {
      return this.sendMMS(params as MMSMessageMethodParams)
    }
  }

  sendMMS(params: MMSMessageMethodParams): Promise<MessageObject> {
    return this._send(params)
  }

  sendSMS(params: SMSMessageMethodParams): Promise<MessageObject> {
    return this._send(params)
  }

  protected getEmitterTransforms() {
    return new Map<MessageEventTypes | MessageEventTypes[], EventTransform>([[
      ['messaging.receive', 'messaging.state'],
      {
        type: 'messaging',
        instanceFactory: () => ({}),
        payloadTransform: messagePayloadTransform,
      }
    ]])
  }

}

export const createMessageObject = (
  params: BaseComponentOptions<MessageAPIEventHandlerMapping>
): MessageComponent => {
  const message = connect<MessageAPIEventHandlerMapping, MessageComponent, MessageComponent>({
    store: params.store,
    Component: MessageComponent,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
      message_state: 'onMessageStateChange',
    },
  })(params)
  const proxy = new Proxy<MessageComponent>(message, {
    get(target: any, prop: any, receiver: any) {
      if (prop === '_eventsNamespace') {
        /**
         * Events at this level will always be global so
         * there's no need for a namespace.
         */
        return ''
      }
      return Reflect.get(target, prop, receiver)
    },
  })

  return proxy
}

