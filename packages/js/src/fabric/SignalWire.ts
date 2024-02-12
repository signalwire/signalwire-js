import { type UserOptions } from '@signalwire/core'
import { HTTPClient } from './HTTPClient'
import { WSClient, WSClientOptions } from './WSClient'
import { Conversation } from './Conversation'

export interface SignalWireOptions extends UserOptions, WSClientOptions {}

export interface SignalWireContract {
  httpHost: HTTPClient['httpHost']
  getAddresses: HTTPClient['getAddresses']
  registerDevice: HTTPClient['registerDevice']
  unregisterDevice: HTTPClient['unregisterDevice']
  connect: WSClient['connect']
  disconnect: WSClient['disconnect']
  dial: WSClient['dial']
  handlePushNotification: WSClient['handlePushNotification']
  updateToken: WSClient['updateToken']
  conversation: {
    getConversations: Conversation['getConversations']
    subscribeToUpdates: Conversation['subscribeToUpdates']
  }
}

export const SignalWire = (
  options: SignalWireOptions
): Promise<SignalWireContract> => {
  return new Promise(async (resolve, reject) => {
    try {
      const httpClient = new HTTPClient(options)
      const wsClient = new WSClient(options)

      console.log('httpClient', httpClient)
      const conversation = new Conversation({ httpClient, wsClient })
      // await conversation.getConversationHistory({})

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
        conversation: {
          getConversations: conversation.getConversations.bind(conversation),
          subscribeToUpdates:
            conversation.subscribeToUpdates.bind(conversation),
        },
        // @ts-expect-error
        __httpClient: httpClient,
        __wsClient: wsClient,
      })
    } catch (error) {
      reject(error)
    }
  })
}
