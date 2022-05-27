import type { Twilio, TwimlInterface } from 'twilio'
import * as webhookTools from 'twilio/lib/webhooks/webhooks'
import TwilioClient from 'twilio/lib/rest/Twilio'
import type { CompatibilityAPIRestClientOptions } from './src/types'

declare class RestClient extends Twilio {
  constructor(
    username: string,
    token: string,
    opts?: CompatibilityAPIRestClientOptions
  )
}

declare class FaxResponse {
  constructor()
  receive(attributes?: FaxResponse.ReceiveAttributes): void
  toString(): string
  reject(): void
}

declare namespace FaxResponse {
  type ReceiveMediaType = 'application/pdf' | 'image/tiff'
  type ReceivePageSize = 'letter' | 'legal' | 'a4'
  export interface ReceiveAttributes {
    action?: string
    mediaType?: ReceiveMediaType
    method?: string
    pageSize?: ReceivePageSize
    storeMedia?: boolean
  }
}

interface TwimlConstructor<T> {
  new (): T
}

declare namespace RestClient {
  export interface RestClientLaMLInterface extends TwimlInterface {
    FaxResponse: TwimlConstructor<FaxResponse>
  }

  export import Twilio = TwilioClient
  export const jwt: JwtInterface
  export const RequestClient: RequestClient
  export const validateRequest: typeof webhookTools.validateRequest
  export const validateRequestWithBody: typeof webhookTools.validateRequestWithBody
  export const validateExpressRequest: typeof webhookTools.validateExpressRequest
  export const webhook: typeof webhookTools.webhook
  export const LaML: RestClientLaMLInterface
}

export = RestClient
