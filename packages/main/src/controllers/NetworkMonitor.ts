import { takeUntil } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { getLogger } from '../utils/logger';

import type { Observable } from 'rxjs';

const logger = getLogger();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NetworkChangeEvent {
  type: 'online' | 'offline' | 'connection_change';
  timestamp: number;
  networkType?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely check whether we are running in a browser environment
 * with `window` and the relevant event targets.
 */
function hasBrowserNetworkEvents(): boolean {
  return typeof window !== 'undefined' && typeof window.addEventListener === 'function';
}

/**
 * Attempt to read the current effective type from the Network Information API.
 * Returns `undefined` when the API is not available.
 */
function getNetworkType(): string | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  // Network Information API is not universally typed
  const { connection } = navigator as NavigatorWithConnection;
  return connection?.effectiveType ?? undefined;
}

/**
 * Returns the `NetworkInformation` object when available, or `undefined`.
 */
function getNetworkConnection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  return (navigator as NavigatorWithConnection).connection ?? undefined;
}

// ---------------------------------------------------------------------------
// Navigator extension for Network Information API
// ---------------------------------------------------------------------------

interface NetworkInformation extends EventTarget {
  readonly effectiveType?: string;
  readonly type?: string;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
}

// ---------------------------------------------------------------------------
// NetworkMonitor
// ---------------------------------------------------------------------------

/**
 * Monitors browser-level network connectivity events (online / offline)
 * and, where supported, the Network Information API for connection type changes.
 *
 * Safe for non-browser environments — all event listeners are guarded by
 * feature checks and no-op gracefully when `window` is unavailable.
 */
export class NetworkMonitor extends Destroyable {
  // --- Observables (private subjects) ---
  private readonly _isOnline$ = this.createBehaviorSubject<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  private readonly _networkChange$ = this.createSubject<NetworkChangeEvent>();

  // --- Bound listeners (for removal on destroy) ---
  private readonly _onOnline = this.handleOnline.bind(this);
  private readonly _onOffline = this.handleOffline.bind(this);
  private readonly _onConnectionChange = this.handleConnectionChange.bind(this);

  // Track whether listeners are attached
  private _listenersAttached = false;

  constructor() {
    super();
    this.attachListeners();
  }

  // --- Public observable getters ---

  public get isOnline$(): Observable<boolean> {
    return this._isOnline$.asObservable().pipe(takeUntil(this._destroyed$));
  }

  public get isOnline(): boolean {
    return this._isOnline$.value;
  }

  public get networkChange$(): Observable<NetworkChangeEvent> {
    return this._networkChange$.asObservable().pipe(takeUntil(this._destroyed$));
  }

  // --- Lifecycle ---

  public override destroy(): void {
    this.removeListeners();
    super.destroy();
  }

  // --- Private helpers ---

  private attachListeners(): void {
    if (!hasBrowserNetworkEvents()) {
      logger.debug('NetworkMonitor: no browser environment detected, skipping event listeners');
      return;
    }

    window.addEventListener('online', this._onOnline);
    window.addEventListener('offline', this._onOffline);

    const connection = getNetworkConnection();
    if (connection) {
      connection.addEventListener('change', this._onConnectionChange);
    }

    this._listenersAttached = true;
    logger.debug('NetworkMonitor: event listeners attached');
  }

  private removeListeners(): void {
    if (!this._listenersAttached) {
      return;
    }

    if (hasBrowserNetworkEvents()) {
      window.removeEventListener('online', this._onOnline);
      window.removeEventListener('offline', this._onOffline);

      const connection = getNetworkConnection();
      if (connection) {
        connection.removeEventListener('change', this._onConnectionChange);
      }
    }

    this._listenersAttached = false;
    logger.debug('NetworkMonitor: event listeners removed');
  }

  private handleOnline(): void {
    logger.info('NetworkMonitor: browser went online');
    this._isOnline$.next(true);
    this._networkChange$.next({
      type: 'online',
      timestamp: Date.now(),
      networkType: getNetworkType()
    });
  }

  private handleOffline(): void {
    logger.info('NetworkMonitor: browser went offline');
    this._isOnline$.next(false);
    this._networkChange$.next({
      type: 'offline',
      timestamp: Date.now()
    });
  }

  private handleConnectionChange(): void {
    const networkType = getNetworkType();
    logger.info(`NetworkMonitor: connection changed — effectiveType=${networkType ?? 'unknown'}`);
    this._networkChange$.next({
      type: 'connection_change',
      timestamp: Date.now(),
      networkType
    });
  }
}
