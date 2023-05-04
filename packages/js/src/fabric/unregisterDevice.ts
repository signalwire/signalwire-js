import { createHttpClient } from './httpClient'

interface UnregisterDeviceParams {
  host?: string
  accessToken: string
  id: string
}

export const unregisterDevice = async ({
  host = 'fabric.signalwire.com',
  accessToken,
  id,
}: UnregisterDeviceParams) => {
  const path = `/subscriber/devices/${id}` as const

  const client = createHttpClient({
    baseUrl: `https://${host}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return await client<any>(path, {
    method: 'DELETE',
  })
}
