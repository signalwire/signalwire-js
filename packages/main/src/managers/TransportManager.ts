import {
  EMPTY,
  catchError,
  defer,
  filter,
  from,
  map,
  share,
  shareReplay,
  take,
  takeUntil,
  tap,
  timeout
} from 'rxjs';

import { PreferencesContainer } from '../containers/PreferencesContainer';
import { WebSocketController } from '../controllers/WebSocketController';
import { SERVER_PING_PROBE_TIMEOUT_MS, SERVER_PING_TIMEOUT_MS } from '../core/constants';
import { MessageParseError, TransportConnectionError } from '../core/errors';
import { RPCEventAckResponse, RPCPing, RPCPingResponse } from '../core/RPCMessages';
import { isJSONRPCRequest, isJSONRPCResponse } from '../core/RPCMessages/guards/base.guards';
import { isSignalwireRequest } from '../core/RPCMessages/guards/events.guards';
import {
  isSignalwireConnectRequest,
  isSignalwirePingRequest
} from '../core/RPCMessages/guards/methods.guards';
import { Destroyable, PendingRPC } from '../core/utils';
import { getLogger } from '../utils/logger';

import type { StorageManager } from './StorageManager';
import type { JSONRPCRequest, JSONRPCResponse } from '../core/RPCMessages/types/base';
import type {
  JSONSerializable,
  WebSocketAdapter,
  NodeSocketAdapter
} from '../core/types/common.types';
import type { PendingRPCOptions } from '../core/utils';
import type { Observable, OperatorFunction } from 'rxjs';

const logger = getLogger();

export class TransportManager extends Destroyable {
  private initialized$: Observable<boolean>;

  public protocol$ = this.createReplaySubject<string | undefined>(1);
  // Connection state tracking
  private isConnecting = false;
  private isConnected = false;
  // Outbound gate: requests wait until signalwire.connect succeeds on the
  // current socket, and responses are dropped while no socket is open.
  private socketStatus = 'disconnected';
  private sessionAuthenticated = false;
  private heldRequests: { id: string; payload: string }[] = [];
  private serverPingTimer?: ReturnType<typeof setTimeout>;
  private serverPingWatch = 0;

  // Session epoch for stale event detection (epoch seconds).
  // Set from the first timestamped event after each signalwire.connect.
  private ackEvent = <T extends JSONRPCRequest | JSONRPCResponse>(): OperatorFunction<T, T> => {
    return tap((message) => {
      if (isSignalwireRequest(message)) {
        try {
          logger.debug('[Transport] Sending event ack', {
            eventId: message.id
          });
          this.send(RPCEventAckResponse(message.id));
        } catch (error) {
          logger.error('[Transport] Failed to send event acknowledgment:', error);
        }
      }
    });
  };
  private replySignalwirePing = <T extends JSONRPCRequest | JSONRPCResponse>(): OperatorFunction<
    T,
    T
  > => {
    return filter((message) => {
      if (isSignalwirePingRequest(message)) {
        try {
          logger.debug('[Transport] Received ping, sending pong', {
            pingId: message.id
          });
          if (this.sessionAuthenticated) this.armServerPingWatchdog();
          this.send(RPCPingResponse(message.id));
        } catch (error) {
          logger.error('[Transport] Failed to send ping response:', error);
        }
        return false;
      }
      return true;
    });
  };
  /**
   * Filter that drops events from a previous session after reconnect.
   *
   * Compares the event's `event_channel` against the current protocol.
   * Events whose channel doesn't contain the current protocol are from
   * a stale session and are discarded. Events without an event_channel
   * (auth state events, RPC responses) always pass through.
   */
  private discardStaleEvents = <T extends JSONRPCRequest | JSONRPCResponse>(): OperatorFunction<
    T,
    T
  > => {
    return filter((message) => {
      if (!isSignalwireRequest(message)) return true;

      const eventChannel: string | undefined = (message.params as Record<string, unknown>)
        .event_channel as string | undefined;
      if (!eventChannel) return true;

      if (message.params.event_type.startsWith('conversation.')) {
        // Conversation events are broadcast using a channel that is not tied to the current protocol
        logger.debug(
          `[Transport] Received conversation event: ${message.params.event_type}` +
            ` (event_channel: ${eventChannel})`
        );
        return true;
      }

      const currentProtocol = this._currentProtocol;
      if (!currentProtocol) return true;

      if (!eventChannel.includes(currentProtocol)) {
        const eventType = message.params.event_type;
        logger.warn(
          `[Transport] Discarding stale event: ${eventType}` +
            ` (event_channel does not match current protocol)`
        );
        return false;
      }

      return true;
    });
  };

