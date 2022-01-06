import type { ChatPublishParams, ChatJSONRPCMethod } from '../types/chat'
import type { BaseChatConsumer } from './BaseChat'
import type { ExecuteExtendedOptions } from '../utils/interfaces'
import { toExternalJSON } from '../utils'
import { toInternalChatChannels, isValidChannels } from './utils'

interface ChatMethodPropertyDescriptor<T, ParamsType>
  extends PropertyDescriptor {
  value: (params: ParamsType) => Promise<T>
}
type ChatMethodParams = Record<string, unknown>
type ChatMethodDescriptor<
  T = unknown,
  ParamsType = ChatMethodParams
> = ChatMethodPropertyDescriptor<T, ParamsType> & ThisType<BaseChatConsumer>

const createChatMethod = <InputType, OutputType = InputType>(
  method: ChatJSONRPCMethod,
  options: ExecuteExtendedOptions<InputType, OutputType> = {}
): ChatMethodDescriptor<OutputType> => ({
  value: function (params: ChatMethodParams = {}): Promise<OutputType> {
    const channels = isValidChannels(params?.channels)
      ? toInternalChatChannels(params.channels)
      : undefined

    return this.execute(
      {
        method,
        params: {
          ...params,
          channels,
        },
      },
      options
    )
  },
})

/**
 * Type the params for each chat method that requires a memberId.
 * Additional params can be passed.
 */
interface ChatMemberMethodParams {
  memberId?: string
  [key: string]: unknown
}

const createChatMemberMethod = <InputType, OutputType = InputType>(
  method: ChatJSONRPCMethod,
  options: ExecuteExtendedOptions<InputType, OutputType> = {}
): ChatMethodDescriptor<OutputType> => ({
  value: function ({ memberId, ...rest }: ChatMemberMethodParams = {}) {
    const channels = isValidChannels(rest?.channels)
      ? toInternalChatChannels(rest.channels)
      : undefined

    return this.execute(
      {
        method,
        params: {
          member_id: memberId,
          ...rest,
          channels,
        },
      },
      options
    )
  },
})

/**
 * Chat Methods
 */
export const publish = createChatMethod<ChatPublishParams>('chat.publish')
export const getMessages = createChatMethod<{ messages: any[]; cursor: any }>(
  'chat.messages.get',
  {
    transformResolve: (payload) => ({
      messages: payload.messages.map((message) => toExternalJSON(message)),
      cursor: payload.cursor,
    }),
  }
)
export const getMembers = createChatMethod<{ members: any[] }>(
  'chat.members.get',
  {
    transformResolve: (payload) => ({
      members: payload.members.map((member) => toExternalJSON(member)),
    }),
  }
)
export const setState = createChatMethod<any, void>('chat.presence.set_state', {
  transformResolve: () => {},
})

/**
 * Chat Member Methods
 */
export const getState = createChatMemberMethod<{ channels: any }>(
  'chat.presence.get_state',
  {
    transformResolve: (payload) => ({ channels: payload.channels }),
  }
)
