import { HTTPClient } from './HTTPClient'
import { Conversation } from './Conversation'
import { SignalWireClientParamsV4, SignalWireClientV4 } from './interfaces'
import { WSClientV4 } from './WSClientV4'
import {
  DEFAULT_API_REQUEST_RETRIES,
  DEFAULT_API_REQUEST_RETRIES_DELAY,
  DEFAULT_API_REQUEST_RETRIES_DELAY_INCREMENT,
} from './utils/constants'

export const SignalWireV4 = (() => {
  let instance: Promise<SignalWireClientV4> | null = null

  return (params: SignalWireClientParamsV4) => {
    if (!instance) {
      instance = new Promise<SignalWireClientV4>(async (resolve, reject) => {
        try {
          if (!params.token) {
            throw new Error('Token is required')
          }

          const options = {
            maxApiRequestRetries: DEFAULT_API_REQUEST_RETRIES,
            apiRequestRetriesDelay: DEFAULT_API_REQUEST_RETRIES_DELAY,
            apiRequestRetriesDelayIncrement:
              DEFAULT_API_REQUEST_RETRIES_DELAY_INCREMENT,
            ...params,
          }

          const wsClient = new WSClientV4(options)
          const httpClient = new HTTPClient(options)
          const conversation = new Conversation({ httpClient, wsClient })

          // Connect the WebSocket and authenticate the user
          await wsClient.connect()

          resolve({
            get authState() {
              return wsClient.authState
            },
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
              getConversations:
                conversation.getConversations.bind(conversation),
              getMessages: conversation.getMessages.bind(conversation),
              getConversationMessages:
                conversation.getConversationMessages.bind(conversation),
              subscribe: conversation.subscribe.bind(conversation),
              sendMessage: conversation.sendMessage.bind(conversation),
              join: conversation.joinConversation.bind(conversation),
            },
            chat: {
              getMessages: conversation.getChatMessages.bind(conversation),
              subscribe: conversation.subscribeChatMessages.bind(conversation),
              sendMessage: conversation.sendMessage.bind(conversation),
              join: conversation.joinConversation.bind(conversation),
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
