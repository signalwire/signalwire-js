import {
  BaseComponentOptions,
  BaseConsumer,
  connect,
  extendComponent,
  JSONRPCSubscribeMethod,
  toExternalJSON,
  InternalChatChannel,
  EventTransform,
  ExecuteParams,
  actions,
  SessionEvents,
} from '..'
import { ChatMessage } from './ChatMessage'
import { ChatMember } from './ChatMember'
import * as chatMethods from './methods'
import * as workers from './workers'
import type {
  ChatChannelMessageEvent,
  ChatMethods,
  ChatMessageEventName,
  ChatEventNames,
  ChatMemberEventNames,
  ChatMemberJoinedEvent,
  ChatMemberUpdatedEvent,
  ChatMemberLeftEvent,
  ChatChannel,
} from '../types/chat'

type ChatMemberEvent =
  | ChatMemberJoinedEvent
  | ChatMemberLeftEvent
  | ChatMemberUpdatedEvent
export type BaseChatApiEventsHandlerMapping = Record<
  ChatMessageEventName,
  (message: ChatMessage) => void
> &
  Record<ChatMemberEventNames, (member: ChatMember) => void> &
  Record<Extract<SessionEvents, 'session.expiring'>, () => void>

/**
 * @privateRemarks
 *
 * Each package will have the option to either extend this
 * type or provide their own event mapping.
 */
export type BaseChatApiEvents<T = BaseChatApiEventsHandlerMapping> = {
  [k in keyof T]: T[k]
}

const toInternalChatChannels = (channels: string[]): InternalChatChannel[] => {
  return channels.map((name) => {
    return {
      name,
    }
  })
}

export class BaseChatConsumer extends BaseConsumer<BaseChatApiEvents> {
  protected override _eventsPrefix = 'chat' as const
  protected override subscribeMethod: JSONRPCSubscribeMethod = 'chat.subscribe'

  constructor(options: BaseComponentOptions<BaseChatApiEvents>) {
    super(options)

    /**
     * Since we don't need a namespace for these events
     * we'll attach them as soon as the Client has been
     * registered in the Redux store.
     */
    this._attachListeners('')
  }

  private _getChannelsParam(
    channels: string | string[] | undefined,
    method: 'subscribe' | 'unsubscribe'
  ) {
    const _channels =
      !channels || Array.isArray(channels) ? channels : [channels]

    if (!Array.isArray(_channels) || _channels.length === 0) {
      throw new Error(
        `Please specify one or more channels when calling .${method}()`
      )
    }

    return {
      channels: toInternalChatChannels(_channels),
    }
  }

  private _setSubscribeParams(params: Record<string, any>) {
    this.subscribeParams = {
      ...this.subscribeParams,
      ...params,
    }
  }

  private _getSubscribeParams({ channels }: { channels?: ChatChannel }) {
    return {
      ...this._getChannelsParam(channels, 'subscribe'),
    }
  }

  private _getUnsubscribeParams({ channels }: { channels?: ChatChannel }) {
    const channelsParam = this._getChannelsParam(channels, 'unsubscribe')

    return {
      ...channelsParam,
    }
  }

  protected getWorkers() {
    return new Map([['chat', { worker: workers.chatWorker }]])
  }

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<ChatEventNames | ChatEventNames[], EventTransform>([
      [
        ['message'],
        {
          type: 'chatMessage',
          instanceFactory: (payload: ChatChannelMessageEvent) => {
            const { channel, message } = payload.params
            return new ChatMessage(
              toExternalJSON({
                ...message,
                channel,
              })
            )
          },
          payloadTransform: (payload: ChatChannelMessageEvent) => {
            const { channel, message } = payload.params
            return toExternalJSON({
              ...message,
              channel,
            })
          },
        },
      ],
      [
        ['member.joined', 'member.left', 'member.updated'],
        {
          type: 'chatMessage',
          instanceFactory: (payload: ChatMemberEvent) => {
            const { member } = payload.params
            return new ChatMember(toExternalJSON(member))
          },
          payloadTransform: (payload: ChatMemberEvent) => {
            const { member } = payload.params
            return toExternalJSON(member)
          },
        },
      ],
    ])
  }

  async subscribe(channels?: ChatChannel) {
    const params = this._getSubscribeParams({ channels })

    this._setSubscribeParams(params)

    return super.subscribe()
  }

  async unsubscribe(channels: ChatChannel) {
    if (
      this._sessionAuthStatus === 'unknown' ||
      this._sessionAuthStatus === 'unauthorized'
    ) {
      throw new Error('You must be authenticated to unsubscribe from a channel')
    }

    const params = this._getUnsubscribeParams({ channels })

    return new Promise(async (resolve, reject) => {
      const subscriptions = this.getSubscriptions()

      if (subscriptions.length > 0) {
        const execParams: ExecuteParams = {
          method: 'chat.unsubscribe',
          params: {
            ...params,
            events: subscriptions,
          },
        }

        try {
          await this.execute(execParams)
        } catch (error) {
          return reject(error)
        }
      } else {
        this.logger.warn(
          '`unsubscribe()` was called without any listeners attached.'
        )
      }

      return resolve(undefined)
    })
  }

  updateToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      /**
       * Use this.emitter to avoid the internal/namespaced event
       * ie: `session.disconnected` transformed to `chat.session.disconnected`
       */

      // @ts-expect-error
      this.emitter.once('session.auth_error', (error) => {
        reject(error)
      })
      // @ts-expect-error
      this.emitter.once('session.connected', () => {
        resolve()
      })

      this.store.dispatch(actions.reauthAction({ token }))
    })
  }
}

export const BaseChatAPI = extendComponent<BaseChatConsumer, ChatMethods>(
  BaseChatConsumer,
  {
    publish: chatMethods.publish,
    getMembers: chatMethods.getMembers,
    getMessages: chatMethods.getMessages,
    setMemberState: chatMethods.setMemberState,
    getMemberState: chatMethods.getMemberState,
  }
)

export const createBaseChatObject = <ChatType>(
  params: BaseComponentOptions<ChatEventNames>
) => {
  const chat = connect<BaseChatApiEvents, BaseChatConsumer, ChatType>({
    store: params.store,
    Component: BaseChatAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return chat
}
