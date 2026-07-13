import {
  catchError,
  combineLatest,
  defer,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  firstValueFrom,
  from,
  lastValueFrom,
  map,
  race,
  share,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  tap,
  throwError,
  timeout,
  TimeoutError
} from 'rxjs';

import { CallFactory } from './CallFactory';
import {
  RPC_ERROR_REQUESTER_VALIDATION_FAILED,
  RPC_ERROR_INVALID_PARAMS,
  RPC_ERROR_AUTHENTICATION_FAILED
} from '../core/constants';
import { Address } from '../core/entities/Address';
import {
  AuthStateHandlerError,
  CallCreateError,
  DependencyError,
  JSONRPCError,
  UnexpectedError,
  VertoAttachHandlerError,
  VertoInviteHandlerError
} from '../core/errors';
import { RPCConnect, RPCReauthenticate } from '../core/RPCMessages';
import {
  isSignalwireAuthorizationStateMetadata,
  isSignalwireRequest,
  isWebrtcMessageMetadata
} from '../core/RPCMessages/guards/events.guards';
import {
  isVertoAttachMessage,
  isVertoInviteMessage
} from '../core/RPCMessages/guards/verto.guards';
import { Destroyable, isRPCConnectResult } from '../core/utils';
import { filterAs } from '../operators/filterEventAs';
import { throwOnRPCError } from '../operators/throwOnRPCError';
import { getLogger } from '../utils/logger';

import type { AttachManager } from './AttachManager';
import type { StorageManager } from './StorageManager';
import type { TransportManager } from './TransportManager';
import type { CryptoController } from '../controllers/CryptoController';
import type { NetworkChangeEvent } from '../controllers/NetworkMonitor';
import type { WebRTCCall } from '../core/entities/Call';
import type { Directory } from '../core/entities/Directory';
import type { Call, CallOptions } from '../core/entities/types/call.types';
import type {
  RPCConnectParams,
  RPCConnectAuthentication,
  Authorization,
  RPCReauthenticateParams
} from '../core/RPCMessages';
import type { JSONRPCRequest, JSONRPCResponse } from '../core/RPCMessages/types/base';
import type { VertoAttachParams, VertoInviteParams } from '../core/RPCMessages/types/verto';
import type { SDKCredential, JSONSerializable } from '../core/types/common.types';
import type { PendingRPCOptions } from '../core/utils';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';
import type { SessionState } from '../interfaces/SessionState';
import type { Observable } from 'rxjs';

const logger = getLogger();

const getAddressSearchURI = (options: CallOptions): string => {
  const to = options.to?.split('?')[0];
  const from = options.from?.startsWith('subscriber://')
    ? options.from.replace('subscriber://', '')
    : options.from;
  const name = to ?? from;
  if (!name) {
    throw new UnexpectedError('Error building Address name');
  }
  return name;
};

/**
 * Discriminated union for session authentication state.
 * clientBound is tracked separately via _wasClientBound (sticky flag)
 * to avoid dual sources of truth.
 */
export type SessionAuthState = { kind: 'unauthenticated' } | { kind: 'authenticated' };

export class ClientSessionManager extends Destroyable implements SessionState {
  private callFactory: CallFactory;
  private callCreateTimeout = 6000;
  private readonly agent = `signalwire-js/4.0.0`;
  private readonly eventAcks = true;
  public initialized$: Observable<boolean>;
  private authorizationState$ = this.createReplaySubject<string | undefined>(1);
  private connectVersion = {
    major: 4,
    minor: 0,
    revision: 0
  };
  /**
   * Optional hook called before a fresh connect on reconnect.
   * Used by SignalWire to refresh expired credentials before re-authenticating.
   * @internal
   */
  public onBeforeReconnect?: () => Promise<void>;
  private _authorization$ = this.createBehaviorSubject<Authorization | undefined>(undefined);
  private _errors$ = this.createReplaySubject<Error>(1);
  private _directory?: Directory;

  private _authState$ = this.createBehaviorSubject<SessionAuthState>({ kind: 'unauthenticated' });
  /** Sticky flag — once true, stays true for the session lifetime. */
  private _wasClientBound = false;

