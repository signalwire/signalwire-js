import type { Twilio, TwimlInterface, JwtInterface } from 'twilio'
import * as webhookTools from 'twilio/lib/webhooks/webhooks'
import TwilioClient from 'twilio/lib/rest/Twilio'
import type { CompatibilityAPIRestClientOptions } from './src/types'
import {
  CallListInstance,
  CallInstance,
  CallListInstanceCreateOptions,
} from 'twilio/lib/rest/api/v2010/account/call'

declare function RestClient(
  username: string,
  token: string,
  opts?: CompatibilityAPIRestClientOptions
): CompatibilityApi

interface CompatibilityApiCallListInstanceCreateOptions
  extends CallListInstanceCreateOptions {
  machineWordsThreshold?: number
}

interface CompatibilityApiCallListInstance extends CallListInstance {
  create(
    opts: CompatibilityApiCallListInstanceCreateOptions,
    callback?: (error: Error | null, item: CallInstance) => any
  ): Promise<CallInstance>
}

declare class CompatibilityApi extends Twilio {
  calls: CompatibilityApiCallListInstance
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

export { RestClient }
