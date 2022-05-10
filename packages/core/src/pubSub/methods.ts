import type {
  ChatJSONRPCMethod,
} from '../types/chat'
import type { BasePubSubConsumer } from './BasePubSub'
import type { ExecuteExtendedOptions, BaseRPCResult } from '../utils/interfaces'

type ChatMethodParams = Record<string, unknown>

interface ChatMethodPropertyDescriptor<OutputType, ParamsType>
  extends PropertyDescriptor {
  value: (params: ParamsType) => Promise<OutputType>
}
type ChatMethodDescriptor<
  OutputType = unknown,
  ParamsType = ChatMethodParams
> = ChatMethodPropertyDescriptor<OutputType, ParamsType> &
  ThisType<BasePubSubConsumer>

/**
 * Transform for returning `undefined` for `execute`s that were
 * successully resolved. If the `execute` failed for some reason, then
 * the promise will be rejected and this transform will never be
 * executed.
 */
const baseCodeTransform = () => {}

const createPubSubMethod = <
  InputType,
  OutputType = InputType,
  ParamsType extends ChatMethodParams = ChatMethodParams
>(
  method: ChatJSONRPCMethod,
  options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
): ChatMethodDescriptor<OutputType> => ({
  value: function (params = {}): Promise<OutputType> {
    return this.execute(
      {
        method,
        params,
      },
      options
    )
  },
})

/**
 * PubSub Methods
 */
export const publish = createPubSubMethod<BaseRPCResult, void>('chat.publish', {
  transformResolve: baseCodeTransform,
})

