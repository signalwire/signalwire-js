import type { EntityCollection } from '../behaviors/Collection';
import type { GetConversationMessageResponse } from '../core/types/conversation.types';

/**
 * Interface for conversation message collection
 *
 * Type alias for EntityCollection specialized for conversation messages.
 * Decouples Address from ConversationsManager's concrete ConversationMessageCollection class.
 *
 * @remarks
 * The concrete ConversationMessageCollection class in ConversationsManager.ts
 * extends EntityCollection<GetConversationMessageResponse> and satisfies this type.
 */
export type ConversationMessageCollection = EntityCollection<GetConversationMessageResponse>;

/**
 * Provider interface for conversation management
 *
 * Defines the minimal interface required by Address and other consumers
 * of conversation functionality. Implemented by ConversationsManager.
 *
 * @remarks
 * This interface enables dependency injection and breaks circular dependencies
 * by allowing consumers to depend on the interface rather than the concrete manager.
 */
export interface ConversationsProvider {
  /**
   * Get or create a conversation message collection for an address
   *
   * @param addressId - The fabric address ID to get messages for
   * @returns Promise resolving to a collection of conversation messages
   *
   * @remarks
   * This method handles joining conversations if needed and creates
   * a reactive collection that updates with new messages via observables
   */
  getConversationMessageCollection(addressId: string): Promise<ConversationMessageCollection>;

  /**
   * Send a text message to an address
   *
   * @param text - The message text to send
   * @param destinationAddressId - The fabric address ID to send to
   * @returns Promise that resolves when message is sent
   *
   * @throws {ConversationError} If sending fails
   */
  sendText(text: string, destinationAddressId: string): Promise<void>;
}
