import { Destroyable } from '../behaviors/Destroyable';
import { UnexpectedError, WebSocketConnectionError, WebSocketTimeoutError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type {
  NodeSocketAdapter,
  NodeSocketClient,
  WebSocketAdapter,
  WebSocketClient
} from '../core/types/common.types';
import type { Observable } from 'rxjs';

const logger = getLogger();

export type WebSocketConnectionStatus =
  | 'disconnected'
  | 'disconnecting'
  | 'reconnecting'
  | 'connected'
  | 'connecting';

export interface WebSocketControllerOptions {
  reconnectDelayMin?: number;
  reconnectDelayMax?: number;
  connectionTimeout?: number;
}

export class WebSocketController extends Destroyable {
  // Default configuration values

  private static readonly DEFAULT_RECONNECT_DELAY_MIN_MS = 1_000;

  private static readonly DEFAULT_RECONNECT_DELAY_MAX_MS = 30_000;

  private static readonly DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;

  // Private state
  private socket?: WebSocketClient | NodeSocketClient;
  private messageQueue: (string | ArrayBuffer | Blob)[] = [];
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private connectionTimeoutTimer?: ReturnType<typeof setTimeout>;
  private currentReconnectDelay: number;
  private shouldReconnect = false;
  // Configuration
  private readonly reconnectDelayMin: number;
  private readonly reconnectDelayMax: number;
  private readonly connectionTimeout: number;
  // Bound event handlers for proper addEventListener/removeEventListener pairing
  private readonly boundHandleOpen = (): void => this.handleOpen();
  private readonly boundHandleClose = (event: CloseEvent): void => this.handleClose(event);
  private readonly boundHandleError = (): void => this.handleError();
  private readonly boundHandleMessage = (event: MessageEvent): void => this.handleMessage(event);

  // Observable streams
  private _status$ = this.createBehaviorSubject<WebSocketConnectionStatus>('disconnected');

  private _incomingMessages$ = this.createSubject<MessageEvent>();

  private _errors$ = this.createReplaySubject<Error>(1);

  constructor(
    private WebSocketConstructor: WebSocketAdapter | NodeSocketAdapter,
    private endpoint: string,
    private outgoingMessages$: Observable<string | ArrayBuffer | Blob>,
    options: WebSocketControllerOptions = {}
  ) {
    super();
    this.reconnectDelayMin =
      options.reconnectDelayMin ?? WebSocketController.DEFAULT_RECONNECT_DELAY_MIN_MS;
    this.reconnectDelayMax =
      options.reconnectDelayMax ?? WebSocketController.DEFAULT_RECONNECT_DELAY_MAX_MS;
    this.connectionTimeout =
      options.connectionTimeout ?? WebSocketController.DEFAULT_CONNECTION_TIMEOUT_MS;
    this.currentReconnectDelay = this.reconnectDelayMin;

    // Subscribe to send$ to handle message sending
    this.subscriptions.push(
      this.outgoingMessages$.subscribe((data) => {
        this.send(data);
      })
    );
  }

  public get status$(): Observable<WebSocketConnectionStatus> {
    return this._status$.asObservable();
  }
  public get incomingMessages$(): Observable<MessageEvent> {
    return this._incomingMessages$.asObservable();
  }
  public get errors$(): Observable<Error> {
    return this._errors$.asObservable();
  }
  public connect(): void {
    if (this._status$.value === 'connecting' || this._status$.value === 'connected') {
      return;
    }

    this.shouldReconnect = true;
    this._status$.next('connecting');
    this.createWebSocket();
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.clearConnectionTimeout();

    const currentStatus = this._status$.value;

    if (
      currentStatus === 'connected' ||
      currentStatus === 'connecting' ||
      currentStatus === 'reconnecting'
    ) {
      if (this.socket) {
        this._status$.next('disconnecting');
        this.socket.close();
      } else {
        this._status$.next('disconnected');
      }
    } else {
      this._status$.next('disconnected');
    }
  }

  reconnect(): void {
    // Re-arm shouldReconnect so callers can force a reconnect after a prior
    // disconnect() (which sets shouldReconnect=false). Without this, a call
    // to reconnect() after disconnect() would silently no-op, breaking
    // auth-recovery paths that disconnect and then reconnect fresh.
    this.shouldReconnect = true;
    this._status$.next('reconnecting');
    this.scheduleReconnection();
  }

  public send(data: string | ArrayBuffer | Blob): void {
    if (
      this._status$.value === 'connected' &&
      this.socket?.readyState === 1 // WebSocket.OPEN
    ) {
      logger.wsTraffic({ type: 'send', raw: data as string });
      this.socket.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  private createWebSocket(): void {
    try {
      this.closeExistingSocket();
      this.socket = new this.WebSocketConstructor(this.endpoint);
      this.setupWebSocketListeners();
      this.startConnectionTimeout();
    } catch (error) {
      const err =
        error instanceof Error ? error : new UnexpectedError('Failed to create WebSocket');
      this._errors$.next(err);
      this.handleConnectionError();
    }
  }

  /**
   * Closes the existing socket and removes its event listeners to prevent
   * phantom 'open'/'close' events from firing on the orphaned socket.
   */
  private closeExistingSocket(): void {
    if (!this.socket) return;

    const oldSocket = this.socket;
    this.socket = undefined;

    this.removeWebSocketListeners(oldSocket);

    try {
      oldSocket.close();
    } catch {
      // Ignore errors closing already-closed sockets
    }
  }

  private setupWebSocketListeners(): void {
    if (!this.socket) return;

    this.socket.addEventListener('open', this.boundHandleOpen);
    // @ts-expect-error -- CloseEvent type mismatch between browser/node adapters
    this.socket.addEventListener('close', this.boundHandleClose);
    this.socket.addEventListener('error', this.boundHandleError);
    // @ts-expect-error -- MessageEvent type mismatch between browser/node adapters
    this.socket.addEventListener('message', this.boundHandleMessage);
  }

  private removeWebSocketListeners(socket: WebSocketClient | NodeSocketClient): void {
    try {
      socket.removeEventListener('open', this.boundHandleOpen);
      // @ts-expect-error -- WebSocket listener type mismatch between browser/node adapters
      socket.removeEventListener('close', this.boundHandleClose);
      socket.removeEventListener('error', this.boundHandleError);
      // @ts-expect-error -- WebSocket listener type mismatch between browser/node adapters
      socket.removeEventListener('message', this.boundHandleMessage);
    } catch {
      // Some environments may not support removeEventListener on WebSocket
    }
  }

  private handleOpen(): void {
    this.clearConnectionTimeout();
    this._status$.next('connected');
    this.currentReconnectDelay = this.reconnectDelayMin;
    this.flushMessageQueue();
  }

  private handleClose(_event: CloseEvent): void {
    this.clearConnectionTimeout();

    if (this.shouldReconnect) {
      this._status$.next('reconnecting');
      this.scheduleReconnection();
    } else {
      this._status$.next('disconnected');
    }
  }

  private handleError(): void {
    const error = new WebSocketConnectionError('WebSocket connection error');
    this._errors$.next(error);
    this.handleConnectionError();
  }

  private handleMessage(event: MessageEvent): void {
    logger.wsTraffic({ type: 'recv', raw: event.data as string });
    this._incomingMessages$.next(event);
  }

  private handleConnectionError(): void {
    this.reconnect();
  }

  private scheduleReconnection(): void {
    this.clearReconnectTimer();

    // Equal jitter: use half the ceiling as a guaranteed base, plus a random
    // portion of the other half. This prevents thundering herd when many clients
    // reconnect simultaneously (e.g., after a server restart) while still
    // respecting the exponential backoff envelope.
    // Range: [currentDelay * 0.5, currentDelay * 1.0]
    // Reference: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
    const jitteredDelay = this.currentReconnectDelay * (0.5 + Math.random() * 0.5);

    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this._status$.next('connecting');
        this.createWebSocket();
        this.increaseReconnectDelay();
      }
    }, jitteredDelay);
  }

  private increaseReconnectDelay(): void {
    this.currentReconnectDelay = Math.min(this.currentReconnectDelay * 2, this.reconnectDelayMax);
  }

  private startConnectionTimeout(): void {
    this.clearConnectionTimeout();

    this.connectionTimeoutTimer = setTimeout(() => {
      if (this._status$.value === 'connecting') {
        const error = new WebSocketTimeoutError('WebSocket connection timeout');
        this._errors$.next(error);

        if (this.socket) {
          this.socket.close();
        }
      }
    }, this.connectionTimeout);
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = undefined;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === 1) {
      const message = this.messageQueue.shift();
      if (message !== undefined) {
        this.socket.send(message);
      }
    }
  }
}
