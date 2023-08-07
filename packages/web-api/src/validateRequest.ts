import { createHmac } from 'node:crypto'
import { RestClient } from '@signalwire/compatibility-api'

/**
 * Utility function to validate an incoming request is indeed from SignalWire
 *
 * @param {string} privateKey - The "SIGNING KEY", as seen in the SignalWire API page
 * @param {string} header - The value of the X-SignalWire-Signature header from the request
 * @param {string} url - The full URL (with query string) you configured to handle this request
 * @param {string} rawBody - The raw body of the request (JSON string)
 * @returns {boolean} - Whether the request is valid or not
 */
export const validateRequest = (
  privateKey: string,
  header: string,
  url: string,
  rawBody: string
): boolean => {
  if (typeof rawBody !== 'string') {
    throw new TypeError(
      `"rawBody" is not a string. You may need to JSON.stringify the request body.`
    )
  }
  const hmac = createHmac('sha1', privateKey)
  hmac.update(`${url}${rawBody}`)
  const valid = hmac.digest('hex') === header

  if (valid) {
    return true
  }

  const parsedBody = JSON.parse(rawBody)
  // @ts-expect-error - add suppressWarning: true
  return RestClient.validateRequest(privateKey, header, url, parsedBody, true)
}
