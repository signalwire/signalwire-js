import {
  ConversationAPIGetMessagesParams,
  ConversationAPISendMessageParams,
  ConversationContract,
  ConversationResponse,
  GetConversationMessagesResult,
  SendConversationMessageResponse,
} from './interfaces'

export class ConversationAPI implements ConversationContract {
  constructor(private payload: ConversationResponse) {}

  get id() {
    return this.payload.id
  }

  get addressId() {
    return this.payload.address_id
  }

  get createdAt() {
    return this.payload.created_at
  }

  get lastMessageAt() {
    return this.payload.last_message_at
  }

  get metadata() {
    return this.payload.metadata
  }

  get name() {
    return this.payload.name
  }

  /**
   * @deprecated this method is deprecated and will be removed in future versions. Use @signalwire/client instead.
   */
  sendMessage(
    _params: ConversationAPISendMessageParams
  ): Promise<SendConversationMessageResponse> {
    throw new Error(
      'This version ConversationAPI.sendMessage is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  /**

   * @deprecated this method is deprecated and will be removed in future versions. Use @signalwire/client instead.
   */
  getMessages(
    _params?: ConversationAPIGetMessagesParams
  ): Promise<GetConversationMessagesResult> {
    throw new Error(
      'This version ConversationAPI.getMessages is unsupported by the backend. Use @signalwire/client instead.'
    )
  }
}
