import jwtDecode from 'jwt-decode'
import {
  getLogger,
  type Address,
  type FetchAddressResponse,
  type GetAddressesOptions,
  type UserOptions,
} from '@signalwire/core'
import { CreateHttpClient, createHttpClient } from './createHttpClient'
import { buildPaginatedResult } from '../utils/paginatedResult'

type JWTHeader = { ch?: string; typ?: string }

interface RegisterDeviceParams {
  deviceType: 'iOS' | 'Android' | 'Desktop'
  deviceToken: string
}

// TODO: extends from a Base class to share from core
export class HTTPClient {
  private httpClient: CreateHttpClient

  constructor(public options: UserOptions) {
    this.httpClient = createHttpClient({
      baseUrl: `https://${this.httpHost}`,
      headers: {
        Authorization: `Bearer ${this.options.token}`,
      },
    })
  }

  get fetch(): CreateHttpClient {
    return this.httpClient
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

    return buildPaginatedResult<Address>(body, this.httpClient)
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
