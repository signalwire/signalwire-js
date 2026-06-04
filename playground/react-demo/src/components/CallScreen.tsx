import { useEffect, useRef } from 'react';
import type { CallStatus, SignalWire } from '@signalwire/js';
import type { Call } from '@signalwire/web-components/types';
import type { SwCallProvider, SwCallControls } from '@signalwire/web-components';
import { useObservable } from '../hooks/useObservable';

interface CallScreenProps {
  call: Call;
  client: SignalWire;
  callStatus: CallStatus;
  onHangup: () => void;
}

/**
 * Active call view using SignalWire web components for media rendering.
 *
 * All web components here consume call state via Lit context provided by
 * <sw-call-provider>. React owns the call lifecycle (via useSignalWire) and
 * feeds it into the provider imperatively through a ref — the only place where
 * React state and the Lit context system meet.
 *
 * React also subscribes to SDK observables directly (via useObservable) for
 * any UI that needs to live in React, like the participant count badge.
 */
export function CallScreen({ call, client, callStatus, onHangup }: CallScreenProps) {
  const callProviderRef = useRef<SwCallProvider>(null);
  const callControlsRef = useRef<SwCallControls>(null);
  const participants = useObservable(call.participants$, []);

  // Feed the call and device controller into sw-call-provider so every
  // descendant web component (sw-call-status, sw-call-media, sw-self-media,
  // sw-call-controls) receives live state via Lit context. This is the
  // React ↔ Lit context bridge.
  useEffect(() => {
    const el = callProviderRef.current;
    if (!el) return;
    el.call = call;
    el.deviceController = client;
  }, [call, client]);

  // Listen for the hangup event from the web component controls and
  // configure which buttons are visible. Boolean Lit properties must be
  // set on the element directly — JSX-level hyphenated attributes become
  // string attributes, which Lit treats as truthy regardless of value.
  useEffect(() => {
    const el = callControlsRef.current;
    if (!el) return;
    el.showScreenShare = false;
    el.showFullscreen = false;
    el.showSettings = false;
    el.showTranscript = false;
    const handleHangup = () => onHangup();
    el.addEventListener('sw-call-hangup', handleHangup);
    return () => el.removeEventListener('sw-call-hangup', handleHangup);
  }, [onHangup]);

  const isConnecting =
    callStatus === 'new' || callStatus === 'ringing' || callStatus === 'connecting';

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/*
        sw-call-provider is the context bridge between React and Lit.
        All child web components read their call state from it automatically.
        We set .call via the ref above — JSX attribute syntax can't pass objects.
      */}
      <sw-call-provider ref={callProviderRef}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80">
          {/* sw-call-status reads callStateContext — knows about the call because
              sw-call-provider above it is providing that context */}
          <sw-call-status className="text-white" />
          <span className="text-sm text-gray-400">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Video area */}
        <div className="flex-1 relative overflow-hidden">
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/60">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white text-sm capitalize">{callStatus}...</p>
              </div>
            </div>
          )}

          {/* Remote video (full area) */}
          <sw-call-media style={{ width: '100%', height: '100%', display: 'block' }} />

          {/* Local video (picture-in-picture) */}
          {/* sw-local-camera reads localStream from context and works without layout layers.
              sw-self-media is designed to be slotted inside sw-call-media and requires
              a matching layoutLayer entry to render, so it is not suitable here. */}
          <div className="absolute bottom-20 right-4 w-40 rounded-xl overflow-hidden shadow-lg border-2 border-gray-700">
            <sw-local-camera mirror />
          </div>
        </div>

        {/* Controls bar — sw-ui-control-bar uses container-type: inline-size,
            so we give sw-call-controls a full-width block so its container
            queries see the real viewport width instead of shrinking to content. */}
        <div className="py-4 bg-gray-800/80">
          <sw-call-controls ref={callControlsRef} style={{ display: 'block', width: '100%' }} />
        </div>
      </sw-call-provider>
    </div>
  );
}
