import type { EntityCollectionTransformed } from '../../behaviors/Collection';
import type { Observable } from 'rxjs';

/**
 * Address history entry from conversation messages
 * Contains a reference to the sender address as an observable
 *
 * @template TAddress - The Address type, provided by the implementation
 *
 * @remarks
 * Uses a generic type parameter to maintain type safety while avoiding
 * circular dependencies. The Address class provides the concrete type.
 */
export interface AddressHistory<TAddress = never> {
  id: string;
  kind: string;
  status: string;
  started: number;
  ended?: number;
  fromAddress$: Observable<TAddress> | undefined;
}

/**
 * Text message from conversation
 * Contains a reference to the sender address as an observable
 *
 * @template TAddress - The Address type, provided by the implementation
 *
 * @remarks
 * Uses a generic type parameter to maintain type safety while avoiding
 * circular dependencies. The Address class provides the concrete type.
 */
export interface TextMessage<TAddress = never> {
  id: string;
  fromAddress$: Observable<TAddress> | undefined;
  created: number;
  text: string;
}

/**
 * Conversation message response from backend
 */
export interface GetConversationMessageResponse {
  id: string;
  from_fabric_address_id: string;
  group_id: string;
  ts: number;
  details: import('../RPCMessages/types/common').ConversationDetails;
  type: string;
  subtype: string;
  kind?: string;
  text?: string;
}

/**
 * Collection type for address history
 *
 * @template TAddress - The Address type, provided by the implementation
 */
export type AddressHistoryCollection<TAddress = never> = EntityCollectionTransformed<
  GetConversationMessageResponse,
  AddressHistory<TAddress>
>;

/**
 * Collection type for text messages
 *
 * @template TAddress - The Address type, provided by the implementation
 */
export type TextMessageCollection<TAddress = never> = EntityCollectionTransformed<
  GetConversationMessageResponse,
  TextMessage<TAddress>
>;

/**
 * Conversation metadata response
 */
export interface GetConversationResponse {
  id: string;
  address_id: string;
  group_id: string;
  created_at: number;
  from_fabric_address_id: string;
  last_message_at: number;
  metadata: Record<string, unknown>;
  name: string;
}
