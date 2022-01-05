import type {
  ChatPublishParams,
  ChatSetStateParams,
  ChatJSONRPCMethod,
  InternalChatChannel,
} from '../types/chat'
import type { BaseChatConsumer } from './BaseChat'
import type { ExecuteExtendedOptions } from '../utils/interfaces'
import { toInternalChatChannels, toExternalJSON } from '../utils'

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
    let channels: InternalChatChannel[] | undefined = undefined
    if (params?.channels) {
      // @ts-expect-error
      channels = toInternalChatChannels(params.channels)
    }

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
    let channels: InternalChatChannel[] | undefined = undefined
    if (rest?.channels) {
      // @ts-expect-error
      channels = toInternalChatChannels(rest.channels)
    }

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
export const setState = createChatMethod<ChatSetStateParams>(
  'chat.presence.set_state'
)

/**
 * Chat Member Methods
 */
export const getState = createChatMemberMethod<{ channels: any }>(
  'chat.presence.get_state',
  {
    transformResolve: (payload) => ({ channels: payload.channels }),
  }
)
