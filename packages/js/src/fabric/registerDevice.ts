import { createHttpClient } from './httpClient'

interface RegisterDeviceParams {
  host?: string
  accessToken: string
  deviceType: 'iOS' | 'Android' | 'Desktop'
  deviceToken: string
}

export const registerDevice = async ({
  host = 'fabric.signalwire.com',
  deviceType,
  deviceToken,
  accessToken,
}: RegisterDeviceParams) => {
  const path = '/subscriber/devices' as const

  const client = createHttpClient({
    baseUrl: `https://${host}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const { body } = await client<any>(path, {
    method: 'POST',
    body: {
      device_type: deviceType,
      device_token: deviceToken,
    },
  })

  return body
}
