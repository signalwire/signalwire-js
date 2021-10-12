import { MessageEventParams, Message as CoreMessage, extendComponent, BaseComponentOptions, connect, ConsumerContract } from '@signalwire/core'
import { BaseConsumer } from '../BaseConsumer'
import { MessageAPIEventHandlerMapping } from '../types'

export type MessageObject = MessageEventParams['params']


export class MessageConsumer extends BaseConsumer<MessageAPIEventHandlerMapping> {
  protected _eventsPrefix = 'messaging' as const
}

export interface MessageAPIMethods {
  send(params: CoreMessage.MessageMethodParams): Promise<CoreMessage.MessageMethodResponse>
  sendSMS(params: CoreMessage.MessageMethodParamsWithoutType): Promise<CoreMessage.MessageMethodResponse>
  sendMMS(params: CoreMessage.MessageMethodParamsWithoutType): Promise<CoreMessage.MessageMethodResponse>
}

export interface MessageAPI extends ConsumerContract<MessageAPIEventHandlerMapping>, MessageAPIMethods {
  subscribe(): Promise<void>
}

export const Message = extendComponent<MessageConsumer, MessageAPIMethods>(MessageConsumer, {
  send: CoreMessage.send,
  sendSMS: CoreMessage.sendSMS,
  sendMMS: CoreMessage.sendMMS,
})

export const createMessageObject = (
  params: BaseComponentOptions<MessageAPIEventHandlerMapping>
): MessageAPI => {
  const message = connect<MessageAPIEventHandlerMapping, MessageConsumer, MessageAPI>({
    store: params.store,
    Component: Message,
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