  private _userInfo$ = this.createBehaviorSubject<Address | null>(null);
  private _calls$ = this.createBehaviorSubject<Record<string, Call>>({});
  private _iceServers$ = this.createBehaviorSubject<RTCIceServer[]>([]);

  constructor(
    private readonly getCredential: () => SDKCredential,
    private readonly transport: TransportManager,
    private readonly storage: StorageManager,
    private readonly authorizationStateKey: string,
    deviceController: DeviceController,
    private readonly attachManager: AttachManager,
    webRTCApiProvider: WebRTCApiProvider,
    private readonly dpopManager?: CryptoController,
    networkChange$?: Observable<NetworkChangeEvent>
  ) {
    super();
    attachManager.setSession(this);
    this.callFactory = new CallFactory(
      this,
      deviceController,
      attachManager,
      webRTCApiProvider,
      networkChange$
    );
    this.initialized$ = defer(() => from(this.init())).pipe(
      shareReplay(1),
      takeUntil(this.destroyed$)
    );
  }
  public get incomingCalls$(): Observable<Call[]> {
    return this.cachedObservable('incomingCalls$', () =>
      this.calls$.pipe(map((calls) => calls.filter((call) => call.direction === 'inbound')))
    );
  }

  public get incomingCalls(): Call[] {
    const calls = Object.values(this._calls$.value);
    return calls.filter((call) => call.direction === 'inbound');
  }

  public get userInfo$(): Observable<Address | null> {
    return this._userInfo$.asObservable();
  }

  public get userInfo(): Address | null {
    return this._userInfo$.value;
  }

  public get calls$(): Observable<Call[]> {
    return this.cachedObservable('calls$', () =>
      this._calls$.pipe(map((calls) => Object.values(calls)))
    );
  }

  public get calls(): Call[] {
    return Object.values(this._calls$.value);
  }

  public get iceServers(): RTCIceServer[] | undefined {
    return this._iceServers$.value;
  }

  public get authorization$(): Observable<Authorization | undefined> {
    return this._authorization$.asObservable();
  }

  public get authorization(): Authorization | undefined {
    return this._authorization$.value;
  }

  public get errors$(): Observable<Error> {
    return this._errors$.asObservable();
  }

  public get authenticated$(): Observable<boolean> {
    return this._authState$.pipe(
      map((state) => state.kind === 'authenticated'),
      distinctUntilChanged()
    );
  }

  public get authenticated(): boolean {
    return this._authState$.value.kind === 'authenticated';
  }

  /**
   * Whether this session is client-bound (using a Client Bound SAT).
   * When client-bound, DPoP proof creation failures are treated as
   * authentication errors rather than silently degraded.
   * @internal
   */
  public get clientBound(): boolean {
    return this._wasClientBound;
  }

  /** @internal Current auth state for debugging/testing. */
  public get authState(): SessionAuthState {
    return this._authState$.value;
  }

  /**
   * Set the directory instance
   * Called by SignalWire after directory is created
   * @internal
   */
  public setDirectory(directory: Directory): void {
    this._directory = directory;
  }

  public async execute<T extends JSONRPCResponse = JSONRPCResponse>(
    request: JSONRPCRequest,
    options?: PendingRPCOptions
  ): Promise<T> {
    try {
      return await this.transport.execute(request, options);
    } catch (error) {
      logger.debug('[Session] Execute Error', error);
      this._errors$.next(
        error instanceof Error ? error : new Error(String(error), { cause: error })
      );
      throw error;
    }
  }

  public send(message: JSONSerializable): void {
    this.transport.send(message);
  }

  private async init(): Promise<boolean> {
    await this.loadAuthorizationStateFromStorage();
    this.setupMessageHandlers();
    return true;
  }

