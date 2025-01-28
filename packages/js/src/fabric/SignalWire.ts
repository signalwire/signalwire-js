import { HTTPClient } from './HTTPClient'
import { Conversation } from './Conversation'
import { SignalWireClient, SignalWireClientParams } from './interfaces'
import { WSClient } from './WSClient'

export const SignalWire = (() => {
  let instance: Promise<SignalWireClient> | null = null

  return (params: SignalWireClientParams): Promise<SignalWireClient> => {
    if (!instance) {
      instance = new Promise<SignalWireClient>(async (resolve, reject) => {
        try {
          const wsClient = new WSClient(params)
          const httpClient = new HTTPClient(params)
          const conversation = new Conversation({ httpClient, wsClient })

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
