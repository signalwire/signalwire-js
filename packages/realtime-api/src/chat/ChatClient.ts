import {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
  Chat as ChatNamespace,
} from '@signalwire/core'
import { getLogger } from '@signalwire/core'
import { clientConnect, setupClient, RealtimeClient } from '../client/index'

export interface ClientApiEvents extends ChatNamespace.BaseChatApiEvents {}

export interface ClientFullState extends ChatClient {}
interface ClientMain
  extends ChatContract,
    Omit<ConsumerContract<ClientApiEvents, ClientFullState>, 'subscribe'> {
  /** @internal */
  _session: RealtimeClient
}

interface ClientDocs extends ClientMain {}

export interface ChatClient extends AssertSameType<ClientMain, ClientDocs> {}

export interface ChatClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

type ClientMethods = Exclude<keyof ChatClient, '_session'>
const INTERCEPTED_METHODS: ClientMethods[] = [
  'subscribe',
  'publish',
  'getMessages',
  'getMembers',
  'getMemberState',
  'setMemberState',
]

const ChatClient = function (options?: ChatClientOptions) {
  if ('production' === process.env.NODE_ENV) {
    getLogger().warn(
      '`Chat` is still under development and may change in the future without prior notice.'
    )
  }
  const { client, store, emitter } = setupClient(options)
  const chat = ChatNamespace.createBaseChatObject<ChatClient>({
    store,
    emitter,
  })
  const chatOn: ChatClient['on'] = (...args) => {
    clientConnect(client)

    return chat.on(...args)
  }
  const chatOnce: ChatClient['once'] = (...args) => {
    clientConnect(client)

    return chat.once(...args)
  }

  const createInterceptor = <K extends ClientMethods>(prop: K) => {
    return async (...params: Parameters<ChatClient[K]>) => {
      await clientConnect(client)

      // @ts-expect-error
      return chat[prop](...params)
    }
  }

  const interceptors = {
    on: chatOn,
    once: chatOnce,
    _session: client,
  } as const

  return new Proxy<ChatClient>(chat, {
    get(target: ChatClient, prop: keyof ChatClient, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      // FIXME: types and _session check
      if (prop !== '_session' && INTERCEPTED_METHODS.includes(prop)) {
        return createInterceptor(prop)
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: ChatClientOptions): ChatClient }

export { ChatClient as Client }
