import { createContext } from '@lit/context';
import type { Observable, Subscription } from 'rxjs';
import type { ReactiveControllerHost } from 'lit';
import type { Call, LayoutLayer } from '../types/index.js';
import type {
  CallStatus,
  CallParticipant,
  CallSelfParticipant,
  CallAddress,
  MediaDirections,
  VideoPosition,
} from '@signalwire/js';

// ── Context value shape ───────────────────────────────────────────────────────

export interface CallState {
  // ── Identity (static, set once on connect) ──────────────────────────────
  id: string;
  direction: 'inbound' | 'outbound';
  to: string | undefined;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  status: CallStatus;

  // ── Room state ───────────────────────────────────────────────────────────
  recording: boolean;
  streaming: boolean;
  locked: boolean;
  raiseHandPriority: boolean;
  meta: Record<string, unknown>;

  // ── Participants ─────────────────────────────────────────────────────────
  participants: CallParticipant[];
  /** The local/self participant. Null until the call is joined. */
  self: CallSelfParticipant | null;

  // ── Media streams ────────────────────────────────────────────────────────
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  mediaDirections: MediaDirections;

  // ── Layout ───────────────────────────────────────────────────────────────
  layout: string | undefined;
  layouts: string[];
  layoutLayers: LayoutLayer[];

  // ── Address / capabilities ───────────────────────────────────────────────
  address: CallAddress | undefined;
  capabilities: string[];

  // ── Actions ──────────────────────────────────────────────────────────────
  hangup: () => Promise<void>;
  toggleLock: () => Promise<void>;
  toggleHold: () => Promise<void>;
  setLayout: (layout: string, positions?: Record<string, VideoPosition>) => Promise<void>;
  startRecording: () => Promise<void>;
  startStreaming: () => Promise<void>;
  sendDigits: (digits: string) => Promise<void>;
  answer: () => void;
  reject: () => void;
}

export const callStateContext = createContext<CallState>('sw-call-state');

// ── Incoming call info ───────────────────────────────────────────────────────

export interface IncomingCallInfo {
  call: Call;
  callerName: string | undefined;
  callerNumber: string | undefined;
}

// ── Incoming call controller ─────────────────────────────────────────────────

type IncomingCallCallback = (info: IncomingCallInfo) => void;

/**
 * Listens to an incoming-calls observable and fires a callback for each
 * new inbound call. Deduplicates by call ID so a call is never announced
 * twice.
 *
 * Usage in a provider component:
 *
 *   private _incoming = new IncomingCallController(this);
 *
 *   // Set the handler:
 *   this._incoming.onIncomingCall = (info) => { ... };
 *
 *   // Start listening (pass the observable from client.session):
 *   this._incoming.connect(client.session.incomingCalls$);
 *
 *   // Stop listening:
 *   this._incoming.disconnect();
 */
export class IncomingCallController {
  private _subscription: Subscription | null = null;
  private _seenCallIds = new Set<string>();
  private _callback: IncomingCallCallback | null = null;

  constructor(host: ReactiveControllerHost & EventTarget) {
    host.addController(this);
  }

  // Intentionally not a stateful ReactiveController. We only register with
  // `host.addController(this)` so `hostDisconnected()` can clean up the
  // RxJS subscription on removal — there's no provider, no host requestUpdate(),
  // and `hostConnected()` is a deliberate no-op.
  hostConnected() {}
  hostDisconnected() {
    this.disconnect();
  }

  set onIncomingCall(cb: IncomingCallCallback) {
    this._callback = cb;
  }

  connect(incomingCalls$: Observable<Call[]>): void {
    this.disconnect();

    this._subscription = incomingCalls$.subscribe((calls) => {
      for (const call of calls) {
        if (this._seenCallIds.has(call.id)) continue;
        this._seenCallIds.add(call.id);

        this._callback?.({
          call,
          callerName: call.fromName,
          callerNumber: call.from,
        });
      }
    });
  }

  disconnect(): void {
    this._subscription?.unsubscribe();
    this._subscription = null;
    this._seenCallIds.clear();
  }
}
