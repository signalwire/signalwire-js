import type { Twilio as TwilioClient, TwimlInterface } from 'twilio'
import type { CompatibilityAPIRestClientOptions } from './src/types'

declare function RestClient(
  username: string,
  token: string,
  opts?: CompatibilityAPIRestClientOptions
): Twilio

declare namespace RestClient {
  export import Twilio = TwilioClient
  export const jwt: JwtInterface
  export const twiml: TwimlInterface
  export const RequestClient: RequestClient
  export const validateRequest: typeof webhookTools.validateRequest
  export const validateRequestWithBody: typeof webhookTools.validateRequestWithBody
  export const validateExpressRequest: typeof webhookTools.validateExpressRequest
  export const webhook: typeof webhookTools.webhook
  export const LaML: TwimlInterface
}

export = RestClient
