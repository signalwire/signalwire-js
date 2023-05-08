import { createHttpClient } from './createHttpClient'

interface HTTPClientOptions {
  host?: string
  accessToken: string
}

interface RegisterDeviceParams {
  deviceType: 'iOS' | 'Android' | 'Desktop'
  deviceToken: string
}

export class HTTPClient {
  private httpClient: ReturnType<typeof createHttpClient>

  constructor(public options: HTTPClientOptions) {
    this.httpClient = createHttpClient({
      baseUrl: `https://${this.host}`,
      headers: {
        Authorization: `Bearer ${this.options.accessToken}`,
      },
    })
  }

  get host() {
    return this.options.host ?? 'fabric.signalwire.com'
  }

  async getAddresses() {
    const path = '/addresses' as const
    const { body } = await this.httpClient<any>(path)
    const anotherPage = async (url: string) => {
      const { search } = new URL(url)
      const { body } = await this.httpClient<any>(`${path}${search}`)
      return buildResult(body)
    }

    const buildResult = (body: any) => {
      return {
        addresses: body.data,
        nextPage: async () => {
          const { next } = body.links
          return next ? anotherPage(next) : undefined
        },
        prevPage: async () => {
          const { prev } = body.links
          return prev ? anotherPage(prev) : undefined
        },
      }
    }

    return buildResult(body)
  }

  async registerDevice({ deviceType, deviceToken }: RegisterDeviceParams) {
    const path = '/subscriber/devices' as const
    const { body } = await this.httpClient<any>(path, {
      method: 'POST',
      body: {
        device_type: deviceType,
        device_token: deviceToken,
      },
    })

    return body
  }

  async unregisterDevice({ id }: { id: string }) {
    const path = `/subscriber/devices/${id}` as const
    return await this.httpClient<any>(path, {
      method: 'DELETE',
    })
  }
}
