import type { PubSubJSONRPCMethod } from '../types/pubSub'
import type { BasePubSubConsumer } from './BasePubSub'
import type { ExecuteExtendedOptions, BaseRPCResult } from '../utils/interfaces'
import { PRODUCT_PREFIX_PUBSUB } from '../utils/constants'

type PubSubMethodParams = Record<string, unknown>

interface PubSubMethodPropertyDescriptor<OutputType, ParamsType>
  extends PropertyDescriptor {
  value: (params: ParamsType) => Promise<OutputType>
}
type PubSubMethodDescriptor<
  OutputType = unknown,
  ParamsType = PubSubMethodParams
> = PubSubMethodPropertyDescriptor<OutputType, ParamsType> &
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
  ParamsType extends PubSubMethodParams = PubSubMethodParams
>(
  method: PubSubJSONRPCMethod,
  options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
): PubSubMethodDescriptor<OutputType> => ({
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
export const publish = createPubSubMethod<BaseRPCResult, void>(
  `${PRODUCT_PREFIX_PUBSUB}.publish`,
  {
    transformResolve: baseCodeTransform,
  }
)