  private setupMessageHandlers(): void {
    logger.debug('[Session] Setting up message handlers');

    this.subscribeTo(this.authStateEvent$, async (authStateEvent) => {
      logger.debug('[Session] Authorization state event received:', authStateEvent);
      try {
        await this.updateAuthorizationStateInStorage(authStateEvent.authorization_state);
      } catch (error) {
        logger.error('[Session] Failed to handle authorization state update:', error);
        this._errors$.next(new AuthStateHandlerError(error));
      }
    });

    // Reset auth state when transport disconnects or starts reconnecting,
    // so that authenticated$ transitions through false → true on reconnect.
    // This makes the state model truthful and allows distinctUntilChanged()
    // to work correctly for subscribers that detect reconnect.
    // Note: WebSocket close with auto-reconnect emits 'reconnecting', not
    // 'disconnected'. Only explicit disconnect() emits 'disconnected'.
    this.subscribeTo(
      this.transport.connectionStatus$.pipe(
        filter((status) => status === 'disconnected' || status === 'reconnecting')
      ),
      () => {
        if (this._authState$.value.kind === 'authenticated') {
          this._authState$.next({ kind: 'unauthenticated' });
        }
      }
    );

    this.subscribeTo(
      this.transport.connectionStatus$.pipe(
        filter((status) => status === 'connected'),
        exhaustMap(() => {
          logger.debug('[Session] Connection established, initiating authentication');
          return from(this.authenticate()).pipe(
            catchError((error) => {
              this.handleAuthenticationError(error as Error).catch((err) => {
                logger.error('[Session] Error handling authentication failure:', err);
              });
              return EMPTY;
            })
          );
        })
      ),
      undefined
    );

    this.subscribeTo(this.vertoInvite$, async (invite) => {
      logger.debug('[Session] Verto invite received:', invite);
      try {
        await this.createInboundCall(invite);
      } catch (error) {
        logger.error('[Session] Error handling Verto invite:', error);
        this._errors$.next(new VertoInviteHandlerError(error));
      }
    });

    this.subscribeTo(this.vertoAttach$, async (attach) => {
      logger.debug('[Session] Verto attach received:', attach);
      try {
        await this.handleVertoAttach(attach);
      } catch (error) {
        logger.error('[Session] Error handling Verto attach:', error);
        this._errors$.next(new VertoAttachHandlerError(error));
      }
    });
  }

  private async loadAuthorizationStateFromStorage(): Promise<void> {
    try {
      const storedState = await this.storage.getItem<string>(this.authorizationStateKey);
      // Always emit a value, even if undefined, so combineLatest can proceed
      this.authorizationState$.next(storedState ?? undefined);
    } catch (error) {
      logger.error('Failed to retrieve authorization state from storage:', error);
      // Emit undefined on error so authentication can proceed without stored state
      this.authorizationState$.next(undefined);
    }
  }

  private async updateAuthorizationStateInStorage(authorizationState?: string): Promise<void> {
    if (!authorizationState) {
      logger.debug('[Session] Removing authorization state from storage');
      try {
        await this.storage.removeItem(this.authorizationStateKey);
        this.authorizationState$.next(undefined);
      } catch (error) {
        logger.error('Failed to remove authorization state from storage:', error);
        throw error;
      }
      return;
    }

    try {
      logger.debug('[Session] Updating authorization state in storage');
      await this.storage.setItem(this.authorizationStateKey, authorizationState);
      this.authorizationState$.next(authorizationState);
    } catch (error) {
      logger.error('Failed to retrieve authorization state from storage:', error);
      throw error;
    }
  }

