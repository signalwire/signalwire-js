import {
  BaseComponent,
  BaseComponentOptions,
  connect,
  EventsPrefix,
  EventTransform,
  InternalGlobalMessageEvents,
  MessageStateEventParams,
  SessionState,
} from '@signalwire/core'
import { RelayMessageAPIEvents } from '../types'
import { MessageComponent, MessageConstructor } from './Message'

export class MessageNamespace extends BaseComponent<RelayMessageAPIEvents> {
  protected _eventsPrefix: EventsPrefix = 'messaging'

  constructor(options: BaseComponentOptions<RelayMessageAPIEvents>) {
    super(options)
    this._attachListeners('')
    this.applyEmitterTransforms()
  }

  get Message() {
    return MessageConstructor({
      store: this.options.store,
      // Emitter is now typed but we share it across objects
      // so types won't match
      // @ts-expect-error
      emitter: this.options.emitter,
    })
  }

  onAuthStatusChange(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this._attachListeners('')
      this.applyEmitterTransforms()
    }
  }

  protected getEmitterTransforms() {
    return new Map<
      InternalGlobalMessageEvents | InternalGlobalMessageEvents[],
      EventTransform
    >([
      [
        ['messaging.receive', 'messaging.state'],
        {
          type: 'message',
          instanceFactory: (payload: MessageStateEventParams) => {
            const {
              from_number: from,
              to_number: to,
              body,
              media,
              tags,
              tag,
              context,
              message_id,
              message_state,
              direction,
              segments,
              reason,
            } = payload
            const message = new this.Message({
              from,
              to,
              body,
              media,
              tags,
              context,
            }) as MessageComponent
            message.tag = tag
            message.setState({
              message_id,
              message_state,
              direction,
              segments,
              reason,
            })
            return message
          },
          payloadTransform: ({
            message_id: id,
            message_state: state,
            from_number: from,
            to_number: to,
            ...rest
          }: MessageStateEventParams) => {
            return { to, from, state, id, ...rest }
          },
        },
      ],
    ])
  }
}

export const createMessageNamespace = (
  options: BaseComponentOptions<RelayMessageAPIEvents>
): MessageNamespace => {
  const msgNamespace = connect<
    RelayMessageAPIEvents,
    MessageNamespace,
    MessageNamespace
  >({
    store: options.store,
    Component: MessageNamespace,
    componentListeners: {},
    sessionListeners: {
      authStatus: 'onAuthStatusChange',
    },
  })(options)

  return msgNamespace
}
