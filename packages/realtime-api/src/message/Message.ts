import {
  AssertSameType,
  BaseComponent,
  BaseComponentOptions,
  connect,
  EventsPrefix,
  EventTransform,
  InternalGlobalMessageEvents,
  MessageContract,
  MessageStateEventParams,
  uuid,
} from '@signalwire/core'
import { MessageComponentEvents } from '../types'

export interface MessageMain
  extends BaseComponent<MessageComponentEvents>,
    MessageContract {
  /**
   * FIXME: since Message is not a we don't have `subscirbe` method
   * which inturn will call the `applyEmitterTransform`
   * this method serve as a workaround for that
   * (we may refactor this into a new interface similar to ConsumerContract?)
   * @internal
   */
  _applyEmitterTransforms(): void
}

export interface MessageDoc extends MessageMain {
  /**
   * Send the message
   *
   * @return `Promise<void>`
   *
   * @example
   * ```javascript
   * const message = new client.message.Message({
   *   context: "default",
   *   to: "+11111111",
   *   from: "+22222222",
   *   body: "Hi there",
   *   media: ["media/url/1", "media/url/2"],
   *   tags: ["tag1", "tag2"]
   * })
   *
   * message.on('state', (msg) => {
   *   // msg === message
   *   // msg.id
   *   // msg.state
   *   // msg.body
   *   // msg.from
   *   // msg.to
   *   // msg.media
   *   // ms.tags
   *   // msg.reason if the delivery failed
   * })
   *
   * message.send()
   *
   * ```
   */
  send(): Promise<MessageContract>
}
/**
 * Represnt a message, you can obtain this instance by calling createMessage method
 * and/or subscribing to `state` and `receive` events on {@link MessageNamespace}
 *
 * ### Events
 * You can use this object to subscribe to following events.
 *
 * #### Message events
 * - `state`
 *
 * Emitted when there the message's state changes, your event handler will recive
 * {@link Message} instance
 *
 */
export interface Message extends AssertSameType<MessageMain, MessageDoc> {}

export type MessageOptions = {
  to: string
  context: string
  from: string
  body?: string
  media?: string[]
  tags?: string[]
}

type MessageState = Pick<
  MessageStateEventParams,
  'message_id' | 'message_state' | 'reason' | 'direction' | 'segments'
>

type InternalMessageOptions = MessageOptions & Partial<MessageState>

const EVENTS_TO_RESOLVE_PROMISE = ['delivered', 'undelivered']
export class MessageComponent
  extends BaseComponent<MessageComponentEvents>
  implements Message
{
  /**
   * @internal
   */
  protected _eventsPrefix: EventsPrefix = 'messaging'
  /**
   * @internal
   */
  public tag: string = uuid()

  /**
   * @internal
   */
  private _messageOptions?: InternalMessageOptions

  /**
   * @internal
   */
  private _resolve?: () => void

  /**
   * @internal
   */
  setOptions(options: MessageOptions) {
    this._messageOptions = { ...this.options, ...options }
  }

  /**
   * @internal
   */
  setState(state: MessageState) {
    // @ts-expect-error
    this._messageOptions = { ...this.options, ...state }
  }

  get id() {
    return this._messageOptions!.message_id!
  }

  get direction() {
    return this._messageOptions!.direction!
  }

  get tags() {
    return this._messageOptions!.tags!
  }

  get to() {
    return this._messageOptions!.to!
  }

  get from() {
    return this._messageOptions!.from!
  }

  get body() {
    return this._messageOptions!.body
  }

  get media() {
    return this._messageOptions!.media
  }

  get segments() {
    return this._messageOptions!.segments!
  }

  get state() {
    return this._messageOptions!.message_state!
  }

  get context() {
    return this._messageOptions!.context
  }

  _applyEmitterTransforms() {
    this.applyEmitterTransforms()
    // this._attachListeners(this.tag)
  }

  /**
   * @internal
   */
  onStateChange(state: MessageState) {
    this.setState({
      message_id: state.message_id,
      message_state: state.message_state,
      reason: state.reason,
      direction: state.direction,
      segments: state.segments,
    })
    if (EVENTS_TO_RESOLVE_PROMISE.includes(this.state) && this._resolve) {
      this._resolve()
      this._resolve = undefined
    }
  }

  async send() {
    const {
      to: to_number,
      from: from_number,
      body,
      tags,
      media,
      context,
    } = this._messageOptions!
    // FIXME: temporary hack to invoke component listener from redux
    // until backend is ready to accept `tag`
    // we might not need to generate new uuid for tag,
    // we could just __uuid as the tag(?)
    const modTags = (tags ?? []).concat(
      `tag:${this.tag}`,
      `uuid:${this.__uuid}`
    )
    const params = {
      context,
      to_number,
      from_number,
      body,
      media,
      tags: modTags,
      tag: this.tag,
    }
    this.execute({
      method: 'messaging.send',
      params,
    })
    await new Promise<void>((resolve) => {
      this._resolve = resolve
    })
    return this
  }

  protected getEmitterTransforms() {
    return new Map<InternalGlobalMessageEvents, EventTransform>([
      [
        'messaging.state',
        {
          type: 'message',
          instanceFactory: () => {
            return this
          },
          payloadTransform: (payload: any) => {
            const {
              to_number: to,
              from_number: from,
              message_id: id,
              message_state: state,
              ...rest
            } = payload
            return {
              to,
              from,
              id,
              state,
              ...rest,
            }
          },
        },
      ],
    ])
  }
}

export type CreateMessageOptions =
  BaseComponentOptions<MessageComponentEvents> & MessageOptions

export const createMessage = (options: CreateMessageOptions): Message => {
  const { to, from, context, body, media, tags, ...componentOptions } = options
  const message = connect<
    MessageComponentEvents,
    // @ts-ignore
    MessageComponent,
    MessageComponent
  >({
    store: componentOptions.store,
    Component: MessageComponent,
    componentListeners: {
      message_state: 'onStateChange',
    },
    sessionListeners: {
      // authStatus: 'onAuthStatusChange'
    },
  })(componentOptions)

  message.setOptions({
    context,
    to,
    from,
    body,
    media,
    tags,
  })
  // return message
  const proxy = new Proxy<Message>(message, {
    get: (target: any, prop: any, receiver: any) => {
      if (prop === '_eventsNamespace') {
        return message.tag
      }
      return Reflect.get(target, prop, receiver)
    },
  })
  return proxy
}
/**
 * @internal
 */
export type MessageConstructorType = {
  new (options: MessageOptions): Message
}

/**
 * @internal
 */
export const MessageConstructor = (
  options: BaseComponentOptions<MessageComponentEvents>
) => {
  return function (messageOptions: MessageOptions): Message {
    const message = createMessage({
      ...options,
      ...messageOptions,
    })
    // FIXME: find better place to call _applyEmitterTransforms
    message._applyEmitterTransforms()
    return message
  } as unknown as MessageConstructorType
}
