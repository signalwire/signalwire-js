import { ContextProvider } from '@lit/context';
import type { Subscription } from 'rxjs';
import type { Call } from '../types/index.js';
import { callStateContext } from './call-state-context.js';
import type { CallState } from './call-state-context.js';
import type { ContextHost } from './types.js';

const noop = () => Promise.resolve();
const noopVoid = () => {};

// Frozen so accidental mutation of the shared empty arrays/objects
// (`meta`, `participants`, `layouts`, `layoutLayers`, `capabilities`) throws
// instead of silently corrupting every consumer that read the empty state.
const EMPTY_CALL_STATE: CallState = Object.freeze({
  id: '',
  direction: 'outbound',
  to: undefined,
  status: 'new',
  recording: false,
  streaming: false,
  locked: false,
  raiseHandPriority: false,
  meta: Object.freeze({}) as Record<string, unknown>,
  participants: Object.freeze([]) as unknown as CallState['participants'],
  self: null,
  remoteStream: null,
  localStream: null,
  mediaDirections: Object.freeze({ audio: 'inactive', video: 'inactive' }) as CallState['mediaDirections'],
  layout: undefined,
  layouts: Object.freeze([]) as unknown as string[],
  layoutLayers: Object.freeze([]) as unknown as CallState['layoutLayers'],
  address: undefined,
  capabilities: Object.freeze([]) as unknown as string[],
  hangup: noop,
  toggleLock: noop,
  toggleHold: noop,
  setLayout: noop,
  startRecording: noop,
  startStreaming: noop,
  sendDigits: noop,
  answer: noopVoid,
  reject: noopVoid,
}) as CallState;

/**
 * ReactiveController that flattens all Call observables into a plain CallState
 * object provided via Lit context. Consumer components get automatic re-renders
 * on any change. 
 *
 * Usage in a provider component:
 *
 *   private _callState = new CallStateContextController(this);
 *
 *   // When a call arrives:
 *   this._callState.connect(call);
 *
 *   // When the call ends:
 *   this._callState.disconnect();
 */
export class CallStateContextController {
  private _provider: ContextProvider<typeof callStateContext>;
  private _subscriptions: Subscription[] = [];
  private _state: CallState = { ...EMPTY_CALL_STATE };
  private _batching = false;

  constructor(host: ContextHost) {
    this._provider = new ContextProvider(host, {
      context: callStateContext,
      initialValue: this._state,
    });
    host.addController(this);
  }

  hostConnected() {}
  hostDisconnected() {
    this.disconnect();
  }

  connect(call: Call) {
    this.disconnect();

    // Batch the synchronous initial-replay storm: each BehaviorSubject below
    // emits its current value on subscribe, which would otherwise trigger
    // ~16 consecutive setValue() calls (and consumer re-renders) within a
    // single microtask. Collect them and publish once at the end.
    this._batching = true;

    // Static identity — set once, never changes for the lifetime of this call
    this._patch({
      id: call.id,
      direction: call.direction,
      to: call.to,
    });

    // Wire up actions — bound to this call instance
    this._patch({
      hangup: () => call.hangup(),
      toggleLock: () => call.toggleLock(),
      toggleHold: () => call.toggleHold(),
      setLayout: (layout, positions = {}) => call.setLayout(layout, positions),
      startRecording: () => call.startRecording(),
      startStreaming: () => call.startStreaming(),
      sendDigits: (digits) => call.sendDigits(digits),
      answer: () => call.answer(),
      reject: () => call.reject(),
    });

    this._subscriptions = [
      call.status$.subscribe((status) =>
        this._patch({ status })
      ),
      call.recording$.subscribe((recording) =>
        this._patch({ recording })
      ),
      call.streaming$.subscribe((streaming) =>
        this._patch({ streaming })
      ),
      call.locked$.subscribe((locked) =>
        this._patch({ locked })
      ),
      call.raiseHandPriority$.subscribe((raiseHandPriority) =>
        this._patch({ raiseHandPriority })
      ),
      call.meta$.subscribe((meta) =>
        this._patch({ meta })
      ),
      call.participants$.subscribe((participants) =>
        this._patch({ participants })
      ),
      call.self$.subscribe((self) =>
        this._patch({ self })
      ),
      call.remoteStream$.subscribe((remoteStream) =>
        this._patch({ remoteStream })
      ),
      call.localStream$.subscribe((localStream) =>
        this._patch({ localStream })
      ),
      call.mediaDirections$.subscribe((mediaDirections) =>
        this._patch({ mediaDirections })
      ),
      call.layout$.subscribe((layout) =>
        this._patch({ layout })
      ),
      call.layouts$.subscribe((layouts) =>
        this._patch({ layouts })
      ),
      call.layoutLayers$.subscribe((layoutLayers) =>
        this._patch({ layoutLayers })
      ),
      call.address$.subscribe((address) =>
        this._patch({ address })
      ),
      call.capabilities$.subscribe((capabilities) =>
        this._patch({ capabilities })
      ),
    ];

    this._batching = false;
    this._publish();
  }

  disconnect() {
    this._subscriptions.forEach((s) => s.unsubscribe());
    this._subscriptions = [];
    this._patch({ ...EMPTY_CALL_STATE });
  }

  private _patch(partial: Partial<CallState>) {
    this._state = { ...this._state, ...partial };
    if (!this._batching) this._publish();
  }

  private _publish() {
    this._provider.setValue(this._state);
  }
}
