import {
  BaseRPCResult,
  ExecuteExtendedOptions,
  uuid,
  VoiceCallDeviceParams,
  VoiceCallDialMethodParams,
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

const createCallMethod = <InputType, OutputType, ParamsType>(
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

const toInternalDevice = (device: VoiceCallDeviceParams) => {
  switch (device.type) {
    case 'phone': {
      const { to, from, type, ...rest } = device
      return {
        type,
        params: {
          ...rest,
          to_number: to,
          from_number: from,
        },
      }
    }

    // TODO: handle other devices
  }

  return device
}

// TODO: add proper to internal mapping
type ToInternalDialParams<T> = T extends any ? any : any

const toInternalDevices = (
  params: VoiceCallDialMethodParams['devices'],
  internalDevices: ToInternalDialParams<
    VoiceCallDialMethodParams['devices']
  > = []
) => {
  params.forEach((dev, index) => {
    if (Array.isArray(dev)) {
      internalDevices[index] = toInternalDevices(dev)
    } else {
      internalDevices[index] = toInternalDevice(dev)
    }
  })
  return internalDevices
}

/**
 * Call Methods
 */
// TODO: define InputType/OutputType
export const callDial = createCallMethod<
  BaseRPCResult,
  BaseRPCResult,
  VoiceCallDialMethodParams
>('calling.dial', {
  transformParams: (params: VoiceCallDialMethodParams) => {
    return {
      ...params,
      tag: uuid(),
      devices: toInternalDevices(params.devices),
    }
  },
  // TODO: define transformResolve
  transformResolve: (params) => params,
})

export type CallDial = ReturnType<typeof callDial.value>

// TODO: add types
export const callHangup = createCallMethod<any, any, any>('calling.hangup', {
  transformResolve: baseCodeTransform,
})

export type CallHangup = ReturnType<typeof callHangup.value>
