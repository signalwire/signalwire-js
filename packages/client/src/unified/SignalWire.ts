import { HTTPClient } from './HTTPClient'
import { Conversation } from './Conversation'
import { SignalWireClient, SignalWireClientParams } from './interfaces'
import { WSClient } from './WSClient'
import { StorageWrapper } from './utils/StorageWrapper'
import {
  DEFAULT_API_REQUEST_RETRIES,
  DEFAULT_API_REQUEST_RETRIES_DELAY,
  DEFAULT_API_REQUEST_RETRIES_DELAY_INCREMENT,
} from './utils/constants'

/**
 * Legacy singleton SignalWire function - kept for backward compatibility
 *
 * @param params - SignalWire client parameters including optional clientId and storage
 * @returns Promise resolving to SignalWireClient
 *
 * Note: Singleton behavior is maintained only when clientId is 'default' (or omitted)
 * and no custom storage is provided. Otherwise, a new instance is created each time.
 */
export const SignalWire = (() => {
  let instance: Promise<SignalWireClient> | null = null

  return (params: SignalWireClientParams): Promise<SignalWireClient> => {
    const { profileId } = params

    // Only use singleton pattern if using profileId
    const useSingleton = !profileId

    if (!useSingleton) {
      // For non-default clientId or custom storage, always create a new instance
      return createSignalWireClient(params)
    }

    // Singleton behavior for backward compatibility
    if (!instance) {
      instance = createSignalWireClient(params)
    }
    return instance
  }
})()

/**
 * Create a new SignalWire client instance (multi-instance support)
 * This function is used internally by the ClientFactory for creating multiple instances
 */
export async function createSignalWireClient(
  params: SignalWireClientParams
): Promise<SignalWireClient> {
  const { profileId, storage, shouldDisconnect, ...restParams } = params

  // Create storage wrapper if storage is provided
  const wrappedStorage =
    storage && profileId ? new StorageWrapper(storage, profileId) : undefined

  const options = {
    profileId,
    maxApiRequestRetries: DEFAULT_API_REQUEST_RETRIES,
    apiRequestRetriesDelay: DEFAULT_API_REQUEST_RETRIES_DELAY,
    apiRequestRetriesDelayIncrement:
      DEFAULT_API_REQUEST_RETRIES_DELAY_INCREMENT,
    ...restParams,
    storage: wrappedStorage,
  }

  const wsClient = new WSClient(options)
  const httpClient = new HTTPClient(options)
  const conversation = new Conversation({ httpClient, wsClient })

  // Connect the WebSocket and authenticate the user
  await wsClient.connect()

  return {
    registerDevice: httpClient.registerDevice.bind(httpClient),
    unregisterDevice: httpClient.unregisterDevice.bind(httpClient),
    getSubscriberInfo: httpClient.getSubscriberInfo.bind(httpClient),
    disconnect: async () => {
      if (!shouldDisconnect || shouldDisconnect?.()) {
        return wsClient.disconnect()
      }
    },
    online: wsClient.online.bind(wsClient),
    offline: wsClient.offline.bind(wsClient),
    dial: wsClient.dial.bind(wsClient),
    reattach: wsClient.reattach.bind(wsClient),
    handlePushNotification: wsClient.handlePushNotification.bind(wsClient),
    updateToken: wsClient.updateToken.bind(wsClient),
    address: {
      getAddresses: httpClient.getAddresses.bind(httpClient),
      getAddress: httpClient.getAddress.bind(httpClient),
      getMyAddresses: httpClient.getMyAddresses.bind(httpClient),
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
  }
}
