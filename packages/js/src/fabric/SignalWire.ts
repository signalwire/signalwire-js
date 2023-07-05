import { type UserOptions } from '@signalwire/core'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'

interface SignalWireOptions extends UserOptions {
  rootElement?: HTMLElement
}

interface SignalWireContract {
  httpHost: HTTPClient['httpHost']
  getAddresses: HTTPClient['getAddresses']
  registerDevice: HTTPClient['registerDevice']
  unregisterDevice: HTTPClient['unregisterDevice']
  dial: WSClient['dial']
  handlePushNotification: WSClient['handlePushNotification']
}

export const SignalWire = (
  options: SignalWireOptions
): Promise<SignalWireContract> => {
  return new Promise(async (resolve, reject) => {
    try {
      const httpClient = new HTTPClient(options)
      const wsClient = new WSClient(options)

      resolve({
        httpHost: httpClient.httpHost,
        getAddresses: httpClient.getAddresses,
        registerDevice: httpClient.registerDevice,
        unregisterDevice: httpClient.unregisterDevice,
        dial: wsClient.dial,
        handlePushNotification: wsClient.handlePushNotification,
      })
    } catch (error) {
      reject(error)
    }
  })
}
