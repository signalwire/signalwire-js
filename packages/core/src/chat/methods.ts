import type { ChatPublishParams, ChatJSONRPCMethod } from '../types/chat'
import type { BaseChatConsumer } from './BaseChat'
import type { ExecuteExtendedOptions } from '../utils/interfaces'

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
    return this.execute(
      {
        method,
        params: {
          ...params,
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
