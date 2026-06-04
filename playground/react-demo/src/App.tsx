import { useSignalWire } from './hooks/useSignalWire';
import { LoginScreen } from './components/LoginScreen';
import { DestinationPicker } from './components/DestinationPicker';
import { CallScreen } from './components/CallScreen';
import { InboundCallModal } from './components/InboundCallModal';

/**
 * Root component.
 *
 * The entire app state is derived from @signalwire/js RxJS observables
 * via the useSignalWire hook, which internally uses useObservable to
 * bridge each observable into React state.
 *
 * Three views:
 *  1. Not connected -> LoginScreen
 *  2. Connected, no call -> DestinationPicker
 *  3. Active call -> CallScreen
 *
 * InboundCallModal overlays whenever an incoming call is received.
 */
export function App() {
  const {
    client,
    isConnected,
    user,
    directory,
    activeCall,
    callStatus,
    incomingCalls,
    error,
    isLoading,
    connect,
    disconnect,
    dial,
    answerCall,
    rejectCall,
    hangup,
  } = useSignalWire();

  // --- Not connected: show login ---
  if (!isConnected) {
    return (
      <LoginScreen
        onConnect={connect}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // --- Active call: show call screen ---
  if (activeCall && client) {
    return (
      <>
        <CallScreen
          call={activeCall}
          client={client}
          callStatus={callStatus}
          onHangup={hangup}
        />
        {/* Inbound calls can still arrive during an active call */}
        {incomingCalls.length > 0 && (
          <InboundCallModal
            call={incomingCalls[0]!}
            onAnswer={answerCall}
            onReject={rejectCall}
          />
        )}
      </>
    );
  }

  // --- Connected, no call: show destination picker ---
  const displayName = user?.displayName || user?.email || 'Connected';

  return (
    <div className="min-h-screen">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-gray-900">
            {displayName}
          </span>
        </div>
        <button
          onClick={() => void disconnect()}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Disconnect
        </button>
      </header>

      <DestinationPicker
        directory={directory}
        onDial={dial}
        error={error}
      />

      {/* Inbound call overlay */}
      {incomingCalls.length > 0 && (
        <InboundCallModal
          call={incomingCalls[0]!}
          onAnswer={answerCall}
          onReject={rejectCall}
        />
      )}
    </div>
  );
}
