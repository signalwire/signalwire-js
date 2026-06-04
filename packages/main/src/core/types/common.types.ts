import type { URL as NodeURL } from 'node:url';

/** JSON-compatible value type for serializable data structures. */
export interface JSONSerializable {
  [key: string]:
    | JSONSerializable
    | string
    | number
    | boolean
    | null
    | undefined
    | JSONSerializable[];
}

/**
 * HTTP methods supported by the HTTPRequest interface
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP headers as key-value pairs
 */
export type HTTPHeaders = Record<string, string>;

/**
 * Represents an HTTP request with all necessary properties for making
 * REST API calls. Compatible with both browser fetch and Node.js http modules.
 */
export interface HTTPRequest {
  /** HTTP method to use for the request */
  method: HTTPMethod;
  /** Target URL for the request */
  url: string | URL;
  /** Optional HTTP headers */
  headers?: HTTPHeaders;
  /** Optional request body (supports various types for flexibility) */
  body?: string | Blob | ArrayBuffer | FormData | URLSearchParams | ReadableStream | null;
  /** Optional AbortSignal for request cancellation */
  signal?: AbortSignal;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

type HttpBody = string | Blob | ArrayBuffer | ReadableStream | null;
/**
 * Represents an HTTP response with status, headers, and body.
 * Compatible with both browser Response and Node.js http.IncomingMessage.
 */
export interface HTTPResponse<T extends HttpBody = string> {
  /** HTTP status code (e.g., 200, 404, 500) */
  status: number;
  /** HTTP status text (e.g., "OK", "Not Found") */
  statusText: string;
  /** Response headers */
  headers: HTTPHeaders;
  /** Response body (flexible type to support various response formats) */
  body?: T;
  /** Convenience property: true if status is 200-299 */
  ok: boolean;
  /** Final URL after any redirects */
  url: string;
}

/** Browser-compatible WebSocket client interface. */
export interface WebSocketClient {
  addEventListener: WebSocket['addEventListener'];
  removeEventListener: WebSocket['removeEventListener'];
  send: WebSocket['send'];
  close: WebSocket['close'];
  readyState: WebSocket['readyState'];
}

/** Node.js WebSocket client interface with event listener overloads. */
export interface NodeSocketClient extends WebSocketClient {
  addEventListener(
    method: 'open' | 'close' | 'error' | 'message',
    cb: (event: unknown) => void,
    options?: unknown
  ): void;
  removeEventListener(
    method: 'open' | 'close' | 'error' | 'message',
    cb: (event: unknown) => void
  ): void;
  send(data: unknown, cb?: (err?: Error) => void): void;
}

/**
 * There's a difference in `searchParams` between URL from
 * `lib` and URL from `url` (node) that makes using the same
 * not possible for us.
 */
export interface NodeSocketAdapter {
  new (address: string | NodeURL, options?: unknown): NodeSocketClient;
  new (
    address: string | NodeURL,
    protocols?: string | string[],
    options?: unknown
  ): NodeSocketClient;
}

/** Browser-compatible WebSocket constructor type. */
export type WebSocketAdapter = new (
  url: string | URL,
  protocols?: string | string[]
) => WebSocketClient;

/**
 * Authentication credentials for the SDK.
 *
 * At least one of `token` or `authorizationState` must be provided.
 */
export interface SDKCredential {
  /** JWT user access token (SAT). */
  token?: string;
  /** Pre-authorized session state (alternative to token). */
  authorizationState?: string;
  /** Token expiry timestamp in milliseconds since epoch. When set, the SDK attempts credential refresh before expiry. */
  expiry_at?: number;
}

/** Types of addressable resources in the fabric. */
export type ResourceType = 'app' | 'call' | 'room' | 'subscriber';
