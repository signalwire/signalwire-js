import { Destroyable } from '../behaviors/Destroyable';
import { RequestTimeoutError, UnexpectedError } from '../core/errors';
import { asyncRetry, increasingDelay } from '../utils/asyncRetry';
import { getLogger } from '../utils/logger';

import type {
  HTTPRequest,
  HTTPResponse,
  HTTPHeaders,
  SDKCredential
} from '../core/types/common.types';
import type { Observable } from 'rxjs';

const logger = getLogger();

export type HTTPRequestStatus = 'idle' | 'requesting' | 'success' | 'error';

export interface HTTPRequestControllerOptions {
  maxRetries?: number;
  retryDelayMin?: number;
  retryDelayMax?: number;
  requestTimeout?: number;
}

export const GET_PARAMS = {
  method: 'GET',
  headers: {
    Accept: 'application/json'
  }
} as const;

export const POST_PARAMS = {
  method: 'POST',
  headers: {
    Accept: 'application/json',

    'Content-Type': 'application/json'
  }
} as const;

export class HTTPRequestController extends Destroyable {
  // Default configuration values
  private static readonly defaultMaxRetries = 3;
  private static readonly defaultRetryDelayMinMs = 1000;
  private static readonly defaultRetryDelayMaxMs = 30000;
  private static readonly defaultRequestTimeoutMs = 30000;

  /** Sensitive field names to mask in debug logs. */
  private static readonly SENSITIVE_BODY_FIELDS = new Set(['dpop_token', 'token', 'jwt_token']);
  // Configuration
  private readonly maxRetries: number;
  private readonly retryDelayMin: number;
  private readonly retryDelayMax: number;
  private readonly requestTimeout: number;
  private _responses$ = this.createSubject<HTTPResponse>();
  private _errors$ = this.createSubject<Error>();

  // Observable streams
  private _status$ = this.createBehaviorSubject<HTTPRequestStatus>('idle');

  constructor(
    private baseURL: string,
    private readonly getCredential: () => SDKCredential,
    options: HTTPRequestControllerOptions = {}
  ) {
    super();
    this.maxRetries = options.maxRetries ?? HTTPRequestController.defaultMaxRetries;
    this.retryDelayMin = options.retryDelayMin ?? HTTPRequestController.defaultRetryDelayMinMs;
    this.retryDelayMax = options.retryDelayMax ?? HTTPRequestController.defaultRetryDelayMaxMs;
    this.requestTimeout = options.requestTimeout ?? HTTPRequestController.defaultRequestTimeoutMs;
  }

  public get status$(): Observable<HTTPRequestStatus> {
    return this._status$.asObservable();
  }

  public get status(): HTTPRequestStatus {
    return this._status$.value;
  }

  public get responses$(): Observable<HTTPResponse> {
    return this._responses$.asObservable();
  }

  public get errors$(): Observable<Error> {
    return this._errors$.asObservable();
  }

  public async request(request: HTTPRequest): Promise<HTTPResponse> {
    this._status$.next('requesting');

    try {
      const response = await this.executeWithRetry(request);
      this._status$.next('success');
      this._responses$.next(response);
      return response;
    } catch (error) {
      logger.error('[HTTPRequestController] Request error:', error);
      this._status$.next('error');
      const err =
        error instanceof Error ? error : new Error('HTTP request failed', { cause: error });
      this._errors$.next(err);
      throw err;
    }
  }

  private async executeWithRetry(request: HTTPRequest): Promise<HTTPResponse> {
    // Calculate variation to spread delays evenly across retry attempts
    const variation = Math.ceil(
      (this.retryDelayMax - this.retryDelayMin) / Math.max(this.maxRetries - 1, 1)
    );

    const delayFn = increasingDelay({
      initialDelay: this.retryDelayMin,
      variation,
      delayLimit: this.retryDelayMax
    });

    return asyncRetry({
      asyncCallable: async () => this.executeRequest(request),
      maxRetries: this.maxRetries,
      delayFn,
      validator: (response) => {
        // Retry on 5xx server errors
        if (response.status >= 500 && response.status < 600) {
          throw new UnexpectedError(`Server error: ${response.status} ${response.statusText}`);
        }
      }
    });
  }

