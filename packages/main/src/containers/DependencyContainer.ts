import { HTTPRequestController } from '../controllers/HTTPRequestController';
import { NavigatorDeviceController } from '../controllers/NavigatorDeviceController';
import { DependencyError } from '../core/errors';
import { DefaultLocalStorage } from '../dependencies/DefaultLocalStorage';
import { StorageManager } from '../managers/StorageManager';

import type { User } from '../core/entities/User';
import type {
  NodeSocketAdapter,
  SDKCredential,
  WebSocketAdapter
} from '../core/types/common.types';
import type { Storage, WebRTCApiProvider } from '../dependencies/interfaces';
import type { ConversationsProvider } from '../interfaces/Conversations';
import type { Dependency } from '../interfaces/Dependency';
import type { DeviceController } from '../interfaces/DeviceController';

export class DependencyContainer implements Dependency {
  /**
   * When true, credential + auth state + protocol are stored in localStorage
   * (survives page reload). When false (default), sessionStorage is used.
   */
  public persistSession = false;
  private _conversationManager?: ConversationsProvider;

  private _user?: User;

  private _host?: string;

  private _domain?: string;

  private _storageManager?: StorageManager;
  private _storageImpl?: Storage;
  private _webSocketConstructor?: WebSocketAdapter | NodeSocketAdapter =
    typeof WebSocket !== 'undefined' ? WebSocket : undefined;
  private _baseURL: string = this.apiHost;
  private _credential: SDKCredential = {};
  private _httpRequestController?: HTTPRequestController;
  private _deviceController?: NavigatorDeviceController;
  private _webRTCApiProvider?: WebRTCApiProvider;

  public get userId(): string {
    return this.user.id;
  }

  public get user(): User {
    if (!this._user) {
      throw new DependencyError('User');
    }
    return this._user;
  }
  public set user(user: User) {
    this._user = user;
  }

  public get storage(): StorageManager {
    if (!this._storageManager) {
      // Lazily initialize storage implementation if not already set
      this._storageImpl ??= new DefaultLocalStorage();
      this._storageManager = new StorageManager(this._storageImpl);
    }
    return this._storageManager;
  }

  public get http(): HTTPRequestController {
    this._httpRequestController ??= new HTTPRequestController(
      this._baseURL,
      () => this._credential
    );
    return this._httpRequestController;
  }

  public get conversationManager(): ConversationsProvider {
    if (!this._conversationManager) {
      throw new DependencyError('ConversationsManager');
    }
    return this._conversationManager;
  }

  public set conversationManager(conversationManager: ConversationsProvider) {
    this._conversationManager = conversationManager;
  }

  public get WebSocket(): WebSocketAdapter | NodeSocketAdapter {
    if (!this._webSocketConstructor) {
      throw new DependencyError('WebSocket constructor');
    }
    return this._webSocketConstructor;
  }

  public set WebSocket(WebSocketConstructor: WebSocketAdapter | NodeSocketAdapter) {
    this._webSocketConstructor = WebSocketConstructor;
  }

  public get deviceController(): DeviceController {
    this._deviceController ??= new NavigatorDeviceController(this.webRTCApiProvider, this.storage);
    return this._deviceController;
  }

  public get webRTCApiProvider(): WebRTCApiProvider {
    if (!this._webRTCApiProvider) {
      if (typeof RTCPeerConnection === 'undefined' || typeof navigator === 'undefined') {
        throw new DependencyError(
          'WebRTCApiProvider: RTCPeerConnection or navigator.mediaDevices is not available. ' +
            'Please provide a custom webRTCApiProvider in SignalWireOptions.'
        );
      }
      this._webRTCApiProvider = {
        RTCPeerConnection,
        mediaDevices: navigator.mediaDevices
      };
    }
    return this._webRTCApiProvider;
  }

  public set webRTCApiProvider(webRTCApiProvider: WebRTCApiProvider) {
    this._webRTCApiProvider = webRTCApiProvider;
    // Reset device controller so it picks up the new provider
    this._deviceController = undefined;
  }

  public get authorizationStateKey(): string {
    return `sw:${this.userId}:as`;
  }

  public get protocolKey(): string {
    return `sw:${this.userId}:pt`;
  }

  public get attachedCallsKey(): string {
    return `sw:${this.userId}:att`;
  }

  public getUserFromAddressId(): string {
    return this.user.addresses[0]?.id ?? '';
  }

  public set baseURL(baseURL: string) {
    this._baseURL = baseURL;
    this._httpRequestController = undefined;
  }

  public get credential(): SDKCredential {
    return this._credential;
  }

  public set credential(credential: SDKCredential) {
    this._credential = credential;
  }

  public set storageImpl(storageImpl: Storage) {
    this._storageImpl = storageImpl;
    this._storageManager = undefined;
  }

  public set ch(ch: string | undefined) {
    if (!ch) {
      return;
    }

    const firstDot = ch.indexOf('.');
    if (firstDot !== -1) {
      this._host = ch.substring(0, firstDot);
      this._domain = ch.substring(firstDot + 1);
    }

    // Update baseURL and reset HTTP controller so it picks up the new host
    this._baseURL = this.apiHost;
    this._httpRequestController = undefined;
  }

  public get relayHost(): string {
    return `wss://${this._host ?? 'puc'}.${this._domain ?? 'signalwire.com'}`;
  }

  public get apiHost(): string {
    return `https://fabric.${this._domain ?? 'signalwire.com'}`;
  }
}
