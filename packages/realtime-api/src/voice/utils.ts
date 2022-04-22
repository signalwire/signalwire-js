import {
  VoiceCallDeviceParams,
  VoiceCallDialMethodParams,
  VoiceCallPlayParams,
  VoiceCallPlayMethodParams,
  CreateVoiceDialerParams,
  VoiceDialer,
  toSnakeCaseKeys,
} from '@signalwire/core'

const toInternalDevice = (device: VoiceCallDeviceParams) => {
  switch (device.type) {
    case 'sip': {
      const { type, ...params } = device
      return {
        type,
        params: toSnakeCaseKeys(params),
      }
    }
    case 'phone': {
      const { to, from, type, ...rest } = device
      return {
        type,
        params: toSnakeCaseKeys({
          ...rest,
          to_number: to,
          from_number: from,
        }),
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

const toInternalPlay = (media: VoiceCallPlayParams) => {
  const { type, ...params } = media
  return { type, params }
}

// TODO: add proper to internal mapping
type ToInternalPlayParams<T> = T extends any ? any : any

export const toInternalPlayParams = (
  params: VoiceCallPlayMethodParams['media'],
  result: ToInternalPlayParams<VoiceCallPlayMethodParams['media']> = []
) => {
  params.forEach((media, index) => {
    if (Array.isArray(media)) {
      result[index] = toInternalPlayParams(media)
    } else {
      result[index] = toInternalPlay(media)
    }
  })
  return result
}

export const createDialer = (params: CreateVoiceDialerParams = {}) => {
  const devices: VoiceDialer['devices'] = []

  const dialer: VoiceDialer = {
    ...params,
    devices,
    addPhone(params) {
      devices.push([{ type: 'phone', ...params }])
      return dialer
    },
    addSip(params) {
      devices.push([{ type: 'sip', ...params }])
      return dialer
    },
    inParallel(dialer) {
      const parallel = dialer.devices.map((row) => {
        if (Array.isArray(row)) {
          return row[0]
        }
        return row
      })
      devices.push(parallel)

      return dialer
    },
  }

  return dialer
}
