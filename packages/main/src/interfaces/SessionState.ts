import type { ClientSession } from './ClientSession';
import type { Call } from '../core/entities/types/call.types';
import type { Observable } from 'rxjs';

/**
 * Extended session interface that adds call management and authentication
 * state on top of the narrow ClientSession contract.
 *
 * Accessible via `client.session`. Call and CallFactory continue to depend
 * only on the narrow ClientSession interface.
 */
export interface SessionState extends ClientSession {
  /**
   * Observable stream of currently active inbound calls.
   * Filters `calls$` to only include calls with `direction === 'inbound'`.
   */
  readonly incomingCalls$: Observable<Call[]>;

  /**
   * Current snapshot of active inbound calls.
   */
  readonly incomingCalls: Call[];

  /**
   * Observable stream of all currently active calls (both inbound and outbound).
   */
  readonly calls$: Observable<Call[]>;

  /**
   * Current snapshot of all active calls.
   */
  readonly calls: Call[];

  /**
   * Observable that emits `true` once the session has been authenticated,
   * and `false` after disconnect.
   */
  readonly authenticated$: Observable<boolean>;

  /**
   * Current authentication state.
   * Returns `true` if the session is currently authenticated.
   */
  readonly authenticated: boolean;
}
