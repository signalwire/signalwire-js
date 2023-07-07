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
  connect: WSClient['connect']
  disconnect: WSClient['disconnect']
  dial: WSClient['dial']
  handlePushNotification: WSClient['handlePushNotification']
  updateToken: WSClient['updateToken']
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
        getAddresses: httpClient.getAddresses.bind(httpClient),
        registerDevice: httpClient.registerDevice.bind(httpClient),
        unregisterDevice: httpClient.unregisterDevice.bind(httpClient),
        connect: wsClient.connect.bind(wsClient),
        disconnect: wsClient.disconnect.bind(wsClient),
        dial: wsClient.dial.bind(wsClient),
        handlePushNotification: wsClient.handlePushNotification.bind(wsClient),
        updateToken: wsClient.updateToken.bind(wsClient),
        // @ts-expect-error
        __httpClient: httpClient,
        __wsClient: wsClient,
      })
    } catch (error) {
      reject(error)
    }
  })
}
