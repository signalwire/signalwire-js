import { createHttpClient } from './httpClient'
import { buildCall } from './buildCall'

interface ClientOptions {
  host?: string
  accessToken: string
}

export class Client {
  private httpClient: ReturnType<typeof createHttpClient>

  constructor(public options: ClientOptions) {
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

  async createCall({
    uri,
    ...userParams
  }: {
    uri: string
    rootElement: HTMLElement
  }) {
    const path = '/call' as const
    const { body } = await this.httpClient<any>(path, {
      method: 'POST',
      body: { uri },
    })

    console.log('Dial Response', body)
    return buildCall({
      ...body,
      userParams: {
        host: this.host.includes('swire') ? 'relay.swire.io' : undefined,
        ...userParams,
      },
    })
  }
}
