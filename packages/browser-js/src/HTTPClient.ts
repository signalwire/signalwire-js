import jwtDecode from 'jwt-decode'
import { getLogger, HttpError } from '@signalwire/core'
import type {
  GetAddressResponse,
  GetAddressesParams,
  RegisterDeviceParams,
  UnregisterDeviceParams,
  RegisterDeviceResponse,
  GetAddressParams,
  GetAddressResult,
  GetAddressesResponse,
  GetAddressesResult,
  RegisterDeviceResult,
  GetSubscriberInfoResponse,
  GetSubscriberInfoResult,
  FabricUserOptions,
} from './interfaces'
import { CreateHttpClient, createHttpClient } from './createHttpClient'
import { buildPaginatedResult } from './utils/paginatedResult'
import { makeQueryParamsUrls } from '@signalwire/browser-common'
import {
  isGetAddressByIdParams,
  isGetAddressByNameParams,
  isGetAddressesResponse,
} from './utils/typeGuard'
import { HTTPClientContract } from './interfaces/httpClient'

type JWTHeader = { ch?: string; typ?: string }

// TODO: extends from a Base class to share from core
export class HTTPClient implements HTTPClientContract {
  private httpClient: CreateHttpClient

  constructor(public options: FabricUserOptions) {
    this.httpClient = createHttpClient({
      baseUrl: `https://${this.httpHost}`,
      headers: {
        Authorization: `Bearer ${this.options.token}`,
      },
      maxApiRequestRetries: this.options.maxApiRequestRetries,
      apiRequestRetriesDelay: this.options.apiRequestRetriesDelay,
      apiRequestRetriesDelayIncrement: this.options.apiRequestRetriesDelayIncrement
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
    // Shouldn't this be other way around?
    const host = this.options.host || decodedJwt?.ch
    if (!host) {
      return 'fabric.signalwire.com'
    }
    return `fabric.${host.split('.').splice(1).join('.')}`
  }

  public async getAddress(params: GetAddressParams): Promise<GetAddressResult> {
    let path = '/api/fabric/addresses'
    if (isGetAddressByNameParams(params)) {
      path = `${path}?name=${params.name}`
    } else if (isGetAddressByIdParams(params)) {
      path = `${path}/${params.id}`
    }

    const { body } = await this.httpClient<
      GetAddressResponse | GetAddressesResponse
    >(path)
    if (isGetAddressesResponse(body)) {
      // FIXME until the server handles a index lookup by name we need to handle it as a search result
      if (!body.data[0]) throw new HttpError(404, 'Not Found')
      return body.data[0]
    }
    return body
  }

  public async getAddresses(
    params?: GetAddressesParams
  ): Promise<GetAddressesResult> {
    const { type, displayName, pageSize, sortBy, sortOrder } = params || {}

    let path = '/api/fabric/addresses'

    const queryParams = new URLSearchParams()
    if (type) {
      queryParams.append('type', type)
    }
    if (displayName) {
      queryParams.append('display_name', displayName)
    }
    if (pageSize) {
      queryParams.append('page_size', pageSize.toString())
    }

    if (sortBy) {
      queryParams.append('sort_by', sortBy)
    }

    if (sortOrder) {
      queryParams.append('sort_order', sortOrder)
    }

    const queryUrl = makeQueryParamsUrls(path, queryParams)
    getLogger().debug(`[getAddresses] query URL ${queryUrl}`)
    const { body } = await this.httpClient<GetAddressesResponse>(queryUrl)

    return buildPaginatedResult(body, this.httpClient)
  }

  public async registerDevice(
    params: RegisterDeviceParams
  ): Promise<RegisterDeviceResult> {
    const { deviceType, deviceToken } = params

    const path = '/subscriber/devices' as const
    const { body } = await this.httpClient<RegisterDeviceResponse>(path, {
      method: 'POST',
      body: {
        device_type: deviceType,
        device_token: deviceToken,
      },
    })

    return body
  }

  public async unregisterDevice(params: UnregisterDeviceParams) {
    const { id } = params

    const path = `/subscriber/devices/${id}` as const
    await this.httpClient<void>(path, {
      method: 'DELETE',
    })
  }

  public async getSubscriberInfo(): Promise<GetSubscriberInfoResult> {
    let path = '/api/fabric/subscriber/info'

    const { body } = await this.httpClient<GetSubscriberInfoResponse>(path)

    return body
  }
}
