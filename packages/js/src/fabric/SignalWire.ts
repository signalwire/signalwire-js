import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import { Conversation } from './Conversation'
import { SignalWireContract, SignalWireOptions } from './types'

export const SignalWire = (
  options: SignalWireOptions
): Promise<SignalWireContract> => {
  return new Promise(async (resolve, reject) => {
    try {
      const httpClient = new HTTPClient(options)
      const wsClient = new WSClient(options)

      const conversation = new Conversation({ httpClient, wsClient })

      resolve({
        httpHost: httpClient.httpHost,
        registerDevice: httpClient.registerDevice.bind(httpClient),
        unregisterDevice: httpClient.unregisterDevice.bind(httpClient),
        getSubscriberInfo: httpClient.getSubscriberInfo.bind(httpClient),
        connect: wsClient.connect.bind(wsClient),
        disconnect: wsClient.disconnect.bind(wsClient),
        online: wsClient.online.bind(wsClient),
        offline: wsClient.offline.bind(wsClient),
        dial: wsClient.dial.bind(wsClient),
        handlePushNotification: wsClient.handlePushNotification.bind(wsClient),
        updateToken: wsClient.updateToken.bind(wsClient),
        address: {
          getAddresses: httpClient.getAddresses.bind(httpClient),
          getAddress: httpClient.getAddress.bind(httpClient),
        },
        conversation: {
          getConversations: conversation.getConversations.bind(conversation),
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
        // @ts-expect-error
        __httpClient: httpClient,
        __wsClient: wsClient,
      })
    } catch (error) {
      reject(error)
    }
  })
}
