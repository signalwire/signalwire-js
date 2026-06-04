import { useCallback, useEffect, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import { SignalWire } from '@signalwire/js';
import type { CredentialProvider, Call, CallError, CallStatus } from '@signalwire/js';
import type { Address, Directory, User } from '@signalwire/js';
import { useObservable } from './useObservable';

/** Max time to wait for the SDK to connect before giving up. */
const CONNECTION_TIMEOUT_MS = 15000;

/**
 * Hook that manages the full SignalWire client lifecycle.
 *
 * Wraps the SDK's RxJS observables into React state using useObservable,
 * demonstrating the recommended integration pattern.
 *
 * @example
 * const {
 *   connect, disconnect, dial,
 *   isConnected, user, addresses, activeCall
 * } = useSignalWire();
 */
export function useSignalWire() {
  const [client, setClient] = useState<SignalWire | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs so callbacks always access the latest value without stale closures
  const clientRef = useRef<SignalWire | null>(null);
  clientRef.current = client;
  const activeCallRef = useRef<Call | null>(null);
  activeCallRef.current = activeCall;

  // --- Derived state from SDK observables ---
  const isConnected = useObservable(client?.isConnected$, false);
  const isRegistered = useObservable(client?.isRegistered$, false);
  const user = useObservable(client?.user$, undefined) as User | undefined;
  const directory = useObservable(client?.directory$, undefined) as Directory | undefined;

  // Flatten directory.addresses$ (switches when directory becomes available)
  const addresses$ = directory?.addresses$;
  const addresses = useObservable(addresses$, []) as Address[];

  // Incoming calls from the session
  const incomingCalls$ = client?.session?.incomingCalls$;
  const incomingCalls = useObservable(incomingCalls$, []) as Call[];

  // Active call status
  const callStatus = useObservable(activeCall?.status$, 'new' as CallStatus);

  // --- Connect: create SignalWire client ---
  const connect = useCallback(async (credentialProvider: CredentialProvider) => {
    setError(null);
    setIsLoading(true);

    try {
      const sw = new SignalWire(credentialProvider);

      // Wait for connection to establish.
      // Both subscriptions and the timeout are cleaned up on every exit path.
      await new Promise<void>((resolve, reject) => {
        let connSub: Subscription;
        let errSub: Subscription;

        const cleanup = () => {
          clearTimeout(timeout);
          connSub.unsubscribe();
          errSub.unsubscribe();
        };

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Connection timed out'));
        }, CONNECTION_TIMEOUT_MS);

        connSub = sw.isConnected$.subscribe((connected) => {
          if (connected) {
            cleanup();
            resolve();
          }
        });

        errSub = sw.errors$.subscribe((err) => {
          cleanup();
          reject(err);
        });
      });

      setClient(sw);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Disconnect: tear down the client ---
  const disconnect = useCallback(async () => {
    if (activeCallRef.current) {
      try {
        await activeCallRef.current.hangup();
      } catch {
        // Call may already be ended
      }
      setActiveCall(null);
    }

    if (clientRef.current) {
      try {
        await clientRef.current.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      clientRef.current.destroy();
    }

    setClient(null);
    setError(null);
  }, []);

  // --- Dial: make an outbound call ---
  const dial = useCallback(
    async (destination: string) => {
      if (!client) return;
      setError(null);

      try {
        const call = await client.dial(destination, {
          audio: true,
          video: true,
          receiveAudio: true,
          receiveVideo: true,
        });
        setActiveCall(call);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [client]
  );

  // --- Answer incoming call ---
  const answerCall = useCallback(async (call: Call) => {
    try {
      await call.answer();
      setActiveCall(call);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // --- Reject incoming call ---
  const rejectCall = useCallback(async (call: Call) => {
    try {
      await call.reject();
    } catch {
      // Call may already be ended
    }
  }, []);

  // --- Hangup active call ---
  const hangup = useCallback(async () => {
    if (!activeCallRef.current) return;
    try {
      await activeCallRef.current.hangup();
    } catch {
      // Call may already be ended
    }
    setActiveCall(null);
  }, []);

  // Clear active call when it disconnects, fails, or is destroyed
  useEffect(() => {
    if (!activeCall) return;

    const statusSub = activeCall.status$.subscribe((status: CallStatus) => {
      if (status === 'disconnected' || status === 'destroyed' || status === 'failed') {
        setActiveCall(null);
      }
    });

    // Subscribe to call errors — fatal errors auto-destroy the call,
    // so we only need to surface the message to the user here.
    const errorSub = activeCall.errors$.subscribe((callError: CallError) => {
      const prefix = callError.fatal ? '[Fatal]' : '[Error]';
      setError(`${prefix} ${callError.kind}: ${callError.error.message}`);
    });

    return () => {
      statusSub.unsubscribe();
      errorSub.unsubscribe();
    };
  }, [activeCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.disconnect();
          clientRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    // State
    client,
    isConnected,
    isRegistered,
    user,
    directory,
    addresses,
    activeCall,
    callStatus,
    incomingCalls,
    error,
    isLoading,

    // Actions
    connect,
    disconnect,
    dial,
    answerCall,
    rejectCall,
    hangup
  };
}
