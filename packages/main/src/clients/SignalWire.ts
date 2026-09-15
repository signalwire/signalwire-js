import { jwtDecode } from 'jwt-decode';
import { filter, firstValueFrom, of, skip, switchMap, type Observable } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { DependencyContainer } from '../containers/DependencyContainer';
import { ClientPreferences, PreferencesContainer } from '../containers/PreferencesContainer';
import { CryptoController } from '../controllers/CryptoController';
import { HTTPRequestController } from '../controllers/HTTPRequestController';
import { NetworkMonitor } from '../controllers/NetworkMonitor';
import { detectPlatformCapabilities } from '../controllers/PlatformCapabilities';
import { PreflightRunner } from '../controllers/PreflightRunner';
import { VisibilityController } from '../controllers/VisibilityController';
import { User } from '../core/entities/User';
import { InvalidCredentialsError, UnexpectedError } from '../core/errors';
import { RPCExecute } from '../core/RPCMessages';
import { AttachManager } from '../managers/AttachManager';
import { ClientSessionManager, ClientSessionWrapper } from '../managers/ClientSessionManager';
import { ConversationsManager } from '../managers/ConversationsManager';
import { CredentialRefreshCoordinator } from '../managers/CredentialRefreshCoordinator';
import { DiagnosticsCollector } from '../managers/DiagnosticsCollector';
import { DirectoryManager } from '../managers/DirectoryManager';
import { TransportManager } from '../managers/TransportManager';
import { isRecoverableAuthError } from '../utils/authRecovery';
import { getLogger, setLogger, setDebugOptions, setLogLevel } from '../utils/logger';

