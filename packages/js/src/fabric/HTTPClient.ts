import {
  getLogger,
  type Address,
  type PaginatedResponse,
  type FetchAddressResponse,
  type GetAddressesOptions,
  type UserOptions,
  type SubscriberInfoResponse,
} from '@signalwire/core'
import { createHttpClient } from './createHttpClient'
import jwtDecode from 'jwt-decode'

type JWTHeader = { ch?: string; typ?: string }

interface RegisterDeviceParams {
  deviceType: 'iOS' | 'Android' | 'Desktop'
  deviceToken: string
}

// TODO: extends from a Base class to share from core
export class HTTPClient {
  private httpClient: ReturnType<typeof createHttpClient>

  constructor(public options: UserOptions) {
    this.httpClient = createHttpClient({
      baseUrl: `https://${this.httpHost}`,
      headers: {
        Authorization: `Bearer ${this.options.token}`,
      },
    })
  }

  get fetch(): ReturnType<typeof createHttpClient> {
    return this.httpClient
  }

  private async _anotherPage<T>(url: string) {
    const { body } = await this.httpClient<PaginatedResponse<T>>(url)
    return this._buildPaginatedResult(body)
  }

  private async _buildPaginatedResult<T>(body: PaginatedResponse<T>) {
    return {
      addresses: body.data,
      nextPage: async () => {
        const { next } = body.links
        return next ? this._anotherPage(next) : undefined
      },
      prevPage: async () => {
        const { prev } = body.links
        return prev ? this._anotherPage(prev) : undefined
      },
      firstPage: async () => {
        const { first } = body.links
        return first ? this._anotherPage(first) : undefined
      },
      hasNext: Boolean(body.links.next),
      hasPrev: Boolean(body.links.prev),
    }
  }

  get httpHost() {
    let decodedJwt: JWTHeader = {}
    try {
      decodedJwt = jwtDecode<JWTHeader>(this.options.token, {
        header: true,
      })
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        getLogger().debug('[JWTSession] error decoding the JWT')
      }
    }
    const host = this.options.host || decodedJwt?.ch
    if (!host) {
      return 'fabric.signalwire.com'
    }
    return `fabric.${host.split('.').splice(1).join('.')}`
  }

  public async fetchSubscriberInfo() {
    const { body } = await this.httpClient<SubscriberInfoResponse>(
      'https://dev.swire.io/api/fabric/subscriber/info'
    )
    return body
  }

  public async getAddresses(options?: GetAddressesOptions) {
    const { type, displayName } = options || {}

    let path = '/addresses' as const

    if (type || displayName) {
      const queryParams = new URLSearchParams()

      if (type) {
        queryParams.append('type', type)
      }

      if (displayName) {
        queryParams.append('display_name', displayName)
      }

      path += `?${queryParams.toString()}`
    }

    const { body } = await this.httpClient<FetchAddressResponse>(path)

    return this._buildPaginatedResult<Address>(body)
  }

  public async registerDevice({
    deviceType,
    deviceToken,
  }: RegisterDeviceParams) {
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

  public async unregisterDevice({ id }: { id: string }) {
    const path = `/subscriber/devices/${id}` as const
    return await this.httpClient<any>(path, {
      method: 'DELETE',
    })
  }
}
