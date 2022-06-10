import twilio from 'twilio'
import { getHost, Reject } from './helpers'
import type { Twilio, TwimlInterface, JwtInterface } from 'twilio'
import type { CompatibilityAPIRestClientOptions } from './types'

twilio.twiml.FaxResponse.prototype.reject = function (attributes: any) {
  // @ts-expect-error
  return new Reject(this.response.ele('Reject', attributes))
}

/**
 * TBD:
 * @remarks See compatibility-api.d.ts for types
 */
const RestClient = function (
  username: string,
  token: string,
  opts?: CompatibilityAPIRestClientOptions
): Twilio {
  const host = getHost(opts)
  // "AC" prefix because twilio-node requires it
  const client = twilio('AC' + username, token, opts)
  // @ts-ignore
  // Remove "AC" prefix
  client.username = username
  // @ts-ignore
  client.accountSid = username
  // @ts-ignore
  client.password = token

  // @ts-ignore
  // Replace base url
  client.api.baseUrl = `https://${host}`

  // @ts-ignore
  client.fax.baseUrl = `https://${host}`
  // @ts-ignore
  client.fax.v1._version = `2010-04-01/Accounts/${client.accountSid}`

  return client
}

// Define old properties
const properties = Object.getOwnPropertyNames(twilio)
for (let i = 0; i < properties.length; i++) {
  const newProp = properties[i] === 'twiml' ? 'LaML' : properties[i]
  Object.defineProperty(RestClient, newProp, {
    // @ts-expect-error
    value: twilio[properties[i]],
  })
}

export { RestClient }

export type {
  CompatibilityAPIRestClientOptions,
  Twilio,
  TwimlInterface,
  JwtInterface,
}