import type { Address } from '../core/entities/Address';
import type { Directory } from '../core/entities/Directory';
import type { Call } from '../core/entities/types/call.types';
import type {
  NodeSocketAdapter,
  SDKCredential,
  WebSocketAdapter
} from '../core/types/common.types';
import type { MediaOptions } from '../core/types/media.types';
import type {
  PlatformCapabilities,
  DeviceRecoveryEvent,
  PermissionResult,
  PreflightOptions,
  PreflightResult,
  SessionDiagnostics
} from '../core/types/resilience.types';
import type { SDKWarning } from '../core/types/warnings.types';
import type { CredentialProvider, Storage, WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';
import type { SDKLogger, LogLevel, DebugOptions } from '../utils/logger';

const logger = getLogger();

/**
 * Storage key for the client-bound marker. The SAT and authorization_state are
 * both opaque to the SDK, so on a page reload the preflight recovery — which
 * runs before any session exists — has no other way to know the session was
 * client-bound. See {@link SignalWire.persistClientBoundMarker}.
 */
const CLIENT_BOUND_STORAGE_KEY = 'sw:client_bound';

interface JWTHeader {
  ch?: string;
  typ?: string;
}
/** Options for constructing a {@link SignalWire}. */
export interface SignalWireOptions {
  /** Skip automatic WebSocket connection on construction. */
  skipConnection?: boolean;
  /** Skip automatic user registration on construction. */
  skipRegister?: boolean;
  /** Skip monitoring media device changes. */
  skipDeviceMonitoring?: boolean;
  /** Whether to reconnect to previously attached calls. */
  reconnectAttachedCalls?: boolean;
  /** Whether to save preferences. */
  savePreferences?: boolean;
  /**
   * Persist the session across page reloads.
   *
   * When `true`, credential, authorization state, and protocol are stored in
   * `localStorage` (survives reload). The DPoP key pair is persisted in
   * IndexedDB. On reload, the SDK restores the session from cache
   * without calling `credentialProvider.authenticate()`.
   *
   * When `false` (default), session data lives in `sessionStorage` and is
   * lost on reload.
   *
   * Both {@link SignalWire.disconnect | disconnect()} and
   * {@link SignalWire.destroy | destroy()} end the session and clear the
   * persisted resume state and attach records; credentials and device
   * preferences survive. Use `resetToDefaults()` for a full wipe, or
   * `unregister()` to temporarily stop receiving inbound calls while keeping
   * the session alive.
   */
  persistSession?: boolean;
  /** Custom storage implementation for persistence. */
  storageImplementation?: Storage;
  /** Custom WebSocket constructor */
  webSocketConstructor?: WebSocketAdapter | NodeSocketAdapter;
  /** Custom WebRTC API provider */
  webRTCApiProvider?: WebRTCApiProvider;
  /**
   * Custom logger implementation. Must implement the {@link SDKLogger} interface.
   * Pass `null` to restore the built-in logger.
   *
   * **Note:** Logger configuration is global — setting it on one instance affects all instances.
   */
  logger?: SDKLogger | null;
  /**
   * Log level for the built-in logger.
   * Default: `'warn'`. Set to `'debug'` for verbose SDK output.
   * Has no effect when a custom `logger` is provided.
   *
   * **Note:** Logger configuration is global — setting it on one instance affects all instances.
   */
  logLevel?: LogLevel;
  /** Debug options for verbose SDK diagnostics (e.g., `{ logWsTraffic: true }`). */
  debug?: DebugOptions;
  /**
   * Control transport for `call.*` verbs across ALL calls in this session:
   * - `'routed'` (default) sends them on the client's session channel.
   * - `'in-dialog'` carries them on each call's own signaling channel via `verto.info`,
   *   so control works without the client needing to know how the conference is hosted.
   *
   * `'in-dialog'` is opt-in because it does not reach everywhere `'routed'` does: use it
   * only for calls that join a conference over SWML (e.g. an SWML `join_conference`).
   *
   * It is a client-wide setting rather than per-`dial()` because the SDK issues some
   * control RPCs itself (fetching the layout list on join, for example), and those must
   * travel the same way as the app's own, or reads and writes land on different transports.
   *
   * @experimental A rollout switch, not a long-term part of the API. Expected to
   * disappear once `'in-dialog'` becomes the only transport, so it carries no semver
   * promise and application code should not depend on it.
   */
  callControl?: 'routed' | 'in-dialog';
}

/** Options for {@link SignalWire.dial}. Extends {@link MediaOptions} with dial-specific settings. */
export interface DialOptions extends MediaOptions {
  /** Preferred video codecs for this call (overrides global preferences). */
  preferredVideoCodecs?: string[];
  /** Preferred audio codecs for this call (overrides global preferences). */
  preferredAudioCodecs?: string[];
  /** Enable stereo Opus for this call (overrides global preferences). */
  stereo?: boolean;
  /** Optional node ID for routing the call */
  nodeId?: string;
  /**
   * Custom variables sent with the Verto invite. Merged with
   * `client.preferences.userVariables` and any query-string variables on the
   * destination URI; values here take precedence.
   */
  userVariables?: Record<string, unknown>;
}

const buildOptionsFromDestination = (destination: string | Address): DialOptions => {
  if (typeof destination === 'string') {
    const queryStartIndex = destination.indexOf('?');
    if (queryStartIndex !== -1) {
      const queryString = destination.substring(queryStartIndex + 1);
      const params = new URLSearchParams(queryString);
      const channel = params.get('channel');

      if (channel === 'video') {
        return { audio: true, video: true, receiveVideo: true };
      } else if (channel === 'audio') {
        return { audio: true, video: false };
      }
    }
  }

  return {};
};
/**
 * Main entry point for the SignalWire Browser SDK.
 *
 * Manages authentication, WebSocket transport, call creation, and media devices.
 *
 * @example
 * ```ts
 * const client = new SignalWire(credentialProvider);
 * client.isConnected$.subscribe(connected => console.log('Connected:', connected));
 * const call = await client.dial('/public/my-room');
 * ```
 */
class SignalWire extends Destroyable implements DeviceController {
  /** Global SDK preferences (timeouts, ICE config, media defaults). */
  public preferences = new ClientPreferences();
  private _user$ = this.createBehaviorSubject<User | undefined>(undefined);
  private _directory$ = this.createBehaviorSubject<Directory | undefined>(undefined);
  private _transport!: TransportManager;
  private _clientSession!: ClientSessionManager;
  private _publicSession!: ClientSessionWrapper;
  private _deviceController!: DeviceController;
  private _attachManager?: AttachManager;
  /**
   * Set once a credential recovery has been *verified* — reauthenticated and
   * then proven by the operation it was meant to unblock. Read by the attach
   * path, which may only discard an attach record when a reattach is refused
   * on a credential the server has already accepted.
   */
  private _credentialRecovered = false;
  private _isConnected$ = this.createBehaviorSubject<boolean>(false);
  private _isRegistered$ = this.createBehaviorSubject<boolean>(false);
  private _errors$ = this.createReplaySubject<Error>(1);
  private _warnings$ = this.createReplaySubject<SDKWarning>(10);
  private _options: SignalWireOptions = {};
  private _dpopManager?: CryptoController;
  private _refreshCoordinator?: CredentialRefreshCoordinator;
  /** The refresh path's own HTTP controller — see resolveCredentials. */
  private _refreshHttp?: HTTPRequestController;
  /** Host `_refreshHttp` was built against, so it can be rebuilt when the token's `ch` changes. */
  private _refreshHttpHost?: string;
  private _credentialProvider?: CredentialProvider;
  private _deps = new DependencyContainer();

  // Resilience subsystems
  private _networkMonitor?: NetworkMonitor;
  private _visibilityController?: VisibilityController;
  private _diagnosticsCollector?: DiagnosticsCollector;
  private _platformCapabilities?: PlatformCapabilities;

  /**
   * Creates a new SignalWire client and begins connecting.
   *
   * @param credentialProvider - Provider that supplies authentication credentials.
   * @param options - Configuration options (connection, device monitoring, preferences).
   */
  constructor(credentialProvider: CredentialProvider | undefined, options: SignalWireOptions = {}) {
    super();
    this._credentialProvider = credentialProvider;
    this._options = {
      ...PreferencesContainer.instance.defaultSignalWireOptions,
      ...options
    };

    // Set custom storage implementation if provided
    if (this._options.storageImplementation) {
      this._deps.storageImpl = this._options.storageImplementation;
    }

    if (this._options.persistSession) {
      this._deps.persistSession = true;
    }

    if (this._options.webSocketConstructor) {
      this._deps.WebSocket = this._options.webSocketConstructor;
    }

    if (this._options.savePreferences) {
      this.preferences.enableSavePreferences(this._deps.storage);
    }

    if (this._options.webRTCApiProvider) {
      this._deps.webRTCApiProvider = this._options.webRTCApiProvider;
    }

    // Configure logger from options
    if (this._options.logger !== undefined) {
      setLogger(this._options.logger);
    }
    if (this._options.logLevel) {
      setLogLevel(this._options.logLevel);
    }
    if (this._options.debug) {
      setDebugOptions(this._options.debug);
    }

    this._deviceController = this._deps.deviceController;
    if (!this._options.skipDeviceMonitoring) {
      this._deviceController.enableDeviceMonitoring();
    }

    this.subscribeTo(this._deviceController.errors$, (error) => {
      this._errors$.next(error);
    });

    // Initialize resilience subsystems (non-fatal)
    this.initResilienceSubsystems();

    this.resolveCredentials()
      .then(() => {
        this.init().catch((error: unknown) => {
          logger.error('[SignalWire] Initialization error:', error);
          // Clear stale cached credential so next attempt starts fresh
          void this._deps.storage.removeItem('sw:cached_credential');
          void this._deps.storage.removeItem('sw:cached_credential', 'local');
          this._errors$.next(
            error instanceof Error ? error : new Error(String(error), { cause: error })
          );
        });
      })
      .catch((error: unknown) => {
        logger.error('[SignalWire] Initialization error:', error);
        this._errors$.next(
          error instanceof Error ? error : new Error(String(error), { cause: error })
        );
      });
  }

  /**
   * Build the refresh path's own HTTP controller, against whatever host is current.
   *
   * Called on first use rather than up front, so `apiHost` already reflects the
   * token's `ch` claim. Same credential source as the container's controller — only
   * the instance, and therefore its observable streams, is separate.
   */
  private createRefreshHttpController(): HTTPRequestController {
    return new HTTPRequestController(this._deps.apiHost, () => this._deps.credential);
  }

  /**
   * Initializes DPoP if not already set up. Returns the fingerprint on success.
   */
  private async initDPoP(): Promise<string | undefined> {
    if (this._dpopManager?.initialized) {
      return this._dpopManager.fingerprint;
    }
    try {
      this._dpopManager = new CryptoController();
      const fingerprint = await this._dpopManager.init();
      logger.debug('[SignalWire] DPoP initialized, fingerprint available');
      return fingerprint;
    } catch (error) {
      logger.warn('[SignalWire] DPoP initialization failed, proceeding without DPoP:', error);
      this._dpopManager = undefined;
      return undefined;
    }
  }

  /**
   * Resolves credentials using cache-first strategy when persistSession is enabled.
   *
   * 1. If persistSession → check localStorage for cached credential
   * 2. If cached and not expired → use it (skip provider.authenticate())
   * 3. If no cache or expired → call provider.authenticate()
   * 4. If no provider AND no cache → throw
   */
  private async resolveCredentials(): Promise<void> {
    const fingerprint = await this.initDPoP();

    // Coordinator centralizes refresh ownership across the developer-provided
    // and Client Bound SAT paths. Constructed after DPoP init so it can decide
    // whether the internal path is available.
    this._refreshCoordinator = new CredentialRefreshCoordinator(this._dpopManager, {
      // Dedicated and lazily built, and both halves are load-bearing.
      //
      // Lazy, because this constructor runs BEFORE validateCredentials decodes the
      // token's `ch` claim, so the host is not known yet. Resolving on first use
      // instead means `_deps.apiHost` has already been corrected.
      //
      // Dedicated, because the obvious lazy form — `() => this._deps.http` — hands
      // this path the container's SHARED controller, and that regressed reattach:
      // register came back "Requester validation failed" on a reload, on a host
      // where no request changed URL at all. Reading `_deps.http` eagerly, as the
      // original code did, memoized a controller that `set ch` then discarded, so
      // the refresh path had an instance of its own with its own status/error/
      // response subjects. That isolation was accidental but it is real, so keep it
      // deliberately rather than moving device-token traffic onto the shared one.
      http: () => {
        // Rebuild if the host changed since the cached controller was built. A second
        // credential with a different `ch` claim repoints _deps.apiHost (the container
        // drops its own controller too); refresh/device-token traffic must follow it or
        // it 401s against the old host with the same misleading bare `Unauthorized`.
        if (!this._refreshHttp || this._refreshHttpHost !== this._deps.apiHost) {
          this._refreshHttp?.destroy();
          this._refreshHttp = this.createRefreshHttpController();
          this._refreshHttpHost = this._deps.apiHost;
        }
        return this._refreshHttp;
      },
      notifier: {
        onError: (error) => this._errors$.next(error),
        onWarning: (warning) => this._warnings$.next(warning),
        onRefreshExhausted: () => void this.disconnect(),
        onCredentialRefreshed: async (credential) => this.reauthenticateLiveSession(credential)
      },
      store: {
        read: () => this._deps.credential,
        write: (credential) => {
          this._deps.credential = credential;
        },
        merge: (partial) => {
          this._deps.credential = { ...this._deps.credential, ...partial };
          // Persist so a Client Bound SAT survives a page reload. The stored
          // token is useless without the DPoP key (IndexedDB) — the binding
          // itself is the theft protection.
          this.persistCredential(this._deps.credential);
        },
        persist: (credential) => this.persistCredential(credential)
      }
    });

    // If a provider is given, use it — fresh login always wins over stale cache.
    // Cache is only used when there's no provider (reload / session restore).
    if (this._credentialProvider) {
      return this.validateCredentials(this._credentialProvider, undefined, fingerprint);
    }

    // No provider — check for cached credential: localStorage first (persistSession),
    // then sessionStorage (reload within same tab).
    for (const scope of this._deps.persistSession
      ? (['local', 'session'] as const)
      : (['session'] as const)) {
      try {
        const cached = await this._deps.storage.getItem<SDKCredential>(
          'sw:cached_credential',
          scope
        );
        if (cached?.token) {
          logger.debug(`[SignalWire] Using cached credential from ${scope}Storage`);
          return await this.validateCredentials(undefined, cached);
        }
      } catch {
        // continue to next scope
      }
    }

    throw new InvalidCredentialsError(
      'No credential provider and no cached session. Provide a CredentialProvider or enable persistSession with a prior login.'
    );
  }

  private async validateCredentials(
    credentialProvider: CredentialProvider | undefined,
    credentials?: SDKCredential,
    fingerprint?: string
  ): Promise<void> {
    const _fingerprint =
      fingerprint ?? (this._dpopManager?.initialized ? this._dpopManager.fingerprint : undefined);

    const _credentials =
      credentials ??
      (credentialProvider
        ? await credentialProvider.authenticate(
            _fingerprint ? { fingerprint: _fingerprint } : undefined
          )
        : undefined);

    if (!_credentials) {
      throw new InvalidCredentialsError('No credentials available.');
    }
    if (_credentials.token) {
      try {
        const decodeHeader: JWTHeader = jwtDecode(_credentials.token, { header: true });
        this._deps.ch = decodeHeader.ch;
      } catch (error) {
        logger.error('[SignalWire] Invalid JWT token provided in credentials:', error);
        throw new InvalidCredentialsError('Invalid JWT token provided in credentials.', {
          cause: error
        });
      }
    }
    if (!_credentials.token && !_credentials.authorizationState) {
      logger.error('[SignalWire] No valid authentication credentials provided.');
      throw new InvalidCredentialsError('No valid authentication credentials provided.');
    }

    // Skip client-side expiry check when using cached credentials for reconnect.
    // The server validates via authorization_state — even expired tokens work
    // when authorization_state is present (session continuity).
    if (
      !this._deps.persistSession &&
      _credentials.expiry_at &&
      _credentials.expiry_at < Date.now()
    ) {
      logger.error('[SignalWire] Provided credentials have expired.');
      throw new InvalidCredentialsError('Provided credentials have expired.');
    }

    if (_credentials.expiry_at && credentialProvider?.refresh) {
      this._refreshCoordinator?.scheduleDeveloperRefresh(
        credentialProvider,
        _credentials.expiry_at
      );
    } else if (_credentials.expiry_at && !credentialProvider?.refresh) {
      // Credential has a known expiry but no refresh handler. Unless the SAT
      // has `sat:refresh` scope (handled by DeviceTokenManager), the session
      // will terminate at expiry with no fallback.
      logger.warn(
        `[SignalWire] [SW-NO-REFRESH-HANDLER] Credential has expiry_at=${_credentials.expiry_at} but no refresh handler. Session will terminate at expiry unless the SAT has 'sat:refresh' scope.`
      );
      this._warnings$.next({
        code: 'credential_no_refresh_handler',
        source: 'CredentialProvider',
        message:
          "Credential has expiry_at but no refresh handler. Session will terminate at expiry unless the SAT carries 'sat:refresh' scope.",
        expiresAt: _credentials.expiry_at
      });
    }

    this._deps.credential = _credentials;
    this.persistCredential(_credentials);

    await this.reauthenticateLiveSession(_credentials);
  }

  /**
   * Reauthenticate the currently-open session with a freshly obtained
   * credential so the new token takes effect on the live socket immediately —
   * not just on the next reconnect. No-op when the session is not
   * connected/authenticated or the credential carries no token (e.g. an
   * authorization-state-only refresh). Non-fatal: reauth failures surface on
   * `errors$` without aborting the refresh that triggered this.
   */
  private async reauthenticateLiveSession(credential: SDKCredential): Promise<void> {
    if (!this.isConnected || !this._clientSession.authenticated || !credential.token) {
      return;
    }
    try {
      await this._clientSession.reauthenticate(credential.token);
      logger.info('[SignalWire] Session refreshed with new credentials.');
    } catch (error: unknown) {
      logger.error('[SignalWire] Failed to refresh session with new credentials:', error);
      this._errors$.next(
        error instanceof Error ? error : new Error(String(error), { cause: error })
      );
    }
  }

  /**
   * Recover a session the server is refusing: mint a fresh credential,
   * reauthenticate the live session with it, and retry the operation.
   *
   * The connection is deliberately kept. A reload authenticates the new socket
   * against the persisted `authorization_state`, and that handshake is what
   * associates the socket with the previous session — the association reattach
   * depends on. `signalwire.reauthenticate` swaps the credential *on that same
   * session*, so recovery never touches the resume state. Discarding it would
   * heal the credential by destroying the very thing the caller is trying to
   * get back to.
   *
   * The operation is still the verdict, never the RPC. Reauthenticating with
   * the in-memory token is accepted by a resume even while requests stay
   * refused, because the persisted `authorization_state` short-circuits token
   * validation — and `signalwire.reauthenticate` with a *freshly minted* token
   * has also been observed accepted while `subscriber.online` keeps being
   * refused (staging run 33826974634). Both look like success and are not.
   *
   * @returns the operation's value, or the reason recovery could not deliver
   *   one. `error` is undefined when there was no way to mint at all.
   */
  private async recoverAndRetry<T>(
    operation: () => Promise<T>
  ): Promise<{ ok: true; value: T } | { ok: false; error?: unknown }> {
    if (!(await this.remintAndReauthenticate())) {
      return { ok: false };
    }
    try {
      const value = await operation();
      // The reauthentication is only now known to have taken effect. Anything
      // that must distinguish "the server refuses this credential" from "the
      // server refuses this request" reads this, not the RPC result.
      this._credentialRecovered = true;
      return { ok: true, value };
    } catch (error) {
      logger.warn(
        '[SignalWire] Reauthentication was accepted but the operation is still refused:',
        error
      );
      return { ok: false, error };
    }
  }

  /**
   * Re-mint a credential and adopt it only if the live session accepts it.
   *
   * The mechanism follows the binding: a client-bound session re-mints a bound
   * base SAT through `authenticate()` with the DPoP fingerprint, because the
   * developer refresh handler would hand back an unbound token and silently
   * degrade the session. An unbound session uses the refresh handler. Rotation
   * cost is not a reason to skip this — the only reason is having no mechanism.
   *
   * @returns whether the session is now running on a freshly accepted credential.
   */
  private async remintAndReauthenticate(): Promise<boolean> {
    const provider = this._credentialProvider;
    if (!provider) {
      return false;
    }
    const { clientBound } = this._clientSession;
    if (!clientBound && !provider.refresh) {
      // authenticate() may be interactive, so it is not a silent fallback here.
      logger.debug(
        '[SignalWire] [SW-NO-REFRESH-HANDLER] Unbound session with no refresh handler; cannot re-mint.'
      );
      return false;
    }

    try {
      const newCredentials = clientBound
        ? await provider.authenticate(
            this._dpopManager?.initialized
              ? { fingerprint: this._dpopManager.fingerprint }
              : undefined
          )
        : await this.remintCredential(provider);

      if (!newCredentials.token) {
        logger.warn('[SignalWire] Re-minted credential has no token; keeping the current one.');
        return false;
      }

      // Adopt only after the server accepts it, so a refused token is never
      // left behind as the current credential.
      await this._clientSession.reauthenticate(newCredentials.token);
      this._deps.credential = newCredentials;
      this.persistCredential(newCredentials);
      if (newCredentials.expiry_at && provider.refresh) {
        this._refreshCoordinator?.scheduleDeveloperRefresh(provider, newCredentials.expiry_at);
      }
      return true;
    } catch (error) {
      logger.warn('[SignalWire] Re-mint recovery failed:', error);
      return false;
    }
  }

  /**
   * Re-mint a credential via `provider.refresh()`, routed through the
   * coordinator's shared in-flight guard so concurrent re-mint paths (a
   * scheduled/resume refresh, -32003 recovery, and reconnect) never fire a
   * second `provider.refresh()` in parallel — which rotating one-time-use
   * refresh tokens reject. Falls back to a direct call only if the coordinator
   * has not been constructed yet.
   */
  private async remintCredential(provider: CredentialProvider): Promise<SDKCredential> {
    if (this._refreshCoordinator) {
      return this._refreshCoordinator.refreshCredential(provider);
    }
    if (!provider.refresh) {
      throw new InvalidCredentialsError('Credential provider does not support refresh');
    }
    return provider.refresh();
  }

  /**
   * Re-mint credentials before a fresh (re)connect (`onBeforeReconnect` hook).
   * The session invokes this only when it is client-bound OR the in-memory
   * token is expired. The re-mint mechanism depends on the binding:
   *   - Client-bound: `authenticate()` with the DPoP fingerprint to obtain a
   *     fresh base SAT the upcoming reconnect can re-bind (the
   *     DeviceTokenManager re-activates afterwards).
   *   - Unbound: the developer's non-interactive `refresh()` handler.
   *     `authenticate()` is deliberately NOT used here — it may be interactive
   *     (a login prompt) and must not fire on a background reconnect.
   *
   * Rejects on failure so the session aborts the reconnect rather than
   * replaying a stale token.
   */
  private async refreshCredentialForReconnect(): Promise<void> {
    if (!this._credentialProvider) return;
    try {
      let newCredentials: SDKCredential;
      // A live session reports its own binding. The preflight-fetch recovery runs
      // before any session exists (page reload), where the token and
      // authorization_state are both opaque to the SDK — so the persisted marker
      // is the only way to know the reloaded session was client-bound. Without it
      // a client-bound session with a refresh handler is re-minted as an unbound
      // token and silently degraded.
      // `_clientSession` is `!`-typed so the optional chain looks unnecessary to
      // the linter, but it is genuinely undefined on that pre-connect path. `??`
      // (not `||`) is deliberate: a live unbound session reports `false` and must
      // keep it, not fall through to the marker.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const clientBound = this._clientSession?.clientBound ?? (await this.wasClientBound());
      if (clientBound) {
        logger.debug('[SignalWire] Re-minting client-bound base SAT before reconnect');
        newCredentials = await this._credentialProvider.authenticate(
          this._dpopManager?.initialized
            ? { fingerprint: this._dpopManager.fingerprint }
            : undefined
        );
      } else if (this._credentialProvider.refresh) {
        logger.debug('[SignalWire] Refreshing unbound credential before reconnect');
        newCredentials = await this.remintCredential(this._credentialProvider);
      } else {
        // Unbound and expired but no refresh handler: cannot re-mint
        // non-interactively. Let the connect proceed with the existing token
        // (it will fail and surface a credentials error) rather than trigger
        // a potentially-interactive authenticate().
        logger.warn(
          '[SignalWire] [SW-NO-REFRESH-HANDLER] Token expired on reconnect but no refresh handler; reconnecting with the existing token.'
        );
        return;
      }
      if (!newCredentials.token) {
        // A fresh connect authenticates with jwt_token; an authorization-state-
        // only re-mint cannot satisfy it. Keep the existing credential so the
        // reconnect surfaces a clear failure rather than a DependencyError.
        logger.warn(
          '[SignalWire] Re-minted credential has no token; keeping the existing credential for reconnect.'
        );
        return;
      }
      this._deps.credential = newCredentials;
      this.persistCredential(newCredentials);
      // Re-arm the developer refresh timer against the new credential's expiry.
      // If Client Bound SAT activation succeeds on the upcoming reconnect, the
      // coordinator will cancel it. This closes the "reconnect did not re-arm
      // developer refresh" gap.
      if (newCredentials.expiry_at && this._credentialProvider.refresh) {
        this._refreshCoordinator?.scheduleDeveloperRefresh(
          this._credentialProvider,
          newCredentials.expiry_at
        );
      }
      logger.debug('[SignalWire] Credential refreshed successfully for reconnect');
    } catch (error) {
      logger.error('[SignalWire] Failed to refresh credentials for reconnect:', error);
      this._errors$.next(
        error instanceof Error ? error : new Error(String(error), { cause: error })
      );
      // Propagate to prevent reconnect with stale credentials
      throw error;
    }
  }

  /** Persist credential to localStorage when persistSession is enabled. */
  private persistCredential(credential: SDKCredential): void {
    if (!credential.token) return;
    // Always write to sessionStorage (reload within same tab)
    void this._deps.storage.setItem('sw:cached_credential', credential);
    // Also write to localStorage when persistSession (survives new tabs)
    if (this._deps.persistSession) {
      void this._deps.storage.setItem('sw:cached_credential', credential, 'local');
    }
  }

  /**
   * Persist whether the session is client-bound, mirroring the credential's
   * storage scopes so it survives a reload. The preflight recovery reads it
   * before any session exists to decide whether to re-bind via `authenticate()`
   * or refresh an unbound token; the marker tracks the latest binding, so an
   * unbound reconnect clears a stale marker from an earlier client-bound login.
   */
  private persistClientBoundMarker(bound: boolean): void {
    const scopes = this._deps.persistSession
      ? (['session', 'local'] as const)
      : (['session'] as const);
    for (const scope of scopes) {
      if (bound) {
        void this._deps.storage.setItem(CLIENT_BOUND_STORAGE_KEY, true, scope);
      } else {
        void this._deps.storage.removeItem(CLIENT_BOUND_STORAGE_KEY, scope);
      }
    }
  }

  /** Read the persisted client-bound marker (see {@link persistClientBoundMarker}). */
  private async wasClientBound(): Promise<boolean> {
    const scopes = this._deps.persistSession
      ? (['local', 'session'] as const)
      : (['session'] as const);
    for (const scope of scopes) {
      try {
        if (await this._deps.storage.getItem<boolean>(CLIENT_BOUND_STORAGE_KEY, scope)) {
          return true;
        }
      } catch {
        // try the next scope
      }
    }
    return false;
  }

  private async init() {
    // Initialize user first (before transport) to fetch user info
    this._user$.next(new User(this._deps.http));

    if (!this._options.skipConnection) {
      await this.connect();
    }

    // Flush attached calls after connect creates the AttachManager
    if (!this._options.reconnectAttachedCalls && this._attachManager) {
      await this._attachManager.flush();
    }

    if (!this._options.skipRegister) {
      // eventually register after the authentication
      try {
        await this.register();
      } catch (error) {
        logger.error('[SignalWire] Registration failed:', error);
        this._errors$.next(
          error instanceof Error ? error : new Error(String(error), { cause: error })
        );
      }
    }

    // eventually reconnect to attached calls after the authentication
    void this.handleAttachments();
  }

  private async handleAttachments() {
    if (!this._attachManager) {
      logger.error('[SignalWire] AttachManager not initialized');
      return;
    }
    if (!this._options.reconnectAttachedCalls) {
      return;
    }
    try {
      await this._attachManager.reattachCalls();
    } catch (error) {
      logger.error('[SignalWire] Failed to reattach calls:', error);
      this._errors$.next(
        error instanceof Error ? error : new Error(String(error), { cause: error })
      );
    } finally {
      // Consume the recovery signal: reattach has read it, and a stale `true`
      // must not authorize a discard on a later reattach whose failure was only
      // transient. It reflects a recovery since the last reattach, nothing older.
      this._credentialRecovered = false;
    }
  }

  /**
   * Fetch the authenticated user profile, recovering a stale credential.
   *
   * On a reload the persisted credential can be expired. Unlike the WS resume —
   * which the server accepts against the persisted `authorization_state` even
   * with an expired token — this REST preflight has no such short-circuit and is
   * refused (401). There is no session yet to reauthenticate, so recovery
   * re-mints the credential through the provider ({@link refreshCredentialForReconnect})
   * and retries with a FRESH {@link User}: Fetchable memoizes its result
   * (shareReplay), so reusing the instance would replay the 401 instead of
   * re-fetching with the new token. Without the user id the transport/session —
   * and the reattach a reload is trying to preserve — cannot even be addressed.
   */
  private async fetchUserOrRecover(): Promise<void> {
    const fetchUser = async (user: User): Promise<void> => {
      const fetched = await firstValueFrom(user.fetched$);
      if (!fetched) {
        throw new UnexpectedError('Failed to fetch user information - fetched$ emitted false');
      }
      this._deps.user = user;
    };

    const user = this._user$.value;
    if (!user) {
      throw new UnexpectedError('User not initialized before connect');
    }

    try {
      await fetchUser(user);
    } catch (firstError) {
      logger.error(
        `[SignalWire] Failed to fetch user information: ${firstError instanceof Error ? firstError.message : 'Unknown error'}. ` +
          `This usually means the user token is invalid or expired. Re-minting the credential and retrying.`
      );
      try {
        await this.refreshCredentialForReconnect();
        const refetched = new User(this._deps.http);
        await fetchUser(refetched);
        this._user$.next(refetched);
      } catch (retryError) {
        throw new UnexpectedError('Error fetching user information', { cause: retryError });
      }
    }
  }

  /**
   * Establishes the WebSocket connection and authenticates the session.
   *
   * ## Reconnection behavior
   *
   * After a successful connection the underlying {@link WebSocketController}
   * automatically attempts to reconnect whenever the socket closes
   * unexpectedly (e.g. network change, server restart). Reconnection uses an
   * **exponential back-off** strategy:
   *
   * - First retry after `reconnectDelayMin` (default **0.1 s**).
   * - Each subsequent retry doubles the delay up to `reconnectDelayMax`
   *   (default **3 s**).
   * - The delay resets to `reconnectDelayMin` once a connection succeeds.
   * - A per-attempt `connectionTimeout` (default **10 s**) aborts the
   *   attempt and schedules the next retry if the server does not respond.
   *
   * Calling {@link disconnect} stops the reconnection loop entirely.
   *
   * ## Message handling during temporary disconnections
   *
   * While the socket is not in the `connected` state, **outgoing messages
   * are queued** in an internal buffer. Once the connection is
   * re-established the queue is flushed in order so no outgoing RPC call is
   * lost.
   *
   * **Incoming** server-to-client messages that arrive while the socket is
   * down are *not* buffered by the SDK — they are expected to be
   * re-delivered by the server after the session is re-authenticated.
   * Active RPC calls that were awaiting a response will time out
   * (default **5 s**) and reject with an `RPCTimeoutError`; callers should
   * handle this and retry if appropriate.
   *
   * The connection status can be observed via the `status$` observable on
   * the transport layer, which emits `'connecting'`, `'connected'`,
   * `'reconnecting'`, `'disconnecting'`, or `'disconnected'`.
   */
  public async connect(): Promise<void> {
    // If a prior connect() left a session/transport in place, tear them down
    // before allocating fresh ones. Otherwise the previous TransportManager,
    // ClientSessionManager, and AttachManager would be orphaned with their
    // subscriptions and timers still alive — disconnect() only destroys the
    // most recent ClientSessionManager.
    await this.teardownTransportAndSession();

    // Fetch the user before building the transport/session: their storage keys
    // (protocol / authorization_state / attach records) are all namespaced by
    // the user id, including the resume/attach state a reload depends on.
    await this.fetchUserOrRecover();

    const errorHandler = (error: Error) => {
      this._errors$.next(error);
    };

    // Now initialize transport and session with user ID available
    this._transport = new TransportManager(
      this._deps.storage,
      this._deps.protocolKey,
      this._deps.WebSocket,
      PreferencesContainer.instance.relayHost ?? this._deps.relayHost,
      errorHandler
    );

    // Create AttachManager (needed by CallFactory -> VertoManager)
    this._attachManager = new AttachManager(
      this._deps.storage,
      this._deps.deviceController,
      PreferencesContainer.instance.reconnectCallsTimeout,
      this._deps.attachedCallsKey,
      () => this._credentialRecovered
    );

    this._clientSession = new ClientSessionManager(
      () => this._deps.credential,
      this._transport,
      this._deps.storage,
      this._deps.authorizationStateKey,
      this._deps.deviceController,
      this._attachManager,
      this._deps.webRTCApiProvider,
      this._dpopManager,
      this._networkMonitor?.networkChange$
    );
    this._publicSession = new ClientSessionWrapper(this._clientSession);

    // Session-wide control transport for every call in this session (see
    // SignalWireOptions.callControl). Client config, so a reattached call reads it here
    // rather than restoring it from persisted attachment state.
    this._clientSession.callControl = this._options.callControl ?? 'routed';

    // Hook: re-mint credentials before a fresh (re)connect. Invoked by the
    // session only when it is client-bound OR the in-memory token is expired.
    this._clientSession.onBeforeReconnect = async () => this.refreshCredentialForReconnect();

    this.subscribeTo(this._clientSession.errors$, (error) => {
      this._errors$.next(error);
    });

    // Server-authoritative expiry: every connect/resume response carries the
    // decrypted SAT's `fabric_subscriber.expires_at` — the token is opaque to
    // the client, so this is the only trustworthy source of its real expiry.
    this.subscribeTo(this._clientSession.authorization$, (authorization) => {
      this._refreshCoordinator?.syncExpiryFromAuthorization(
        authorization,
        this._credentialProvider
      );
      // Server-authoritative binding: cnf.jkt rides in every connect/resume
      // authorization when the session is client-bound. Persist it so a later
      // reload's preflight recovery re-binds via authenticate() rather than
      // degrading the session to an unbound refresh token.
      this.persistClientBoundMarker(Boolean(authorization?.cnf?.jkt));
    });

    await this._clientSession.connect();

    // Delegate refresh arbitration to the coordinator. It only cancels the
    // developer refresh timer when the Client Bound SAT path actually takes
    // ownership; otherwise the developer path remains armed.
    await this._refreshCoordinator?.activate(this._deps.user, this._clientSession);

    // Re-register user (and re-activate Client Bound SAT) after WebSocket reconnect.
    // activate() must complete before register() so the fresh Client Bound SAT
    // is used for the subscriber.online RPC.
    this.subscribeTo(
      this._clientSession.authenticated$.pipe(skip(1), filter(Boolean)),
      async () => {
        try {
          await this._refreshCoordinator?.activate(this._deps.user, this._clientSession);
        } catch (error) {
          logger.error('[SignalWire] Refresh re-arm after reconnect failed (non-fatal):', error);
          this._errors$.next(
            error instanceof Error ? error : new Error(String(error), { cause: error })
          );
        }

        try {
          logger.debug('[SignalWire] Re-registering user after reconnect');
          await this.register();
          logger.debug('[SignalWire] User re-registered successfully after reconnect');
        } catch (error) {
          logger.error('[SignalWire] Re-registration failed after reconnect:', error);
          this._errors$.next(
            error instanceof Error ? error : new Error(String(error), { cause: error })
          );
        }
      }
    );

    // Create conversationManager first to inject into DirectoryManager
    const conversationManager = new ConversationsManager(
      this._clientSession,
      this._deps.http,
      () => this._deps.getUserFromAddressId(),
      errorHandler
    );

    // Create directory with all dependencies injected
    const directory = new DirectoryManager(
      this._deps.http,
      this._clientSession,
      conversationManager,
      errorHandler
    );
    this._directory$.next(directory);
    this._clientSession.setDirectory(directory);

    this._isConnected$.next(true);

    // Record connection event in diagnostics
    this._diagnosticsCollector?.record('connection', 'connected');

    // Wire reconnect events to diagnostics.
    // skip(1) skips the replayed BehaviorSubject value (false).
    // skip(2) also skips the initial auth success (true).
    // Only subsequent true emissions (re-authentication after reconnect) trigger this.
    this.subscribeTo(this._clientSession.authenticated$.pipe(skip(2), filter(Boolean)), () => {
      this._diagnosticsCollector?.record('connection', 'reconnected');
    });
  }

  /**
   * Observable that emits the {@link User} profile once fetched,
   * or `undefined` before authentication completes.
   *
   * @example
   * ```ts
   * client.user$.subscribe(u => {
   *   if (u) console.log('Logged in as', u.email);
   * });
   * ```
   */
  public get user$(): Observable<User | undefined> {
    return this.deferEmission(this._user$.asObservable());
  }

  /** Current user snapshot, or `undefined` if not yet authenticated. */
  public get user(): User | undefined {
    return this._user$.value;
  }

  /**
   * Observable that emits the {@link Directory} instance once the client is connected,
   * or `undefined` while disconnected. Subscribe to this to safely wait for the directory
   * to become available without risking an error.
   *
   * @example
   * ```ts
   * client.directory$.subscribe(dir => {
   *   if (dir) dir.addresses$.subscribe(console.log);
   * });
   * ```
   */
  public get directory$(): Observable<Directory | undefined> {
    return this.deferEmission(this._directory$.asObservable());
  }

  /**
   * Current directory snapshot, or `undefined` if the client is not yet connected.
   * Prefer {@link directory$} when you need to react to the directory becoming available.
   */
  public get directory(): Directory | undefined {
    return this._directory$.value;
  }

  /** Observable that emits when the user registration state changes. */
  public get isRegistered$(): Observable<boolean> {
    return this.deferEmission(this._isRegistered$.asObservable());
  }

  /** Whether the user is currently registered. */
  public get isRegistered(): boolean {
    return this._isRegistered$.value;
  }

  /** Whether the client is currently connected. */
  public get isConnected(): boolean {
    return this._isConnected$.value;
  }

  /** Observable that emits when the connection state changes. */
  public get isConnected$(): Observable<boolean> {
    return this.deferEmission(this._isConnected$.asObservable());
  }

  /** Observable that emits `true` when the client is both connected and authenticated. */
  public get ready$(): Observable<boolean> {
    return this.publicCachedObservable('ready$', () =>
      this._isConnected$.pipe(
        switchMap((connected) => (connected ? this._clientSession.authenticated$ : of(false)))
      )
    );
  }

  /** Observable stream of errors from transport, authentication, and devices. */
  public get errors$(): Observable<Error> {
    return this.deferEmission(this._errors$.asObservable());
  }

  /**
   * Observable stream of non-fatal SDK warnings.
   *
   * Subscribe to detect SDK behaviors that affect session liveness or developer-facing
   * contracts but do not warrant disconnection — e.g., a fallback from Client Bound SAT
   * refresh to the developer-provided `refresh()` because the SAT lacks `sat:refresh`
   * scope. Discriminated by `code`.
   *
   * Independent from {@link errors$}: existing error consumers are not notified.
   */
  public get warnings$(): Observable<SDKWarning> {
    return this.deferEmission(this._warnings$.asObservable());
  }

  // ===========================================================================
  // Resilience API
  // ===========================================================================

  /** Platform WebRTC capabilities detected at construction time. */
  public get platformCapabilities(): PlatformCapabilities {
    this._platformCapabilities ??= detectPlatformCapabilities(this._options.webRTCApiProvider);
    return this._platformCapabilities;
  }

  /** Observable that emits when the SDK auto-switches a device. */
  public get deviceRecovered$(): Observable<DeviceRecoveryEvent> {
    return this.deferEmission(this._deviceController.deviceRecovered$);
  }

  /**
   * Export a structured diagnostic bundle for support/debugging.
   * Includes connection events, call summaries, and device changes.
   */
  public exportDiagnostics(): SessionDiagnostics {
    const devices = {
      audioInput: this.audioInputDevices,
      audioOutput: this.audioOutputDevices,
      videoInput: this.videoInputDevices
    };

    const base: SessionDiagnostics = {
      sdkVersion: 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      capabilities: this.platformCapabilities,
      events: [],
      calls: [],
      deviceChanges: [],
      devices
    };

    if (!this._diagnosticsCollector) {
      return base;
    }

    const raw = this._diagnosticsCollector.export();
    // The collector's internal types (CallDiagnosticSummary, DiagnosticEvent)
    // are structurally compatible with the public SessionDiagnostics shape
    // for JSON serialization / support ticket purposes.
    return {
      ...base,
      sdkVersion: raw.sdkVersion,
      userAgent: raw.userAgent,
      events: raw.events as unknown as SessionDiagnostics['events'],
      calls: raw.calls as unknown as SessionDiagnostics['calls'],
      deviceChanges: raw.deviceChanges as unknown as SessionDiagnostics['deviceChanges'],
      devices
    };
  }

  /**
   * Initialize resilience subsystems. Non-fatal: any failure is logged and
   * the SDK continues working without the failing subsystem.
   */
  private initResilienceSubsystems(): void {
    try {
      this._platformCapabilities = detectPlatformCapabilities(this._options.webRTCApiProvider);
    } catch (error) {
      logger.warn('[SignalWire] Failed to detect platform capabilities:', error);
    }

    try {
      this._networkMonitor = new NetworkMonitor();
    } catch (error) {
      logger.warn('[SignalWire] Failed to initialize NetworkMonitor:', error);
    }

    try {
      this._visibilityController = new VisibilityController();

      // Resume from suspension: when the tab becomes visible again, revalidate
      // the credential deadline and force a refresh if the armed pre-expiry
      // refresh was throttled past due while backgrounded. Without this, a slept
      // tab wakes with a stale token and fails -32003 until the (late) timer
      // eventually fires.
      this.subscribeTo(
        this._visibilityController.visibilityChange$.pipe(
          filter((event) => event.to === 'visible')
        ),
        () => {
          try {
            this._refreshCoordinator?.forceRefreshIfDue();
          } catch (error) {
            logger.warn('[SignalWire] Resume credential revalidation failed (non-fatal):', error);
          }
        }
      );

      // Re-enumerate devices when page becomes visible (if pref enabled)
      this.subscribeTo(
        this._visibilityController.visibilityChange$.pipe(
          filter(
            (event) =>
              event.to === 'visible' && PreferencesContainer.instance.refreshDevicesOnVisible
          )
        ),
        () => {
          logger.debug('[SignalWire] Page visible, re-enumerating devices');
          // Trigger device re-enumeration by disabling/re-enabling monitoring
          try {
            this._deviceController.disableDeviceMonitoring();
            this._deviceController.enableDeviceMonitoring();
          } catch {
            // Non-fatal
          }
        }
      );
    } catch (error) {
      logger.warn('[SignalWire] Failed to initialize VisibilityController:', error);
    }

    try {
      const sdkVersion: string = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'unknown';
      this._diagnosticsCollector = new DiagnosticsCollector({
        sdkVersion
      });
    } catch (error) {
      logger.warn('[SignalWire] Failed to initialize DiagnosticsCollector:', error);
    }
  }

  /**
   * Disconnects the WebSocket and tears down the current session.
   *
   * Ends the session identified by the protocol and clears its persisted
   * resume state (`authorization_state` + protocol) and attach records
   * together — a later {@link connect} with the same credentials starts a
   * fresh session and cannot reattach to the ended session's calls.
   * Credentials and device preferences are preserved. To temporarily stop
   * receiving inbound calls while keeping the session alive, use
   * `unregister()` instead.
   *
   * The client can be reconnected by calling {@link connect} again,
   * which creates a fresh transport and session.
   */
  public async disconnect(): Promise<void> {
    // Suspend both refresh paths to prevent any timer from firing against the
    // torn-down session. The coordinator's internal DeviceTokenManager
    // survives (cached token + DPoP key are preserved) — the next reconnect
    // calls activate() which resumes the pipeline.
    this._refreshCoordinator?.suspend();
    this._diagnosticsCollector?.record('connection', 'disconnected');
    await this.teardownTransportAndSession();
    this._isConnected$.next(false);
  }

  /**
   * Tear down the current transport / session / attach manager. Safe to call
   * when nothing has been initialized yet (e.g. first connect()).
   */
  private async teardownTransportAndSession(): Promise<void> {
    const session = this._clientSession as ClientSessionManager | undefined;
    const transport = this._transport as TransportManager | undefined;

    if (session) {
      try {
        await session.disconnect();
      } catch (error) {
        logger.warn('[SignalWire] Error disconnecting previous session:', error);
      }
      session.destroy();
    }
    if (transport) {
      transport.destroy();
    }

    this._clientSession = undefined as unknown as ClientSessionManager;
    this._publicSession = undefined as unknown as ClientSessionWrapper;
    this._transport = undefined as unknown as TransportManager;
    this._attachManager = undefined;
  }

  private async waitAuthentication(): Promise<void> {
    // Wait for client to be ready (authenticated)
    await firstValueFrom(this.ready$.pipe(filter((ready) => ready === true)));
  }

  /**
   * Registers the user as online to receive inbound calls and events.
   *
   * Waits for authentication to complete before sending the registration.
   * If the initial attempt fails, reauthentication is attempted automatically.
   *
   * @throws {InvalidCredentialsError} If registration and reauthentication both fail.
   */
  public async register(): Promise<void> {
    try {
      // Wait for client session to be authenticated before registering user
      await this.waitAuthentication();
      await this._transport.execute(RPCExecute({ method: 'subscriber.online', params: {} }));
      this._isRegistered$.next(true);
      return;
    } catch (error) {
      if (!this._deps.credential.token) {
        this._errors$.next(
          error instanceof Error ? error : new Error(String(error), { cause: error })
        );
        throw error;
      }

      logger.debug('[SignalWire] Failed to register user, attempting credential recovery...');
      // Not gated on the error kind. A rotation spent on a failure that turned
      // out to be transient costs one token; skipping the re-mint on a failure
      // that was not transient costs the session.
      const outcome = await this.recoverAndRetry(async () => {
        await this._transport.execute(RPCExecute({ method: 'subscriber.online', params: {} }));
      });
      if (outcome.ok) {
        logger.debug('[SignalWire] Recovery restored registration');
        this._isRegistered$.next(true);
        return;
      }
      const failureCause: unknown = outcome.error ?? error;

      const registerError = new InvalidCredentialsError(
        'Failed to register user, and credential recovery also failed. Please check your credentials.',
        {
          cause:
            failureCause instanceof Error
              ? failureCause
              : new Error(String(failureCause), { cause: failureCause })
        }
      );
      this._errors$.next(registerError);
      throw registerError;
    }
  }

  /**
   * Unregisters the user, going offline for inbound calls.
   *
   * The WebSocket connection remains open; use {@link disconnect} to fully close it.
   */
  public async unregister(): Promise<void> {
    try {
      await this._transport.execute(RPCExecute({ method: 'subscriber.offline', params: {} }));
      this._isRegistered$.next(false);
    } catch (error) {
      logger.error('[SignalWire] Failed to unregister user:', error);
      this._errors$.next(
        error instanceof Error ? error : new Error(String(error), { cause: error })
      );
      throw error;
    }
  }

  /**
   * Places an outbound call to the given destination.
   *
   * Waits for authentication before dialing. Media options are merged from
   * saved preferences, destination query parameters (e.g. `?channel=video`),
   * and the provided `options` (highest priority).
   *
   * Returns a {@link Call} in `'ringing'` state. Subscribe to {@link Call.status$}
   * to track progression through `'connected'` → `'disconnected'`.
   *
   * Local media acquisition is deliberately unbounded: an unanswered permission
   * prompt leaves this promise pending indefinitely, so apply your own bound if
   * your UI needs one. The 12 s signaling budget starts only once acquisition
   * settles.
   *
   * @param destination - Address URI string (e.g. `'/public/my-room'`) or {@link Address} instance.
   * @param options - Media and dial options (audio/video, device constraints). Overrides defaults.
   * @returns The created {@link Call} instance.
   * @throws {Error} If authentication is not complete or call creation fails.
   *
   * @example
   * ```ts
   * const call = await client.dial('/public/conference', {
   *   audio: true,
   *   video: true,
   * });
   * call.status$.subscribe(status => console.log('Call:', status));
   * ```
   */
  public async dial(destination: string | Address, options: DialOptions = {}): Promise<Call> {
    const computed_options = {
      ...PreferencesContainer.instance.preferredMediaOptions,
      ...buildOptionsFromDestination(destination),
      ...options
    };

    // Wait for client to be ready
    await this.waitAuthentication();

    logger.debug('[SignalWire] Dialing with options:', computed_options);
    try {
      return await this._clientSession.createOutboundCall(destination, computed_options);
    } catch (error) {
      // A -32002/-32003 on the invite means the session token went stale
      // (e.g. a throttled refresh timer). Recover the credential and retry the
      // dial once. Any other error, or a failed recovery, propagates.
      if (!isRecoverableAuthError(error)) {
        throw error;
      }
      logger.debug(
        '[SignalWire] Dial hit a recoverable auth error; recovering the session and retrying'
      );
      const outcome = await this.recoverAndRetry(async () => {
        await this.waitAuthentication();
        return this._clientSession.createOutboundCall(destination, computed_options);
      });
      if (outcome.ok) {
        return outcome.value;
      }
      throw outcome.error ?? error;
    }
  }

  /**
   * Runs a multi-phase connectivity test against the given destination.
   *
   * The test checks:
   *   1. **Signaling** -- WebSocket connected, RTT measurement
   *   2. **Devices** -- getUserMedia succeeds with selected (or specified) devices
   *   3. **ICE/TURN** -- gathers ICE candidates to verify STUN/TURN reachability
   *   4. **Media/bandwidth** (unless `skipMediaTest`) -- dials the destination,
   *      collects getStats() for `duration` seconds, computes bandwidth estimates
   *
   * @param destination - A destination to dial for the media test (e.g. `'/private/network-test'`).
   * @param options - Preflight options (duration, skipMediaTest, device overrides).
   * @returns A {@link PreflightResult} describing connectivity health.
   *
   * @example
   * ```ts
   * const result = await client.preflight('/private/network-test', { duration: 5 });
   * if (!result.ok) console.warn('Connectivity issues:', result.warnings);
   * ```
   */
  public async preflight(
    destination: string,
    options?: PreflightOptions
  ): Promise<PreflightResult> {
    const iceServers =
      this._clientSession.iceServers ?? PreferencesContainer.instance.iceServers ?? [];
    const isConnected = this._isConnected$.value;
    const transportRtt = 0; // RTT is best-effort; 0 when not measurable

    const runner = new PreflightRunner(
      this._deviceController,
      iceServers,
      isConnected,
      transportRtt,
      async (dest, opts) => this.dial(dest, opts),
      options
    );

    return runner.run(destination);
  }

  /** The underlying client session for advanced RPC operations. */
  public get session(): ClientSessionWrapper {
    return this._publicSession;
  }

  // DeviceController interface implementation

  /** Observable list of available audio input (microphone) devices. */
  public get audioInputDevices$(): Observable<MediaDeviceInfo[]> {
    return this.deferEmission(this._deviceController.audioInputDevices$);
  }

  /** Current snapshot of available audio input devices. */
  public get audioInputDevices(): MediaDeviceInfo[] {
    return this._deviceController.audioInputDevices;
  }

  /** Observable list of available audio output (speaker) devices. */
  public get audioOutputDevices$(): Observable<MediaDeviceInfo[]> {
    return this.deferEmission(this._deviceController.audioOutputDevices$);
  }

  /** Current snapshot of available audio output devices. */
  public get audioOutputDevices(): MediaDeviceInfo[] {
    return this._deviceController.audioOutputDevices;
  }

  /** Observable list of available video input (camera) devices. */
  public get videoInputDevices$(): Observable<MediaDeviceInfo[]> {
    return this.deferEmission(this._deviceController.videoInputDevices$);
  }

  /** Current snapshot of available video input devices. */
  public get videoInputDevices(): MediaDeviceInfo[] {
    return this._deviceController.videoInputDevices;
  }

  /** Observable of the currently selected audio input device. */
  public get selectedAudioInputDevice$(): Observable<MediaDeviceInfo | null> {
    return this.deferEmission(this._deviceController.selectedAudioInputDevice$);
  }
  /** Observable of the currently selected audio output device. */
  public get selectedAudioOutputDevice$(): Observable<MediaDeviceInfo | null> {
    return this.deferEmission(this._deviceController.selectedAudioOutputDevice$);
  }
  /** Observable of the currently selected video input device. */
  public get selectedVideoInputDevice$(): Observable<MediaDeviceInfo | null> {
    return this.deferEmission(this._deviceController.selectedVideoInputDevice$);
  }
  /** Currently selected audio input device, or `null` if none. */
  public get selectedAudioInputDevice(): MediaDeviceInfo | null {
    return this._deviceController.selectedAudioInputDevice;
  }
  /** Currently selected audio output device, or `null` if none. */
  public get selectedAudioOutputDevice(): MediaDeviceInfo | null {
    return this._deviceController.selectedAudioOutputDevice;
  }
  /** Currently selected video input device, or `null` if none. */
  public get selectedVideoInputDevice(): MediaDeviceInfo | null {
    return this._deviceController.selectedVideoInputDevice;
  }
  /** Media track constraints for the selected audio input device. Returns `false` when disabled. */
  public get selectedAudioInputDeviceConstraints(): MediaTrackConstraints | boolean {
    return this._deviceController.selectedAudioInputDeviceConstraints;
  }
  /** Media track constraints for the selected video input device. Returns `false` when disabled. */
  public get selectedVideoInputDeviceConstraints(): MediaTrackConstraints | boolean {
    return this._deviceController.selectedVideoInputDeviceConstraints;
  }

  /** Converts a `MediaDeviceInfo` to track constraints suitable for `getUserMedia`. */
  public deviceInfoToConstraints(deviceInfo: MediaDeviceInfo | null): MediaTrackConstraints {
    return this._deviceController.deviceInfoToConstraints(deviceInfo);
  }

  /** Sets the preferred audio input device. */
  public selectAudioInputDevice(device: MediaDeviceInfo | null): void {
    this._deviceController.selectAudioInputDevice(device);
  }

  /** Sets the preferred video input device. */
  public selectVideoInputDevice(device: MediaDeviceInfo | null): void {
    this._deviceController.selectVideoInputDevice(device);
  }

  /** Sets the preferred audio output device. */
  public selectAudioOutputDevice(device: MediaDeviceInfo | null): void {
    this._deviceController.selectAudioOutputDevice(device);
  }

  /**
   * Apply the currently selected audio output device to an HTMLMediaElement
   * (e.g. the `<audio>` or `<video>` element the consumer attached the
   * remote stream to). Uses `HTMLMediaElement.setSinkId` under the hood.
   * Returns a `Promise<boolean>`: `true` if the sink was applied,
   * `false` if the browser doesn't support `setSinkId` or no device is
   * selected.
   *
   * @example
   * ```ts
   * audioEl.srcObject = call.remoteStream;
   * await client.applySelectedAudioOutputDevice(audioEl);
   * ```
   */
  public async applySelectedAudioOutputDevice(element: HTMLMediaElement): Promise<boolean> {
    const device = this._deviceController.selectedAudioOutputDevice;
    if (!device?.deviceId) {
      return false;
    }
    const withSink = element as HTMLMediaElement & {
      setSinkId?: (sinkId: string) => Promise<void>;
    };
    if (typeof withSink.setSinkId !== 'function') {
      logger.warn('[SignalWire] setSinkId not supported on this element / browser');
      return false;
    }
    try {
      await withSink.setSinkId(device.deviceId);
      return true;
    } catch (error) {
      logger.warn('[SignalWire] Failed to apply audio output device:', error);
      return false;
    }
  }

  /** Starts monitoring for media device changes (connect/disconnect). */
  public enableDeviceMonitoring(): void {
    this._deviceController.enableDeviceMonitoring();
  }

  /** Stops monitoring for media device changes. */
  public disableDeviceMonitoring(): void {
    this._deviceController.disableDeviceMonitoring();
  }

  /**
   * Returns the capabilities of a media device.
   * @param deviceInfo - The device to query.
   * @returns The device capabilities, or `null` if unavailable.
   */
  public async getDeviceCapabilities(
    deviceInfo: MediaDeviceInfo
  ): Promise<MediaTrackCapabilities | null> {
    return this._deviceController.getDeviceCapabilities(deviceInfo);
  }

  /**
   * Checks whether a device is still available and usable.
   * @param deviceInfo - The device to validate, or `null`.
   * @returns `true` if the device is valid and available. Returns `false` for `null`, audio output devices, or unavailable devices.
   */
  public async isValidDevice(deviceInfo: MediaDeviceInfo | null): Promise<boolean> {
    return this._deviceController.isValidDevice(deviceInfo);
  }

  // ===========================================================================
  // DeviceController passthrough: storage and device state
  // ===========================================================================

  /** Injects a storage manager into the device controller for persistence. */
  public setStorageManager(
    storageManager: import('../managers/StorageManager').StorageManager
  ): void {
    this._deviceController.setStorageManager(storageManager);
  }

  /** Clears all device state and re-enumerates. */
  public async clearDeviceState(): Promise<void> {
    return this._deviceController.clearDeviceState();
  }

  /** Forces a device re-enumeration. */
  public async enumerateDevices(): Promise<void> {
    return this._deviceController.enumerateDevices();
  }

  // ===========================================================================
  // Section 5.9: Intentional device disable
  // ===========================================================================

  /** Disables audio input (receive-only mode). No audio track will be acquired. */
  public disableAudioInput(): void {
    this._deviceController.disableAudioInput();
  }

  /** Re-enables audio input, restoring the last selection or auto-selecting. */
  public enableAudioInput(): void {
    this._deviceController.enableAudioInput();
  }

  /** Disables video input (receive-only mode). No video track will be acquired. */
  public disableVideoInput(): void {
    this._deviceController.disableVideoInput();
  }

  /** Re-enables video input, restoring the last selection or auto-selecting. */
  public enableVideoInput(): void {
    this._deviceController.enableVideoInput();
  }

  /** Observable that emits `true` when video input is disabled (receive-only). */
  public get videoInputDisabled$(): Observable<boolean> {
    return this.deferEmission(this._deviceController.videoInputDisabled$);
  }

  /** Observable that emits `true` when audio input is disabled (receive-only). */
  public get audioInputDisabled$(): Observable<boolean> {
    return this.deferEmission(this._deviceController.audioInputDisabled$);
  }

  /** Whether video input is currently disabled. */
  public get videoInputDisabled(): boolean {
    return this._deviceController.videoInputDisabled;
  }

  /** Whether audio input is currently disabled. */
  public get audioInputDisabled(): boolean {
    return this._deviceController.audioInputDisabled;
  }

  // ===========================================================================
  // Section 5.10: Permissions bootstrapping
  // ===========================================================================

  /**
   * Triggers the browser's media permission dialog and captures the user's device selections.
   *
   * @param options - Which permissions to request.
   * @param options.audio - Whether to request audio permission.
   * @param options.video - Whether to request video permission.
   * @returns The permission result with selected devices.
   */
  public async requestMediaPermissions(
    options: { audio?: boolean; video?: boolean } = { audio: true, video: true }
  ): Promise<PermissionResult> {
    const constraints: MediaStreamConstraints = {
      audio: options.audio ?? false,
      video: options.video ?? false
    };

    let audioGranted = false;
    let videoGranted = false;
    let selectedAudioDevice: MediaDeviceInfo | undefined;
    let selectedVideoDevice: MediaDeviceInfo | undefined;

    try {
      const stream = await this._deps.webRTCApiProvider.mediaDevices.getUserMedia(constraints);
      const tracks = stream.getTracks();

      for (const track of tracks) {
        const settings = track.getSettings();
        if (track.kind === 'audio') {
          audioGranted = true;
          if (settings.deviceId) {
            selectedAudioDevice = this.audioInputDevices.find(
              (d) => d.deviceId === settings.deviceId
            );
          }
        } else if (track.kind === 'video') {
          videoGranted = true;
          if (settings.deviceId) {
            selectedVideoDevice = this.videoInputDevices.find(
              (d) => d.deviceId === settings.deviceId
            );
          }
        }
        track.stop();
      }
    } catch (error) {
      logger.warn('[SignalWire] Media permission request failed:', error);
    }

    // Re-enumerate devices (labels are now available after permission grant)
    await this._deviceController.enumerateDevices();

    // Re-resolve selected devices after re-enumeration
    if (audioGranted && selectedAudioDevice) {
      const audioDeviceId = selectedAudioDevice.deviceId;
      const resolved = this.audioInputDevices.find((d) => d.deviceId === audioDeviceId);
      selectedAudioDevice = resolved ?? selectedAudioDevice;
    }
    if (videoGranted && selectedVideoDevice) {
      const videoDeviceId = selectedVideoDevice.deviceId;
      const resolved = this.videoInputDevices.find((d) => d.deviceId === videoDeviceId);
      selectedVideoDevice = resolved ?? selectedVideoDevice;
    }

    // Auto-select the browser-picked devices if no explicit selection yet
    if (audioGranted && selectedAudioDevice && !this.selectedAudioInputDevice) {
      this.selectAudioInputDevice(selectedAudioDevice);
    }
    if (videoGranted && selectedVideoDevice && !this.selectedVideoInputDevice) {
      this.selectVideoInputDevice(selectedVideoDevice);
    }

    return {
      audio: audioGranted,
      video: videoGranted,
      selectedAudioDevice,
      selectedVideoDevice
    };
  }

  // ===========================================================================
  // Section 5.11: Factory reset
  // ===========================================================================

  /**
   * Clears all SDK-persisted state and resets to defaults.
   *
   * This clears device preferences, device history, authorization state,
   * attached call IDs, and all SDK storage keys, then re-enumerates devices.
   */
  public async resetToDefaults(): Promise<void> {
    // 1. Clear all SDK storage keys
    await this._deps.storage.clearAll();

    // 2. Reset PreferencesContainer to defaults
    const prefs = PreferencesContainer.instance;
    prefs.preferredAudioInput = null;
    prefs.preferredAudioOutput = null;
    prefs.preferredVideoInput = null;

    // 3. Clear device history and selection
    await this._deviceController.clearDeviceState();
  }

  /**
   * Destroys the client, clearing timers and releasing all resources.
   *
   * Intentionally destroying the client ends its session: the resume state
   * (`authorization_state` + protocol) and the attach records are both
   * cleared. Credentials and device preferences are preserved — use
   * {@link resetToDefaults} for a full wipe. To temporarily stop receiving
   * inbound calls while keeping the session alive, use `unregister()`.
   */
  public override destroy(): void {
    this._refreshCoordinator?.destroy();
    this._refreshCoordinator = undefined;
    this._refreshHttp?.destroy();
    this._refreshHttp = undefined;
    this._dpopManager?.destroy();

    // Intentionally destroying the client ends its session: clear the
    // resume state (authorization_state + protocol) AND the attach records
    // together (they are a coupled unit). Run before tearing down the
    // transport/session so the storage writes still go through. Credentials
    // and device preferences survive — resetToDefaults() is the full wipe.
    // Session/transport only exist after a successful connect() (and are
    // reset by cleanupSession) — a never-connected or already-disconnected
    // client must still destroy cleanly.
    const session = this._clientSession as ClientSessionManager | undefined;
    void session?.teardownSessionState();

    // Stop the transport to prevent reconnection loops
    (this._transport as TransportManager | undefined)?.destroy();
    session?.destroy();

    // Destroy resilience subsystems
    try {
      this._networkMonitor?.destroy();
    } catch {
      /* non-fatal */
    }
    try {
      this._visibilityController?.destroy();
    } catch {
      /* non-fatal */
    }
    try {
      this._diagnosticsCollector?.destroy();
    } catch {
      /* non-fatal */
    }
    this._networkMonitor = undefined;
    this._visibilityController = undefined;
    this._diagnosticsCollector = undefined;

    super.destroy();
  }
}
export { SignalWire };