  private _currentProtocol: string | undefined;
  private _outgoingMessages$ = this.createSubject<string | ArrayBuffer | Blob>();
  private _webSocketConnections!: WebSocketController;
  private _jsonRPCMessage$!: Observable<JSONRPCResponse | JSONRPCRequest>;
  private _jsonRPCResponse$!: Observable<JSONRPCResponse>;
  private _incomingEvent$!: Observable<JSONRPCRequest | JSONRPCResponse>;

  constructor(
    private readonly storage: StorageManager,
    private readonly protocolKey: string,
    webSocketConstructor: WebSocketAdapter | NodeSocketAdapter,
    relayHost: string,
    private readonly onError?: (error: Error) => void
  ) {
    super();
    this._webSocketConnections = new WebSocketController(
      webSocketConstructor,
      relayHost,
      this._outgoingMessages$.asObservable(),
      {
        connectionTimeout: PreferencesContainer.instance.connectionTimeout,
        reconnectDelayMin: PreferencesContainer.instance.reconnectDelayMin,
        reconnectDelayMax: PreferencesContainer.instance.reconnectDelayMax
      }
    );
    this.subscribeTo(this._webSocketConnections.errors$, (error) => {
      this.onError?.(error);
    });
    this.subscribeTo(this._webSocketConnections.status$, (status) => {
      this.socketStatus = status;
      if (status !== 'connected') {
        this.sessionAuthenticated = false;
        this.clearServerPingWatchdog();
      }
      // An explicit disconnect ends the session: held requests must not go
      // out on a later connect. A reconnect keeps them.
      if (status === 'disconnected') {
        this.heldRequests = [];
      }
    });
    this.initialized$ = defer(() => from(this._init())).pipe(
      shareReplay(1),
      takeUntil(this.destroyed$)
    );

    this._jsonRPCMessage$ = this._webSocketConnections.incomingMessages$.pipe(
      map((event: MessageEvent) => {
        try {
          return JSON.parse(event.data as string) as object;
        } catch (error) {
          logger.error('[Transport] Failed to parse incoming message:', error);
          this.onError?.(new MessageParseError(error));
          return null;
        }
      }),
      filter(
        (message): message is JSONRPCResponse | JSONRPCRequest =>
          message !== null && (isJSONRPCResponse(message) || isJSONRPCRequest(message))
      ),
      catchError((error) => {
        logger.error('[Transport] Message processing error:', error);
        this.onError?.(error instanceof Error ? error : new Error(String(error), { cause: error }));
        return EMPTY;
      }),
      share(),
      takeUntil(this.destroyed$)
    );

    this._jsonRPCResponse$ = this._jsonRPCMessage$.pipe(filter(isJSONRPCResponse));

    this._incomingEvent$ = this._jsonRPCMessage$.pipe(
      this.ackEvent(),
      this.replySignalwirePing(),
      filter((message) => !isJSONRPCResponse(message)),
      this.discardStaleEvents(),
      share(),
      takeUntil(this.destroyed$)
    );
  }

  public async setProtocol(protocol: string | undefined): Promise<void> {
    this._currentProtocol = protocol;
    this.protocol$.next(protocol);
    await this._updateProtocolInStorage(protocol);
  }
  public get incomingEvent$(): Observable<JSONRPCRequest | JSONRPCResponse> {
    return this._incomingEvent$;
  }

  public get connectionStatus$(): Observable<string> {
    return this._webSocketConnections.status$;
  }

  public get connectionStatus(): string {
    return this.socketStatus;
  }

