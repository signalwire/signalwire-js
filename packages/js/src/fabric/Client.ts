import { createHttpClient } from './httpClient'

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
    const path = '/api/fabric/addresses' as const
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

  async dial(params: { uri: string; rootElement: HTMLElement }) {
    const path = '/api/fabric/call' as const
    const { body } = await this.httpClient<any>(path, {
      method: 'POST',
      body: { uri: params.uri },
    })

    console.log('Dial Response', body)
  }
}
