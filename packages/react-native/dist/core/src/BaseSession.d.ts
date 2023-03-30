import { SessionOptions, RPCConnectResult, JSONRPCRequest, JSONRPCResponse, WebSocketAdapter, NodeSocketAdapter, WebSocketClient, SessionStatus, SessionAuthError } from './utils/interfaces';
import { SwAuthorizationState } from '.';
import { SessionChannelAction } from './redux/interfaces';
export declare const SW_SYMBOL: unique symbol;
export declare class BaseSession {
    options: SessionOptions;
    /** @internal */
    __sw_symbol: symbol;
    uuid: string;
    WebSocketConstructor: NodeSocketAdapter | WebSocketAdapter;
    CloseEventConstructor: typeof CloseEvent;
    agent: string;
    connectVersion: {
        major: number;
        minor: number;
        revision: number;
    };
    reauthenticate?(): Promise<void>;
    protected _rpcConnectResult: RPCConnectResult;
    private _requests;
    private _socket;
    private _host;
    private _executeTimeoutMs;
    private _executeTimeoutError;
    private _executeQueue;
    private _swConnectError;
    private _executeConnectionClosed;
    private _checkPingDelay;
    private _checkPingTimer;
    private _reconnectTimer;
    private _status;
    private _sessionChannel;
    private wsOpenHandler;
    private wsCloseHandler;
    private wsErrorHandler;
    constructor(options: SessionOptions);
    get host(): string;
    get rpcConnectResult(): RPCConnectResult;
    get relayProtocol(): string;
    get signature(): string | undefined;
    protected get logger(): import(".").InternalSDKLogger;
    get connecting(): boolean;
    get connected(): boolean;
    get closing(): boolean;
    get closed(): boolean;
    get status(): SessionStatus;
    get idle(): boolean;
    get ready(): boolean;
    set token(token: string);
    /**
     * Connect the websocket
     *
     * @return void
     */
    connect(): void;
    /**
     * Allow children classes to override it.
     * @return WebSocket instance
     */
    protected _createSocket(): WebSocketClient | import(".").NodeSocketClient;
    /** Allow children classes to override it. */
    protected destroySocket(): void;
    protected _addSocketListeners(): void;
    protected _removeSocketListeners(): void;
    /**
     * Clear the Session and close the WS connection.
     * @return void
     */
    disconnect(): Promise<void>;
    /**
     * Send a JSON object to the server.
     * @return Promise that will resolve/reject depending on the server response
     */
    execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any>;
    /**
     * Authenticate with the SignalWire Network
     * @return Promise<void>
     */
    authenticate(): Promise<void>;
    authError(error: SessionAuthError): void;
    forceClose(): void;
    protected _onSocketOpen(event: Event): Promise<void>;
    protected _onSocketError(event: Event): void;
    protected _onSocketClose(event: CloseEvent): void;
    private _clearTimers;
    private _clearPendingRequests;
    protected _onSocketMessage(event: MessageEvent): void | Promise<void>;
    dispatch(_payload: SessionChannelAction): void;
    /**
     * Check the current relayProtocol against the signature
     * to make sure is still valid.
     * @return boolean
     */
    protected _relayProtocolIsValid(): boolean | "" | undefined;
    protected encode<T>(input: T): Parameters<WebSocketClient['send']>[0];
    protected decode<T>(input: any): T;
    onSwAuthorizationState(state: SwAuthorizationState): Promise<void>;
    protected retrieveSwAuthorizationState(): Promise<string>;
    protected persistSwAuthorizationState(_: SwAuthorizationState): Promise<void>;
    private _send;
    private _addToExecuteQueue;
    private _flushExecuteQueue;
    private _clearCheckPingTimer;
    private _pingHandler;
    private _closeConnection;
}
//# sourceMappingURL=BaseSession.d.ts.map