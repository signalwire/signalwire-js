/**
 * Global type declarations for e2e tests.
 *
 * These extend the Window interface with properties set during tests
 * via page.evaluate() calls.
 *
 * Uses the real SDK types from @signalwire/js so that test types
 * stay in sync with the public API surface automatically.
 */

import type { Observable } from 'rxjs';
import type {
  Call,
  CallParticipant,
  CallSelfParticipant,
  CredentialProvider,
  LogLevel,
  DebugOptions,
} from '@signalwire/js';
import type { SignalWire } from '@signalwire/js';
import type { StaticCredentialProvider } from '@signalwire/js';

declare global {
  interface Window {
    /**
     * SignalWire class constructor — available after the SDK bundle loads.
     */
    SignalWire: typeof SignalWire;

    /**
     * StaticCredentialProvider class — wraps a token for authentication.
     */
    StaticCredentialProvider: typeof StaticCredentialProvider;

    /**
     * Wait for the first value from an observable that matches a predicate.
     * Auto-unsubscribes on match or timeout — no subscription leaks.
     */
    __waitFor: <T>(
      observable: Observable<T>,
      predicate: (value: T) => boolean,
      timeoutMs: number,
      label: string
    ) => Promise<T>;

    /** Set if the SDK module failed to load */
    __sdkLoadError?: string;

    /** Active SignalWire client instance, set during test setup */
    __swClient: InstanceType<typeof SignalWire>;

    /** Active call instance, set during test setup */
    __swCall: Call;

    /** Collected errors from client.errors$ — set by setupErrorListener() */
    __transportErrors: unknown[];

    /** Subscription handle for the error listener — for cleanup */
    __transportErrorSub?: { unsubscribe(): void };

    /** Set SDK log level (exposed from test-page.html) */
    __setLogLevel: (level: LogLevel) => void;

    /** Set SDK debug options (exposed from test-page.html) */
    __setDebugOptions: (options: DebugOptions | null) => void;
  }
}

export type { Call, CallParticipant, CallSelfParticipant, CredentialProvider };
