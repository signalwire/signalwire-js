/**
 * Public API entry point for @signalwire/js
 *
 * IMPORTANT: This file should NEVER be imported by internal modules.
 * Internal modules must import directly from source files.
 *
 * This file defines the minimal public API surface for external consumers.
 */

// ============================================================================
// Main Entry Point
// ============================================================================

export { SignalWire } from './clients/SignalWire';

export { embeddableCall } from './utils/embeddableCall';

export { StaticCredentialProvider } from './dependencies/StaticCredentialProvider';
export { EmbedTokenCredentialProvider } from './dependencies/EmbedTokenCredentialProvider';
export { getLogger } from './utils/logger';
export type {
  CredentialProvider,
  AuthenticateContext,
  WebRTCApiProvider,
  WebRTCMediaDevices,
  Storage
} from './dependencies/interfaces';
// ============================================================================
// Error Types (exported as values for instanceof checks)
// ============================================================================

export {
  CallCreateError,
  CollectionFetchError,
  DeviceTokenError,
  DPoPInitError,
  InvalidCredentialsError,
  MediaTrackError,
  MessageParseError,
  TokenRefreshError,
  UnexpectedError,
  VertoPongError,
  RecoveryError,
  OverconstrainedFallbackError,
  PreflightError
} from './core/errors';
export type { CallError, CallErrorKind } from './core/errors';

// ============================================================================
// Domain Model Classes (exported as values for instanceof and type guards)
// ============================================================================

export { Address } from './core/entities/Address';
export { WebRTCCall } from './core/entities/Call';
export { Participant, SelfParticipant } from './core/entities/Participant';
export { User } from './core/entities/User';
export { SelfCapabilities } from './core/capabilities';

// ============================================================================
// Domain Model Interfaces
// ============================================================================

export type { Directory } from './core/entities/Directory';
export type { SessionState } from './interfaces/SessionState';

// ============================================================================
// Type Guards (exported as values for runtime checks)
// ============================================================================

export { isSelfParticipant } from './core/entities/Participant';

// ============================================================================
// Configuration
// ============================================================================

export { ClientPreferences } from './containers/PreferencesContainer';

// ============================================================================
// Logging
// ============================================================================

export { setLogger, setLogLevel, setDebugOptions } from './utils/logger';
export type { SDKLogger, LogLevel, DebugOptions } from './utils/logger';

// ============================================================================
// Essential Types (type-only exports)
// ============================================================================

// Client types
export type { SignalWireOptions, DialOptions } from './clients/SignalWire';

// Call types
export type {
  Call,
  CallOptions,
  CallStatus,
  CallState,
  CallParticipant,
  CallSelfParticipant,
  CallAddress
} from './core/entities/types/call.types';

// Types used in Call interface methods
export type { TransferOptions, ScreenShareStatus } from './managers/types/verto-manager.types';
export type { VideoPosition, CallDirection, Capability } from './core/types/call.types';
export type {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCSuccessResponse,
  JSONRPCErrorResponse
} from './core/RPCMessages/types/base';
export type { PendingRPCOptions } from './core/utils';

// Types needed by web-components
export type { LayoutLayer } from './core/RPCMessages/types/common';

// Media types
export type { MediaOptions, MediaDirections, MediaDirection } from './core/types/media.types';

// Conversation types
export type { AddressHistory, TextMessage } from './core/types/conversation.types';

// Participant types
export type { ExecuteMethod } from './core/entities/Participant';
export type { SelectDeviceOptions } from './core/entities/types/participant.types';
export type { UserPresence } from './core/entities/User';

// Common types (credentials, adapters)
export type { SDKCredential, WebSocketAdapter, NodeSocketAdapter } from './core/types/common.types';

// Warning types (non-fatal events on SignalWire.warnings$)
export type {
  SDKWarning,
  CredentialRefreshFallbackWarning,
  CredentialRefreshFallbackReason,
  CredentialNoRefreshHandlerWarning
} from './core/types/warnings.types';

// DPoP types (for consumers inspecting user.satClaims)
export type { SATClaims } from './core/types/crypto.types';

// Capability types
export type {
  OnOffCapability,
  MemberCapabilities,
  CallCapabilitiesState
} from './core/capabilities/types';

// Device types
export type { DeviceController } from './interfaces/DeviceController';

// Stats monitor types — backward-compatible aliases (now the same types as NetworkIssue/NetworkMetrics)
export type {
  NetworkIssue as CallNetworkIssue,
  NetworkMetrics as CallNetworkMetrics
} from './controllers/RTCStatsMonitor';

// Resilience types (NetworkIssue and NetworkMetrics are canonical re-exports from RTCStatsMonitor)
export type {
  NetworkIssue,
  NetworkMetrics,
  RecoveryEvent,
  RecoveryState,
  QualityLevel,
  DeviceRecoveryEvent,
  StoredDevicePreference,
  ConstraintFallbackEvent,
  PermissionResult,
  PlatformCapabilities,
  PreflightOptions,
  PreflightResult,
  AudioConstraintsEvent,
  MediaParamsEvent,
  SessionDiagnostics,
  DiagnosticEvent,
  CallDiagnosticSummary,
  ResilienceCallStatus
} from './core/types/resilience.types';

// ============================================================================
// DO NOT EXPORT (Internal Implementation):
// - Behaviors (Destroyable, Fetchable)
// - Controllers (RTCPeerConnectionController, etc.)
// - Managers (DirectoryManager, TransportManager, ConversationsManager, etc.)
// - Containers (DependencyContainer, PreferencesContainer singleton)
// - Internal utilities and helpers
// - RPC Messages and protocol internals
// ============================================================================

// ============================================================================
// Library Ready Event (for async/dynamic script loading)
// ============================================================================

/**
 * Library version from package.json, injected at build time.
 */
export const version: string = __VERSION__;

/**
 * Flag indicating the library has been loaded and is ready to use.
 * For UMD builds: `window.SignalWire.ready`
 * For ES modules: `import { ready } from '@signalwire/js'`
 */
export const ready: boolean = true;

/**
 * Emits 'signalwire:js:ready' event when the library is loaded.
 *
 * Scripts that might load BEFORE the library (check flag first):
 *    ```js
 *    if (window.SignalWire?.ready) {
 *      // Library already loaded, use it directly
 *      initApp();
 *    } else {
 *      window.addEventListener('signalwire:js:ready', () => initApp());
 *    }
 *    ```
 */
const emitReadyEvent = (): void => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('signalwire:js:ready', {
      detail: { version: __VERSION__ }
    });
    window.dispatchEvent(event);
  }
};

emitReadyEvent();
