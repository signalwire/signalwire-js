import { HTTPClient } from './HTTPClient'
import { SignalWireClient, SignalWireClientParams } from './interfaces'
import { WSClient } from './WSClient'
import {
  DEFAULT_API_REQUEST_RETRIES,
  DEFAULT_API_REQUEST_RETRIES_DELAY,
  DEFAULT_API_REQUEST_RETRIES_DELAY_INCREMENT,
} from './utils/constants'

export const SignalWire = (() => {
  let instance: Promise<SignalWireClient> | null = null

  return (params: SignalWireClientParams): Promise<SignalWireClient> => {
    if (!instance) {
      instance = new Promise<SignalWireClient>(async (resolve, reject) => {
        try {
          const options = {
            maxApiRequestRetries: DEFAULT_API_REQUEST_RETRIES,
            apiRequestRetriesDelay: DEFAULT_API_REQUEST_RETRIES_DELAY,
            apiRequestRetriesDelayIncrement:
              DEFAULT_API_REQUEST_RETRIES_DELAY_INCREMENT,
            ...params,
          }

          const wsClient = new WSClient(options)
          const httpClient = new HTTPClient(options)
          const conversationError = (method: string) => {
            return () => {
              throw new Error(
                `This version Conversation.${method} is unsupported by the backend. Use @signalwire/client instead.`
              )
            }
          }

          // Connect the WebSocket and authenticate the user
          await wsClient.connect()

          resolve({
            registerDevice: httpClient.registerDevice.bind(httpClient),
            unregisterDevice: httpClient.unregisterDevice.bind(httpClient),
            getSubscriberInfo: httpClient.getSubscriberInfo.bind(httpClient),
            disconnect: async () => {
              await wsClient.disconnect()
              instance = null // Reset the singleton instance on disconnect
            },
            online: wsClient.online.bind(wsClient),
            offline: wsClient.offline.bind(wsClient),
            dial: wsClient.dial.bind(wsClient),
            reattach: wsClient.reattach.bind(wsClient),
            handlePushNotification:
              wsClient.handlePushNotification.bind(wsClient),
            updateToken: wsClient.updateToken.bind(wsClient),
            address: {
              getAddresses: httpClient.getAddresses.bind(httpClient),
              getAddress: httpClient.getAddress.bind(httpClient),
            },
            conversation: {
              getConversations: conversationError(
                'getConversations'),
              getMessages: conversationError(
                'getMessages'),
              getConversationMessages: conversationError(
                'getConversationMessages'),
              subscribe: conversationError(
                'subscribe'),
              sendMessage: conversationError(
                'sendMessage'),
              join: conversationError(
                'join'),
            },
            chat: {
              getMessages: conversationError(
                'getMessages'),
              subscribe: conversationError(
                'subscribe'),
              sendMessage: conversationError(
                'sendMessage'),
              join: conversationError(
                'join'),
            },
            // @ts-expect-error For debugging purposes
            on: wsClient.on.bind(wsClient),
            off: wsClient.off.bind(wsClient),
            __httpClient: httpClient,
            __wsClient: wsClient,
          })
        } catch (error) {
          reject(error)
        }
      }).catch((error) => {
        /**
         * Reset the instance to null explicitly since
         * Promises are immutable: once rejected, a Promise remains rejected forever.
         */
        instance = null
        throw error
      })
    }
    return instance
  }
})()
