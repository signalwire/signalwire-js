import {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
  Chat as ChatNamespace,
} from '@signalwire/core'
import { getLogger } from '@signalwire/core'
import { clientConnect, getProxiedClient } from '../client/index'
import { getCredentials, setupInternals } from '../utils/internals'

export interface ClientApiEvents extends ChatNamespace.BaseChatApiEvents {}

export interface ClientFullState extends ChatClient {}
interface ClientMain
  extends ChatContract,
    Omit<ConsumerContract<ClientApiEvents, ClientFullState>, 'subscribe'> {}

interface ClientDocs extends ClientMain {}

export interface ChatClient extends AssertSameType<ClientMain, ClientDocs> {}

export interface ChatClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

const ChatClient = function (options?: ChatClientOptions) {
  if ('production' === process.env.NODE_ENV) {
    getLogger().warn(
      '`Chat` is still under development and may change in the future without prior notice.'
    )
  }

  const credentials = getCredentials({
    token: options?.token,
    project: options?.project,
  })
  const { emitter, store } = setupInternals({
    ...options,
    ...credentials,
  })
  const client = getProxiedClient({
    ...options,
    ...credentials,
    emitter,
    store,
  })

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
  const subscribe: ChatClient['subscribe'] = async (channels) => {
    await clientConnect(client)

    return chat.subscribe(channels)
  }
  const publish: ChatClient['publish'] = async (params) => {
    await clientConnect(client)

    return chat.publish(params)
  }

  return new Proxy<ChatClient>(chat, {
    get(target: ChatClient, prop: keyof ChatClient, receiver: any) {
      if (prop === 'on') {
        return chatOn
      } else if (prop === 'once') {
        return chatOnce
      } else if (prop === 'subscribe') {
        return subscribe
      } else if (prop === 'publish') {
        return publish
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: ChatClientOptions): ChatClient }

export { ChatClient as Client }
