import { buildCall } from './buildCall'

interface WSClientOptions {
  host?: string
  token: string
  rootElement?: HTMLElement
}

export class WSClient {
  constructor(public options: WSClientOptions) {}

  async dial(params: { to: string }) {
    console.log('WSClient dial with:', params)

    return buildCall({
      strategy: 'room',
      params: {
        token: this.options.token,
      },
      userParams: {
        // @ts-expect-error
        host: this.options.host,
        ...params,
      },
    })
  }
}
