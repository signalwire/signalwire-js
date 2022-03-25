import {
  VoiceCallDeviceParams,
  VoiceCallDialMethodParams,
} from '@signalwire/core'

const toInternalDevice = (device: VoiceCallDeviceParams) => {
  switch (device.type) {
    case 'sip':
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

export const toInternalDevices = (
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
