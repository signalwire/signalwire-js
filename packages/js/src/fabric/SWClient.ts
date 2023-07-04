import { createHttpClient } from './createHttpClient'

interface SWClientOptions {
  httpHost?: string
  accessToken: string
  rootElement?: HTMLElement
}

interface RegisterDeviceParams {
  deviceType: 'iOS' | 'Android' | 'Desktop'
  deviceToken: string
}

// TODO: extends from a Base class to share from core
export class SWClient {
  private httpClient: ReturnType<typeof createHttpClient>

  constructor(public options: SWClientOptions) {
    this.httpClient = createHttpClient({
      baseUrl: `https://${this.httpHost}`,
      headers: {
        Authorization: `Bearer ${this.options.accessToken}`,
      },
    })
  }

  get httpHost() {
    return this.options.httpHost ?? 'fabric.signalwire.com'
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
