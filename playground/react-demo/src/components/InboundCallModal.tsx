import type { Call } from '@signalwire/js';
import { WebRTCCall } from '@signalwire/js';

interface InboundCallModalProps {
  call: Call;
  onAnswer: (call: Call) => void;
  onReject: (call: Call) => void;
}

/**
 * Modal overlay shown when an inbound call is received.
 * Displays caller info and accept/reject buttons.
 *
 * Note: We use WebRTCCall (the concrete class) to access fromName/from
 * which are not part of the abstract Call interface.
 */
export function InboundCallModal({
  call,
  onAnswer,
  onReject,
}: InboundCallModalProps) {
  // Extract caller info from the concrete WebRTCCall instance
  const callerName =
    call instanceof WebRTCCall
      ? call.fromName || call.from || 'Unknown caller'
      : call.address?.displayName || 'Unknown caller';

  const callerAddress =
    call instanceof WebRTCCall ? call.from : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-pulse-slow shadow-2xl">
        {/* Phone icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
        </div>

        {/* Caller info */}
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          Incoming Call
        </p>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{callerName}</h2>
        {callerAddress && callerAddress !== callerName && (
          <p className="text-sm text-gray-500 mb-6">{callerAddress}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => onReject(call)}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => onAnswer(call)}
            className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
