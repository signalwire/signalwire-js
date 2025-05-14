import { HTTPClient } from '../HTTPClient'
import { Conversation } from '../Conversation'
import { SignalWireClient, SignalWireClientParams } from '../interfaces'
import {
  DEFAULT_API_REQUEST_RETRIES,
  DEFAULT_API_REQUEST_RETRIES_DELAY,
  DEFAULT_API_REQUEST_RETRIES_DELAY_INCREMENT,
} from '../utils/constants'
import { WSClientV4 } from './WSClientV4'

export const SignalWireV4 = (
  params: SignalWireClientParams
): Promise<SignalWireClient> => {
  return new Promise(async (resolve, reject) => {
    if (!params.token) {
      throw new Error('Token is required')
    }

    try {
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
        // @ts-expect-error For debugging purposes
        on: wsClient.on.bind(wsClient),
        off: wsClient.off.bind(wsClient),
        __httpClient: httpClient,
        __wsClient: wsClient,
      })
    } catch (error) {
      reject(error)
    }
  })
}
