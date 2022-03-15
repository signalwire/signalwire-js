import {
  BaseRPCResult,
  ExecuteExtendedOptions,
  VoiceCallJSONRPCMethod,
} from '@signalwire/core'
import { CallConsumer } from './Call'

type CallMethodParams = Record<string, unknown>

interface CallMethodPropertyDescriptor<OutputType, ParamsType>
  extends PropertyDescriptor {
  value: (params: ParamsType) => Promise<OutputType>
}

type CallMethodDescriptor<
  OutputType = unknown,
  ParamsType = CallMethodParams
> = CallMethodPropertyDescriptor<OutputType, ParamsType> &
  ThisType<CallConsumer>

/**
 * Transform for returning `undefined` for `execute`s that were
 * successully resolved. If the `execute` failed for some reason, then
 * the promise will be rejected and this transform will never be
 * executed.
 */
const baseCodeTransform = () => {}

const createCallMethod = <
  InputType,
  OutputType = InputType,
  ParamsType extends CallMethodParams = CallMethodParams
>(
  method: VoiceCallJSONRPCMethod,
  options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
): CallMethodDescriptor<OutputType, ParamsType> => ({
  value: function (params = {} as ParamsType): Promise<OutputType> {
    return this.execute(
      {
        method,
        // TODO: review required params
        params,
      },
      options
    )
  },
})

/**
 * Call Methods
 */
export const callDial = createCallMethod<BaseRPCResult, void>(
  'voice.call.dial',
  {
    transformResolve: baseCodeTransform,
  }
)

export type CallDial = ReturnType<typeof callDial.value>

export const callHangup = createCallMethod<BaseRPCResult, void>(
  'voice.call.hangup',
  {
    transformResolve: baseCodeTransform,
  }
)

export type CallHangup = ReturnType<typeof callHangup.value>