  private get authStateEvent$() {
    return this.cachedObservable('authStateEvent$', () =>
      this.signalingEvent$.pipe(
        tap((msg) => {
          logger.debug('[Session] Received incoming message:', msg);
        }),
        filterAs(isSignalwireAuthorizationStateMetadata, 'params'),
        tap((event) => {
          logger.debug('[Session] Authorization state event received:', event.authorization_state);
        })
      )
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public get signalingEvent$() {
    return this.cachedObservable('signalingEvent$', () =>
      this.transport.incomingEvent$.pipe(filterAs(isSignalwireRequest, 'params'), share())
    );
  }

  private get vertoInvite$() {
    return this.cachedObservable('vertoInvite$', () =>
      this.signalingEvent$.pipe(
        filter(isWebrtcMessageMetadata),
        filter((event) => isVertoInviteMessage(event.params)),
        map((event) => ({
          node_id: event.node_id,
          ...(event.params.params as VertoInviteParams)
        }))
      )
    );
  }

  private get vertoAttach$() {
    return this.cachedObservable('vertoAttach$', () =>
      this.signalingEvent$.pipe(
        filter(isWebrtcMessageMetadata),
        filter((event) => isVertoAttachMessage(event.params)),
        map((event) => ({
          node_id: event.node_id,
          ...(event.params.params as VertoAttachParams)
        }))
      )
    );
  }

  private get contexts(): string[] {
    return [];
  }

  private get eventing(): string[] {
    return [];
  }

  private get topics(): string[] {
    return [];
  }

  private get authentication(): RPCConnectAuthentication {
    const credential = this.getCredential();
    if (!credential.token) {
      throw new DependencyError('Credential token is undefined');
    }
    return {
      jwt_token: credential.token
    };
  }

  async connect(): Promise<void> {
    // Ensure session is initialized before proceeding
    await firstValueFrom(this.initialized$);

    // Initiate the WebSocket connection. The exhaustMap subscription in
    // setupMessageHandlers triggers authenticate() when the WS opens.
    await this.transport.connect();

    // Gate: don't return until authentication succeeds or fails permanently.
    // If auth fails with stale authorization_state, handleAuthenticationError
    // cleans up and reconnects. The exhaustMap fires authenticate() again on
    // the new 'connected' event. When it succeeds, authenticated$ emits true.
    // takeUntil(destroyed$) terminates if the session is destroyed mid-auth.
    // timeout prevents hanging when the server never responds (e.g. test mocks).
    await firstValueFrom(
      this.authenticated$.pipe(
        takeUntil(this.destroyed$),
        filter(Boolean),
        take(1),
        timeout({ first: 15000 })
      )
    );
  }

  private async handleAuthenticationError(error: Error): Promise<void> {
    logger.error('Authentication error:', error);

    const isRecoverableAuthError =
      error instanceof JSONRPCError &&
      (error.code === RPC_ERROR_REQUESTER_VALIDATION_FAILED ||
        error.code === RPC_ERROR_INVALID_PARAMS ||
        error.code === RPC_ERROR_AUTHENTICATION_FAILED);

    // Only fall back if there was stored authorization_state to clear (reconnect attempt).
    // If this was already a fresh connect, don't loop — the credentials are genuinely bad.
    // Check authorizationState$ (the string we sent) not _authorization$ (the response object).
    const sentStoredState = await firstValueFrom(this.authorizationState$.pipe(take(1)));
    const hasStoredState = sentStoredState !== undefined;

    if (isRecoverableAuthError && hasStoredState) {
      // Server rejected reconnect — expired/corrupted authorization_state or jti drift.
      // Clean up stored state and reconnect fresh with SAT + DPoP.
      // Don't push to _errors$ — this is a transient error the SDK will self-heal.
      logger.debug(
        '[Session] Recoverable auth error — cleaning up stored state and reconnecting fresh'
      );
      try {
        await this.cleanupStoredConnectionParams();
      } catch (cleanupError) {
        logger.error('Failed to cleanup stored connection params:', cleanupError);
      } finally {
        this.transport.reconnect();
      }
    } else {
      // Fatal auth error — surface to consumers
      this._errors$.next(error);
    }
  }

  /**
   * Clear the resume state (authorization_state + protocol) only.
   *
   * This is the stale-auth-state recovery helper used by handleAuthError:
   * the server rejected a reconnect, so the resume state is discarded and a
   * fresh connect follows. Attach records are deliberately preserved — the
   * session lives on through the reconnect and reattachCalls() needs the
   * stored call references afterwards. Do NOT add detachAll() here.
   *
   * For public teardown (disconnect/destroy), use {@link teardownSessionState}
   * instead, which clears the attach records as well.
   */
  async cleanupStoredConnectionParams(): Promise<void> {
    await this.transport.setProtocol(undefined);
    await this.updateAuthorizationStateInStorage(undefined);
    this._authorization$.next(undefined);
  }

  /**
   * Public-teardown helper for disconnect()/destroy(). Clears the resume
   * state (authorization_state + protocol) AND the attach records as one
   * atomic unit.
   *
   * The two stores are coupled: the backend only honors attach records
   * within the session identified by the resume state, so ending the
   * session must clear both. Clearing one without the other strands records
   * no future session can honor (disconnect) or revives a session the
   * developer explicitly ended (destroy).
   *
   * Distinct from {@link cleanupStoredConnectionParams}, which keeps the
   * attach records for the stale-auth-state recovery path.
   */
  async teardownSessionState(): Promise<void> {
    await this.cleanupStoredConnectionParams();
    await this.attachManager.detachAll();
  }

  protected async updateAuthState(authorization_state: string): Promise<void> {
    try {
      await this.storage.setItem(this.authorizationStateKey, authorization_state);
    } catch (error) {
      logger.error('Failed to update authorization state in storage:', error);
      this._errors$.next(new AuthStateHandlerError(error));
    }
  }

  public async reauthenticate(
    token: string,
    dpopToken?: string,
    options?: { clientBound?: boolean }
  ): Promise<void> {
    logger.debug('[Session] Re-authenticating session');
    try {
      // Resolve DPoP proof: use provided, generate fresh, or omit
      let resolvedDpopToken = dpopToken;
      if (!resolvedDpopToken && this.dpopManager?.initialized) {
        try {
          resolvedDpopToken = await this.dpopManager.createRpcProof({
            method: 'signalwire.reauthenticate'
          });
        } catch (error) {
          if (this.clientBound) {
            // Client-bound sessions must not silently degrade to unbound
            throw error;
          }
          logger.warn('[Session] Failed to create DPoP proof for reauthenticate:', error);
        }
      }

      const params: RPCReauthenticateParams = {
        project: this._authorization$.value?.project_id ?? '',
        jwt_token: token,
        ...(resolvedDpopToken ? { dpop_token: resolvedDpopToken } : {})
      };

      const request = RPCReauthenticate(params);

      await lastValueFrom(
        from(this.transport.execute(request)).pipe(
          throwOnRPCError(),
          take(1),
          catchError((err) => {
            logger.error('[Session] Re-authentication RPC failed:', err);
            throw err;
          })
        )
      );

      // Mark session as client-bound if requested (set-once semantics)
      if (options?.clientBound) {
        this._wasClientBound = true;
      }

      logger.debug('[Session] Re-authentication successful, updating stored auth state');
    } catch (error) {
      logger.error('[Session] Re-authentication failed:', error);
      this._errors$.next(new AuthStateHandlerError(error));
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    logger.debug('[Session] Starting authentication process');

    const persistedParams = await firstValueFrom(
      combineLatest({
        protocol: this.transport.protocol$,
        authorization_state: this.authorizationState$
      }).pipe(take(1))
    );

    logger.debug('[Session] Persisted params:\n', {
      protocol: persistedParams.protocol,
      authStateLength: persistedParams.authorization_state?.length
    });

    const hasReconnectState = persistedParams.authorization_state && persistedParams.protocol;
    const storedToken = this.getCredential().token;
    // Reconnect if we have stored state AND a stored token
    const isReconnect = hasReconnectState && storedToken;

    let dpopToken: string | undefined;

    if (isReconnect) {
      // RECONNECT: send stored jwt_token (even if expired) + authorization_state + protocol + DPoP
      // authorization_state short-circuits token validation; jwt_token is needed for session classification
      logger.debug('[Session] Reconnecting with stored jwt_token + authorization_state');
    } else {
      // FRESH CONNECT: refresh credentials if needed, then use fresh SAT + DPoP
      if (this.onBeforeReconnect && this.clientBound) {
        logger.debug('[Session] Refreshing credentials before fresh connect');
        await this.onBeforeReconnect();
      }
    }

    // DPoP proof:
    // - Fresh connect: always send (server needs it for DPoP binding)
    // - Live WS reconnect (_clientBound=true): send (session expects DPoP)
    // - Page reload reconnect (_clientBound=false): skip (original SAT has no cnf.jkt,
    //   DeviceTokenManager re-activates after reconnect to restore DPoP binding)
    if ((!isReconnect || this.clientBound) && this.dpopManager?.initialized) {
      try {
        dpopToken = await this.dpopManager.createRpcProof({
          method: 'signalwire.connect'
        });
      } catch (error) {
        if (this.clientBound) {
          throw error;
        }
        logger.warn(
          '[Session] Failed to create DPoP proof for connect, proceeding without:',
          error
        );
      }
    }

    const params: RPCConnectParams = {
      authentication: isReconnect ? { jwt_token: storedToken } : this.authentication,
      version: this.connectVersion,
      agent: this.agent,
      contexts: this.contexts,
      eventing: this.eventing,
      topics: this.topics,
      event_acks: this.eventAcks,
      ...(dpopToken ? { dpop_token: dpopToken } : {}),
      ...(isReconnect
        ? {
            authorization_state: persistedParams.authorization_state,
            protocol: persistedParams.protocol
          }
        : {})
    };

    const rpcConnectRequest = RPCConnect(params);

    const response = await lastValueFrom(
      from(this.transport.execute(rpcConnectRequest)).pipe(
        throwOnRPCError(),
        map((res) => res.result),
        filter(isRPCConnectResult),
        tap(() => {
          logger.debug('[Session] Response passed filter, processing authentication result');
        }),
        take(1),
        catchError((err) => {
          logger.error('[Session] Authentication RPC failed:', err);
          throw err;
        })
      )
    );

    logger.debug('[Session] Processing authentication result:', {
      hasProtocol: !!response.protocol,
      hasAuthorization: !!response.authorization,
      hasIceServers: !!response.ice_servers
    });

    if (response.protocol) {
      await this.transport.setProtocol(response.protocol);
    }
    this._authorization$.next(response.authorization);
    this._iceServers$.next(response.ice_servers ?? []);
    this._authState$.next({ kind: 'authenticated' });

    logger.debug('[Session] Authentication completed successfully');
  }

  async disconnect(): Promise<void> {
    this.transport.disconnect();
    this._authState$.next({ kind: 'unauthenticated' });
    // disconnect() ends the session — clear the resume state AND attach
    // records together (they are a coupled unit). A new session created
    // later via connect() with the same credentials starts clean.
    await this.teardownSessionState();
  }

  private async createInboundCall(invite: VertoInviteParams & { node_id: string }): Promise<void> {
    const callSession = await this.createCall({
      nodeId: invite.node_id,
      callId: invite.callID,
      initOffer: invite.sdp,
      toName: invite.callee_id_name,
      to: invite.callee_id_number,
      fromName: invite.caller_id_name,
      from: invite.caller_id_number,
      displayDirection: invite.display_direction,
      userVariables: invite.userVariables
    });

    // Publish the inbound call immediately so consumers can subscribe and
    // answer/reject. The call's status$ BehaviorSubject seeds to 'ringing',
    // so awaiting firstValueFrom(status$) would resolve synchronously and
    // add nothing.
    this._calls$.next({
      [`${callSession.id}`]: callSession,
      ...this._calls$.value
    });
  }

  /**
   * Handle a server-pushed verto.attach event at the session level.
   *
   * On page reload the server detects the reconnected session and pushes
   * verto.attach for any active calls. If a call object already exists
   * (network blip, no reload), the per-call handler in VertoManager deals
   * with it. This method only creates a new call object when no existing
   * one matches the callID.
   */
  private async handleVertoAttach(attach: VertoAttachParams & { node_id: string }): Promise<void> {
    const { callID } = attach;

    // If a call object already exists, the per-call VertoManager handler
    // will handle the attach event. Skip session-level creation.
    const existingCalls = this._calls$.value;
    if (callID in existingCalls) {
      logger.debug(
        `[Session] Verto attach for existing call ${callID}, deferring to per-call handler`
      );
      return;
    }

    // Look up stored attachment data for media options
    const storedOptions = await this.attachManager.consumePendingAttachment(callID);

    logger.debug(`[Session] Creating reattached call for callID: ${callID}`);

    const callSession = await this.createCall({
      nodeId: attach.node_id,
      callId: callID,
      toName: attach.callee_id_name,
      to: attach.callee_id_number,
      fromName: attach.caller_id_name,
      from: attach.caller_id_number,
      reattach: true,
      ...storedOptions
    });

    // Publish the reattached call immediately. status$ seeds to its initial
    // value synchronously, so awaiting firstValueFrom(status$) would resolve
    // on the same microtask and add nothing.
    this._calls$.next({
      [`${callSession.id}`]: callSession,
      ...this._calls$.value
    });
  }

  public async createOutboundCall(
    destination: string | Address,
    options: CallOptions = {}
  ): Promise<Call> {
    const destinationURI =
      destination instanceof Address ? destination.defaultChannel : destination;
    let callSession: WebRTCCall | undefined;
    try {
      callSession = await this.createCall({
        to: destinationURI,
        ...options
      });

      await firstValueFrom(
        race(
          callSession.selfId$.pipe(
            filter((id) => Boolean(id)),
            take(1),
            timeout(this.callCreateTimeout)
          ),
          callSession.errors$.pipe(
            take(1),
            switchMap((callError) => throwError(() => callError.error))
          )
        )
      );

      this._calls$.next({
        [`${callSession.id}`]: callSession,
        ...this._calls$.value
      });

      return callSession;
    } catch (error) {
      logger.error('[Session] Error creating outbound call:', error);
      callSession?.destroy();
      const message =
        error instanceof TimeoutError ? 'Call create timeout' : 'Call creation failed';
      const callError = new CallCreateError(message, error, 'outbound');
      this._errors$.next(callError);
      throw callError;
    }
  }

  private async createCall(options: CallOptions = {}): Promise<WebRTCCall> {
    try {
      const addressURI = getAddressSearchURI(options);

      // For PSTN numbers (starting with +), skip the directory lookup
      // and create the call directly with the phone number as destination.
      let address: Address | undefined;
      try {
        if (!this._directory) {
          throw new DependencyError('Directory not initialized');
        }

        const addressId = await this._directory.findAddressIdByURI(addressURI);
        if (!addressId) {
          throw new DependencyError(`Address name: ${addressURI} not found`);
        }

        address = this._directory.get(addressId);
        if (!address) {
          throw new DependencyError(`Address ID: ${addressId} not found`);
        }
      } catch {
        logger.warn(`[Session] Directory lookup failed for ${addressURI}, proceeding with raw URI`);
      }

      const callSession = this.callFactory.createCall(address, {
        ...options
      });

      // Use subscribeTo() so this subscription is tracked by Destroyable
      // and cleaned up when the session is destroyed. Previously used raw
      // .subscribe() which leaked on every call created.
      this.subscribeTo(
        callSession.status$.pipe(
          filter((status) => status === 'destroyed'),
          take(1)
        ),
        () => {
          const { [`${callSession.id}`]: _, ...remainingCalls } = this._calls$.value;
          this._calls$.next(remainingCalls);
        }
      );

      return callSession;
    } catch (error) {
      logger.error('[Session] Error creating call session:', error);
      const direction = options.initOffer ? 'inbound' : 'outbound';
      throw new CallCreateError('Call create error', error, direction);
    }
  }

  public destroy(): void {
    for (const call of Object.values(this._calls$.value)) {
      void call.hangup();
    }
    super.destroy();
  }
}

export class ClientSessionWrapper implements SessionState {
  constructor(private clientSessionManager: ClientSessionManager) {}

  public get authenticated$(): Observable<boolean> {
    return this.clientSessionManager.authenticated$;
  }

  public get authenticated(): boolean {
    return this.clientSessionManager.authenticated;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public get signalingEvent$() {
    return this.clientSessionManager.signalingEvent$;
  }

  public get iceServers(): RTCIceServer[] | undefined {
    return this.clientSessionManager.iceServers;
  }

  public async execute<T extends JSONRPCResponse = JSONRPCResponse>(
    request: JSONRPCRequest,
    options?: PendingRPCOptions
  ): Promise<T> {
    return this.clientSessionManager.execute(request, options);
  }

  public get incomingCalls$(): Observable<Call[]> {
    return this.clientSessionManager.incomingCalls$;
  }

  public get incomingCalls(): Call[] {
    return this.clientSessionManager.incomingCalls;
  }

  public get calls$(): Observable<Call[]> {
    return this.clientSessionManager.calls$;
  }

  public get calls(): Call[] {
    return this.clientSessionManager.calls;
  }
}
