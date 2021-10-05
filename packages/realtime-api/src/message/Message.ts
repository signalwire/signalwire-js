import { BaseComponent, BaseComponentOptions, connect, MessageEventParams } from '@signalwire/core'
import { MessageAPIEventHandlerMapping, MessageMethodParams, MessageMethodParamsWithoutType, MessageMethodResponse, MessageObject } from '../types'

const STATES_TO_RESOLVE_SENT_REQUESTS = [
  'sent', 'delivered', 'failed', 'undelivered'
]
export interface MessageAPI {
  send(params: MessageMethodParams): Promise<MessageObject>
  sendSMS(params: MessageMethodParamsWithoutType): Promise<MessageObject>
  sendMMS(params: MessageMethodParamsWithoutType): Promise<MessageObject>
}

export class MessageComponent extends BaseComponent<MessageAPIEventHandlerMapping> implements MessageAPI {
  protected _eventsPrefix = 'messaging' as const
  private _sendRequests: Map<string, { resolve: (value: MessageObject) => void, reject: (reason?: any) => void }> = new Map()

  constructor(public options: BaseComponentOptions<MessageAPIEventHandlerMapping>) {
    super(options)
    this.on('state', this._onMessageStateChange.bind(this))
    this._attachListeners('')
    this.applyEmitterTransforms()
  }
  
  /* @internal */
  public _onMessageStateChange(messageObj: MessageObject) {
    if (STATES_TO_RESOLVE_SENT_REQUESTS.includes(messageObj.state) && this._sendRequests.has(messageObj.id)) {
      const { resolve } = this._sendRequests.get(messageObj.id)!
      this._sendRequests.delete(messageObj.id)
      resolve(messageObj)
    }
  }

  private async _send({to: to_number, from: from_number, onMessageStateChange, ...params}: MessageMethodParams): Promise<MessageObject> {
    const response: MessageMethodResponse = await this.execute({
      method: 'messaging.send',
      params: {
        to_number,
        from_number,
        ...params
      }
    })
    if (onMessageStateChange) {
      this.on('state', (messageObj: MessageObject) => {
        if (messageObj.id === response.message_id) {
          onMessageStateChange(messageObj)
        }
      })
    }
    return new Promise((resolve, reject) => {
      this._sendRequests.set(response.message_id, { resolve, reject })
    })
  }

  send(params: MessageMethodParams): Promise<MessageObject> {
    return this._send(params)
  }

  sendMMS(params: MessageMethodParamsWithoutType): Promise<MessageObject> {
    return this._send({
      type: 'mms',
      ...params
    })
  }

  sendSMS(params: MessageMethodParamsWithoutType): Promise<MessageObject> {
    return this._send({
      type: 'sms',
      ...params
    })
  }

  protected getEmitterTransforms() {
    return new Map([[
      ['messaging.receive', 'messaging.state'],
      {
        instanceFactory: () => ({}),
        payloadTransform: (payload: MessageEventParams["params"]) => {
          const { 
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
      }
    ]])
  }

}

export const createMessageObject = (
  params: BaseComponentOptions<MessageAPIEventHandlerMapping>
): MessageAPI => {
  const message = connect<MessageAPIEventHandlerMapping, MessageComponent, MessageAPI>({
    store: params.store,
    Component: MessageComponent,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)
  const proxy = new Proxy<MessageAPI>(message, {
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

