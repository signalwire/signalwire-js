import type { ChatPublishParams, ChatInterface } from '../types/chat'
import { ExecuteExtendedOptions, ChatMethod } from '../utils/interfaces'

interface ChatMethodPropertyDescriptor<T, ParamsType>
  extends PropertyDescriptor {
  value: (params: ParamsType) => Promise<T>
}
type ChatMethodParams = Record<string, unknown>
type ChatMethodDescriptor<
  T = unknown,
  ParamsType = ChatMethodParams
> = ChatMethodPropertyDescriptor<T, ParamsType> & ThisType<ChatInterface>

const createChatMethod = <InputType, OutputType = InputType>(
  method: ChatMethod,
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