  public async connect(): Promise<void> {
    // Prevent duplicate connections
    if (this.isConnecting || this.isConnected) {
      logger.warn('[Transport] Already connecting or connected');
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.isConnecting = true;

      this.subscribeTo(this.initialized$, () => {
        this._webSocketConnections.connect();

        // Wait for actual connection
        const connectionSub = this._webSocketConnections.status$
          .pipe(
            filter((status) => status === 'connected' || status === 'disconnected'),
            take(1),
            timeout(10000) // 10 second timeout
          )
          .subscribe({
            next: (status) => {
              if (status === 'connected') {
                this.isConnecting = false;
                this.isConnected = true;
                logger.debug('[Transport] Connection established');
                resolve();
              } else {
                this.isConnecting = false;
                const error = new TransportConnectionError('Failed to connect');
                logger.error('[Transport] Connection failed');
                this.onError?.(error);
                reject(error);
              }
            },
            error: (err) => {
              this.isConnecting = false;
              logger.error('[Transport] Connection error:', err);
              this.onError?.(err instanceof Error ? err : new Error(String(err), { cause: err }));
              reject(err as Error);
            }
          });

        this.subscriptions.push(connectionSub);

        // Track disconnection
        this.subscribeTo(
          this._webSocketConnections.status$.pipe(filter((status) => status === 'disconnected')),
          () => {
            logger.debug('[Transport] Disconnected');
            this.isConnected = false;
          }
        );
      });
    });
  }

  public reconnect(): void {
    this._webSocketConnections.reconnect();
  }

  public async execute<T extends JSONRPCResponse = JSONRPCResponse>(
    request: JSONRPCRequest,
    options?: PendingRPCOptions
  ): Promise<T> {
    // Send the request through the WebSocket
    this.send(request as unknown as JSONSerializable);

    // Create and return a PendingRPC promise that will resolve when the matching response arrives
    const pending = new PendingRPC<T>(request, this._jsonRPCResponse$ as Observable<T>, options)
      .promise;
    // The caller already saw the failure, so a held request must not go out later.
    pending.catch(() => {
      this.heldRequests = this.heldRequests.filter((held) => held.id !== request.id);
    });
    return pending;
  }
  public send(message: unknown): void {
    const payload = JSON.stringify(message);
    if (isJSONRPCResponse(message)) {
      // A response answers a request received on the current socket. The
      // server rejects a response that arrives before signalwire.connect on a
      // new socket and closes it, so drop it when no socket is open.
      if (this.socketStatus !== 'connected') {
        logger.debug('[Transport] Dropping response while disconnected', { id: message.id });
        return;
      }
    } else if (!this.sessionAuthenticated && !isSignalwireConnectRequest(message)) {
      this.heldRequests.push({ id: (message as JSONRPCRequest).id, payload });
      return;
    }
    this._outgoingMessages$.next(payload);
  }

  /**
   * Called by the session when signalwire.connect succeeds on the current
   * socket. Sends the requests held since the socket opened, in order.
   */
  public setAuthenticated(): void {
    if (this.socketStatus !== 'connected') return;
    this.sessionAuthenticated = true;
    this.armServerPingWatchdog();
    const held = this.heldRequests;
    this.heldRequests = [];
    held.forEach(({ payload }) => this._outgoingMessages$.next(payload));
  }
  //   request(request: HTTPRequest): Promise<HTTPResponse> {}
  public disconnect(): void {
    logger.debug('[Transport] Disconnecting');
    this.isConnected = false;
    this.isConnecting = false;
    this.clearServerPingWatchdog();

    // Disconnect WebSocket
    this._webSocketConnections.disconnect();
  }
  public destroy(): void {
    logger.debug('[Transport] Destroying');
    this.disconnect();
    super.destroy();
    this._webSocketConnections.destroy();
  }
  private armServerPingWatchdog(): void {
    this.clearServerPingWatchdog();
    const watch = this.serverPingWatch;
    this.serverPingTimer = setTimeout(() => void this.probeServer(watch), SERVER_PING_TIMEOUT_MS);
  }

  /** Bumps the watch so a probe still in flight no longer acts on its result. */
  private clearServerPingWatchdog(): void {
    clearTimeout(this.serverPingTimer);
    this.serverPingTimer = undefined;
    this.serverPingWatch += 1;
  }

  private async probeServer(watch: number): Promise<void> {
    logger.debug(
      `[Transport] No signalwire.ping for ${SERVER_PING_TIMEOUT_MS}ms, probing the server`
    );
    try {
      await this.execute(RPCPing(), { timeoutMs: SERVER_PING_PROBE_TIMEOUT_MS });
      if (watch === this.serverPingWatch) this.armServerPingWatchdog();
    } catch (error) {
      if (watch !== this.serverPingWatch) return;
      logger.warn('[Transport] Server did not answer the ping probe, replacing the socket', error);
      this.reconnect();
    }
  }

  private async _loadProtocolFromStorage(): Promise<void> {
    try {
      const storedProtocol = await this.storage.getItem<string>(this.protocolKey);
      this._currentProtocol = storedProtocol ?? undefined;
      this.protocol$.next(storedProtocol ?? undefined);
    } catch (error) {
      logger.error('Failed to retrieve protocol from storage:', error);
      throw error;
    }
  }

  private async _updateProtocolInStorage(protocol: string | undefined): Promise<void> {
    if (!protocol) {
      try {
        await this.storage.removeItem(this.protocolKey);
      } catch (error) {
        logger.error('Failed to remove protocol from storage:', error);
        throw error;
      }
      return;
    }

    try {
      const storedProtocol = await this.storage.getItem<string>(this.protocolKey);
      if (!storedProtocol || storedProtocol !== protocol) {
        await this.storage.setItem(this.protocolKey, protocol);
      }
    } catch (error) {
      logger.error('Failed to update protocol in storage:', error);
      throw error;
    }
  }

  private async _init(): Promise<boolean> {
    await this._loadProtocolFromStorage();
    return true;
  }
}
