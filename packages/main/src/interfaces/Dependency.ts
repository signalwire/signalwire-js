import type { ConversationsProvider } from './Conversations';
import type { DeviceController } from './DeviceController';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type { User } from '../core/entities/User';
import type {
  NodeSocketAdapter,
  SDKCredential,
  WebSocketAdapter
} from '../core/types/common.types';
import type { Storage, WebRTCApiProvider } from '../dependencies/interfaces';
import type { StorageManager } from '../managers/StorageManager';

/**
 * Dependency interface for dependency injection container
 * Provides access to shared dependencies across the application
 */
export interface Dependency {
  readonly userId: string;
  user: User;
  readonly storage: StorageManager;
  readonly http: HTTPRequestController;
  conversationManager: ConversationsProvider;
  WebSocket: WebSocketAdapter | NodeSocketAdapter;
  readonly deviceController: DeviceController;
  webRTCApiProvider: WebRTCApiProvider;
  credential: SDKCredential;
  readonly relayHost: string;
  readonly apiHost: string;
  baseURL: string;
  storageImpl: Storage;
  ch: string | undefined;
  persistSession: boolean;
  readonly authorizationStateKey: string;
  readonly protocolKey: string;
  readonly attachedCallsKey: string;
  getUserFromAddressId(): string;
}
