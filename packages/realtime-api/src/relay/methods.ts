import type { JSONRPCMethod, ExecuteExtendedOptions } from '@signalwire/core'
import type { BaseTasking } from './tasking/Tasking'

interface RelayMethodPropertyDescriptor<T, ParamsType>
  extends PropertyDescriptor {
  value: (params: ParamsType) => Promise<T>
}
type RelayMethodParams = Record<string, unknown>
type RelayMethodDescriptor<
  T = unknown,
  ParamsType = RelayMethodParams
> = RelayMethodPropertyDescriptor<T, ParamsType> & ThisType<BaseTasking>

const createRelayMethod = <InputType, OutputType = InputType>(
  method: JSONRPCMethod,
  options: ExecuteExtendedOptions<InputType, OutputType> = {}
): RelayMethodDescriptor<OutputType> => ({
  value: function (params: RelayMethodParams = {}): Promise<OutputType> {
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

type ContextsParams = { contexts: string[] }
/**
 * Relay Methods
 */
export const receive = createRelayMethod<ContextsParams, void>(
  'signalwire.receive'
)
export const unreceive = createRelayMethod<ContextsParams, void>(
  'signalwire.unreceive'
)
