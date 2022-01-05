import type {
  ChatPublishParams,
  ChatSetStateParams,
  ChatJSONRPCMethod,
  InternalChatChannel,
} from '../types/chat'
import type { BaseChatConsumer } from './BaseChat'
import type { ExecuteExtendedOptions } from '../utils/interfaces'
import { toInternalChatChannels } from '../utils'

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
 * Type the params for each room member method that uses the provided
 * memberId or fallback to the instance memberId. Additional params
 * can be passed as `value` or `volume`.
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
          // FIXME: change to member_id after backend is deployed
          user_id: memberId,
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
export const setState = createChatMethod<ChatSetStateParams>(
  'chat.presence.set_state'
)

/**
 * Chat Member Methods
 */
export const getState = createChatMemberMethod<
  // FIXME: adjust types after backend is deployed
  { user_states: any },
  { channels: any }
>('chat.presence.get_state', {
  transformResolve: (payload) => ({ channels: payload.user_states }),
})
