import { HTTPClient } from './HTTPClient'
import { Conversation } from './Conversation'
import { SignalWireContract, SignalWireClientParams } from './interfaces'
import { WSClient } from './WSClient'

export const SignalWire = (
  params: SignalWireClientParams
): Promise<SignalWireContract> => {
  return new Promise(async (resolve, reject) => {
    try {
      const httpClient = new HTTPClient(params)
      const wsClient = new WSClient(params)
      const conversation = new Conversation({ httpClient, wsClient })

      // Connect the WebSocket and Authenticate the user
      await wsClient.connect()

      resolve({
        httpHost: httpClient.httpHost,
        registerDevice: httpClient.registerDevice.bind(httpClient),
        unregisterDevice: httpClient.unregisterDevice.bind(httpClient),
        getSubscriberInfo: httpClient.getSubscriberInfo.bind(httpClient),
        disconnect: wsClient.disconnect.bind(wsClient),
        online: wsClient.online.bind(wsClient),
        offline: wsClient.offline.bind(wsClient),
        dial: wsClient.dial.bind(wsClient),
        reattach: wsClient.reattach.bind(wsClient),
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