  private async executeRequest(request: HTTPRequest): Promise<HTTPResponse> {
    const url = this.buildURL(request.url);
    const headers = this.buildHeaders(request.headers);
    const timeout = request.timeout ?? this.requestTimeout;

    logger.debug('[HTTPRequestController] Executing request:', {
      method: request.method,
      url,
      headers: Object.keys(headers).reduce((acc, key) => {
        // Mask Authorization header for security
        // eslint-disable-next-line no-param-reassign
        acc[key] = key === 'Authorization' ? `${headers[key].substring(0, 20)}...` : headers[key];
        return acc;
      }, {} as HTTPHeaders),
      body: this.sanitizeBody(request.body)
    });
    // {"from_fabric_address_id":"03a98611-d38f-405a-af49-fcb51e7f22ad","fabric_address_ids":["31c0afc2-93f3-4530-9a7d-55613d40850d","03a98611-d38f-405a-af49-fcb51e7f22ad"]}
    // {"from_fabric_address_id":"060b5d3e-5df0-45d9-911e-660779e593da","fabric_address_ids":["31c0afc2-93f3-4530-9a7d-55613d40850d","060b5d3e-5df0-45d9-911e-660779e593da"]}

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const httpResponse = await this.convertResponse(response);

      logger.debug('[HTTPRequestController] Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
        body: httpResponse.body ? httpResponse.body.substring(0, 200) : '(empty)' // Show first 200 chars
      });

      return httpResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutError(`Request timeout after ${timeout}ms`, { cause: error });
      }

      logger.error('[HTTPRequestController] Request failed:', error);
      throw error;
    }
  }

  private buildURL(url: string | URL): string {
    const urlString = typeof url === 'string' ? url : url.toString();

    // If URL is absolute, return as-is
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      return urlString;
    }

    // Ensure base URL doesn't end with '/' and path starts with '/'
    const base = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    const path = urlString.startsWith('/') ? urlString : `/${urlString}`;

    return `${base}${path}`;
  }

  private buildHeaders(requestHeaders?: HTTPHeaders): HTTPHeaders {
    const headers: HTTPHeaders = { ...(requestHeaders ?? {}) };

    // Add authentication header
    const credential = this.getCredential();
    if (credential.token) {
      headers.Authorization = `Bearer ${credential.token}`;
      logger.debug(
        '[HTTPRequestController] Using Bearer token auth, token length:',
        credential.token.length
      );
    } else {
      logger.warn('[HTTPRequestController] No credentials available for authentication');
    }

    return headers;
  }

  /**
   * Sanitizes a request body for debug logging by masking sensitive fields.
   */
  private sanitizeBody(
    body:
      | string
      | Blob
      | ArrayBuffer
      | FormData
      | URLSearchParams
      | ReadableStream
      | null
      | undefined
  ): string | undefined {
    if (!body || typeof body !== 'string') {
      return body ? '(non-string body)' : undefined;
    }

    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      const sanitized = { ...parsed };
      for (const key of Object.keys(sanitized)) {
        if (
          HTTPRequestController.SENSITIVE_BODY_FIELDS.has(key) &&
          typeof sanitized[key] === 'string'
        ) {
          sanitized[key] = `${sanitized[key].substring(0, 20)}...[redacted]`;
        }
      }
      return JSON.stringify(sanitized);
    } catch {
      // Not JSON — return truncated
      return body.length > 200 ? `${body.substring(0, 200)}...` : body;
    }
  }

  private async convertResponse(response: Response): Promise<HTTPResponse> {
    // Convert Headers to plain object
    const headers: HTTPHeaders = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Read response body as text
    const bodyText = await response.text();

    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      body: bodyText,
      ok: response.ok,
      url: response.url
    };
  }
}
