import type {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
  Chat as ChatNamespace,
} from '@signalwire/core'
import { getLogger } from '@signalwire/core'
import { createClient } from '../createClient'
import { ClientDocs } from './Client.docs'

export interface ClientApiEvents extends ChatNamespace.BaseChatApiEvents {}

export interface ClientFullState extends Client {}
interface ClientMain
  extends ChatContract,
    Omit<ConsumerContract<ClientApiEvents, ClientFullState>, 'subscribe'> {}

export interface Client extends AssertSameType<ClientMain, ClientDocs> {}

export interface ClientOptions extends UserOptions {}

export const Client = function (chatOptions: ClientOptions) {
  if ('production' === process.env.NODE_ENV) {
    getLogger().warn(
      '`Chat` is still under development and may change in the future without prior notice.'
    )
  }

  const client = createClient<Client>(chatOptions)
  const subscribe: Client['subscribe'] = async (channels) => {
    await client.connect()

    return client.chat.subscribe(channels)
  }
  const publish: Client['publish'] = async (params) => {
    await client.connect()

    return client.chat.publish(params)
  }

  return new Proxy<Client>(client.chat, {
    get(target: Client, prop: keyof Client, receiver: any) {
      if (prop === 'subscribe') {
        return subscribe
      } else if (prop === 'publish') {
        return publish
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (chatOptions: ClientOptions): Client }
