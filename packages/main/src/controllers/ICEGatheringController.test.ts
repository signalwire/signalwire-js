import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';

import { ICEGatheringController } from './ICEGatheringController';

// Mock RTCIceCandidate
class MockRTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  type: RTCIceCandidateType | null = null;

  constructor(init?: RTCIceCandidateInit) {
    this.candidate = init?.candidate ?? '';
    this.sdpMid = init?.sdpMid ?? null;
    this.sdpMLineIndex = init?.sdpMLineIndex ?? null;

    const typeMatch = this.candidate.match(/typ\s+(host|srflx|prflx|relay)/);
    if (typeMatch) {
      this.type = typeMatch[1] as RTCIceCandidateType;
    }
  }

  toJSON() {
    return {
      candidate: this.candidate,
      sdpMid: this.sdpMid,
      sdpMLineIndex: this.sdpMLineIndex
    };
  }
}

// Mock RTCSessionDescription
class MockRTCSessionDescription {
  type: RTCSdpType;
  sdp: string;

  constructor(init: RTCSessionDescriptionInit) {
    this.type = init.type;
    this.sdp = init.sdp ?? '';
  }
}

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  iceGatheringState: RTCIceGatheringState = 'new';
  connectionState: RTCPeerConnectionState = 'new';
  localDescription: MockRTCSessionDescription | null = null;
  private eventListeners = new Map<string, Set<EventListener>>();
  private configuration: RTCConfiguration = {
    iceServers: [],
    iceTransportPolicy: 'all'
  };

  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  onicegatheringstatechange: ((event: Event) => void) | null = null;

  addEventListener = vi.fn((type: string, listener: EventListener) => {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  });

  removeEventListener = vi.fn((type: string, listener: EventListener) => {
    this.eventListeners.get(type)?.delete(listener);
  });

  restartIce = vi.fn();

  getConfiguration = vi.fn(() => {
    return { ...this.configuration };
  });

  setConfiguration = vi.fn((config: RTCConfiguration) => {
    this.configuration = { ...this.configuration, ...config };
  });

  dispatchEvent = vi.fn((event: Event) => {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
    return true;
  });

  // Helper methods for testing
  simulateICECandidate(candidate: RTCIceCandidateInit | null) {
    const event = {
      candidate: candidate ? new MockRTCIceCandidate(candidate) : null
    } as RTCPeerConnectionIceEvent;
    this.onicecandidate?.(event);
    this.dispatchEventToListeners('icecandidate', event);
  }

  simulateICEGatheringStateChange(state: RTCIceGatheringState) {
    this.iceGatheringState = state;
    const event = new Event('icegatheringstatechange');
    this.onicegatheringstatechange?.(event);
    this.dispatchEventToListeners('icegatheringstatechange', event);
  }

  setLocalDescription(sdp: string, type: RTCSdpType = 'offer') {
    this.localDescription = new MockRTCSessionDescription({ type, sdp });
  }

  private dispatchEventToListeners(type: string, event: Event | RTCPeerConnectionIceEvent) {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => listener(event as Event));
    }
  }
}

describe('ICEGatheringController', () => {
  let controller: ICEGatheringController;
  let mockPeerConnection: MockRTCPeerConnection;
  let isNegotiating$: BehaviorSubject<boolean>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockPeerConnection = new MockRTCPeerConnection();
    isNegotiating$ = new BehaviorSubject<boolean>(false);
  });

  afterEach(() => {
    controller?.destroy();
    isNegotiating$.complete();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create controller with default options', () => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$
      );
      expect(controller).toBeDefined();
    });

    it('should create controller with custom options', () => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 1000,
          iceGatheringTimeout: 10000
        }
      );
      expect(controller).toBeDefined();
    });

    it('should initialize relayOnly from options', () => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        { relayOnly: true }
      );
      expect(controller.isRelayOnly).toBe(true);
    });

    it('should initialize relayOnly as false by default', () => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$
      );
      expect(controller.isRelayOnly).toBe(false);
    });

    it('should setup event listeners on peer connection in constructor', () => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$
      );

      expect(mockPeerConnection.addEventListener).toHaveBeenCalledWith(
        'icecandidate',
        expect.any(Function)
      );
      expect(mockPeerConnection.addEventListener).toHaveBeenCalledWith(
        'icegatheringstatechange',
        expect.any(Function)
      );
    });
  });

  describe('Negotiation State Subscription', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 600,
          iceGatheringTimeout: 6000
        }
      );
    });

    it('should start ICE gathering timeout timer when negotiation starts', () => {
      // Set a valid SDP for timeout to emit
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      // Subscribe to capture timeout emission
      const receivedStates: string[] = [];
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedStates.push(state);
      });

      // Start negotiation (this starts the timer)
      isNegotiating$.next(true);

      // Advance past ICE gathering timeout
      vi.advanceTimersByTime(6100);

      // The gathering timer should have fired and emitted a timeout state
      const timeoutState = receivedStates.find((s) => s === 'timeout');
      expect(timeoutState).toBeDefined();

      sub.unsubscribe();
    });

    it('should not start timer when negotiation is false', () => {
      // Set a valid SDP
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      // Subscribe to check no emissions occur
      const receivedStates: string[] = [];
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedStates.push(state);
      });

      // Keep negotiating false (default)
      isNegotiating$.next(false);

      // Timer should not be started when not negotiating
      vi.advanceTimersByTime(6100);

      // No timeout should have been triggered (filter blocks when not negotiating)
      const timeoutState = receivedStates.find((s) => s === 'timeout');
      expect(timeoutState).toBeUndefined();

      sub.unsubscribe();
    });
  });

  describe('ICE Candidate Handling', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 600,
          iceGatheringTimeout: 6000
        }
      );
      // Start negotiation
      isNegotiating$.next(true);
    });

    it('should handle ICE candidates', () => {
      mockPeerConnection.simulateICECandidate({
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
        sdpMid: 'audio',
        sdpMLineIndex: 0
      });

      // Should not throw
    });

    it('should handle null candidate (end of gathering)', () => {
      mockPeerConnection.simulateICECandidate(null);

      // Should not throw and should set a short timeout
      vi.advanceTimersByTime(700); // iceGatheringTimeout / 10 = 600
    });

    it('should trigger ICE candidate timeout after delay', () => {
      // isNegotiating$ is already true from beforeEach
      // Set a valid SDP to allow timeout to complete
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      // Subscribe to iceCandidatesState$
      let receivedState: string | null = null;
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedState = state;
      });

      mockPeerConnection.simulateICECandidate({
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
        sdpMid: 'audio',
        sdpMLineIndex: 0
      });

      // Advance past ICE candidate timeout - this triggers the state change
      vi.advanceTimersByTime(700);

      expect(receivedState).not.toBeNull();
      expect(receivedState).toBe('timeout');

      sub.unsubscribe();
    });
  });

  describe('ICE Gathering State Changes', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 600,
          iceGatheringTimeout: 6000
        }
      );
    });

    it('should emit complete state when gathering completes while negotiating', () => {
      // Set a valid SDP
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      // Start negotiation so emissions can occur
      isNegotiating$.next(true);

      // Subscribe
      let receivedState: string | null = null;
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedState = state;
      });

      // Simulate null candidate (end of gathering) which triggers handleICEGatheringComplete
      mockPeerConnection.iceGatheringState = 'complete';
      mockPeerConnection.simulateICECandidate(null);

      expect(receivedState).not.toBeNull();
      expect(receivedState).toBe('complete');

      sub.unsubscribe();
    });

    it('should not emit while not negotiating', () => {
      // Set a valid SDP
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      // Not negotiating (default is false)
      // Subscribe
      let receivedState: string | null = null;
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedState = state;
      });

      // ICE gathering completes
      mockPeerConnection.simulateICEGatheringStateChange('complete');

      // Not negotiating - should not have emitted
      expect(receivedState).toBeNull();

      sub.unsubscribe();
    });
  });

  describe('ICE Gathering Timeout', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 600,
          iceGatheringTimeout: 6000
        }
      );
    });

    it('should emit timeout state after iceGatheringTimeout duration with valid SDP', () => {
      // Set a valid SDP
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      // Subscribe BEFORE starting negotiation to avoid the tap clearing the timer
      // when the initial BehaviorSubject value passes through
      const receivedStates: string[] = [];
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedStates.push(state);
      });

      // Start negotiation (which starts the timer and allows emissions)
      isNegotiating$.next(true);

      vi.advanceTimersByTime(6100);

      // Should have received the timeout state
      const timeoutState = receivedStates.find((s) => s === 'timeout');
      expect(timeoutState).toBeDefined();
      expect(timeoutState).toBe('timeout');

      sub.unsubscribe();
    });

    it('should not emit timeout if gathering completes first', () => {
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      // Start negotiation (allows emissions)
      isNegotiating$.next(true);

      // Subscribe
      let receivedState: string | null = null;
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedState = state;
      });

      // Gathering completes before timeout - simulate null candidate (end of gathering)
      mockPeerConnection.iceGatheringState = 'complete';
      mockPeerConnection.simulateICECandidate(null);

      expect(receivedState).not.toBeNull();
      expect(receivedState).toBe('complete');

      sub.unsubscribe();
    });

    it('should not emit timeout if SDP is invalid on timeout', () => {
      // Start negotiating (which starts the timer and allows emissions)
      isNegotiating$.next(true);

      // Subscribe and track all states
      const receivedStates: string[] = [];
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedStates.push(state);
      });

      // No valid SDP set - only host candidates
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host\r\n`
      );

      // Advance past timeout - handleICEGatheringTimeout won't emit because SDP is invalid
      vi.advanceTimersByTime(6100);

      // The observable should not have emitted a timeout state (SDP is invalid)
      // The handleICEGatheringTimeout only calls _iceCandidatesState.next when validSDP is true
      // We may have received the initial 'gathering' state, but not a 'timeout' state
      const timeoutState = receivedStates.find((s) => s === 'timeout');
      expect(timeoutState).toBeUndefined();

      sub.unsubscribe();
    });
  });

  describe('ICE Candidate Timeout', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 600,
          iceGatheringTimeout: 6000
        }
      );
    });

    it('should call restartICEGatheringWithRelayOnly when SDP is invalid and not relay only', () => {
      isNegotiating$.next(true);
      // No valid SDP set
      controller.handleICECandidateTimeout();

      expect(mockPeerConnection.restartIce).toHaveBeenCalled();
      expect(controller.isRelayOnly).toBe(true);
    });

    it('should emit timeout state when SDP is valid', () => {
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      // Start negotiation so emissions can occur
      isNegotiating$.next(true);

      // Subscribe
      let receivedState: string | null = null;
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedState = state;
      });

      controller.handleICECandidateTimeout();

      expect(receivedState).not.toBeNull();
      expect(receivedState).toBe('timeout');

      sub.unsubscribe();
    });

    it('should emit timeout state when relay only mode is enabled', () => {
      controller.setRelayOnly(true);

      // Start negotiation so emissions can occur
      isNegotiating$.next(true);

      // Subscribe
      let receivedState: string | null = null;
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedState = state;
      });

      controller.handleICECandidateTimeout();

      expect(receivedState).not.toBeNull();
      expect(receivedState).toBe('timeout');

      sub.unsubscribe();
    });
  });

  describe('SDP Validation', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$
      );
    });

    it('should return false for invalid SDP (only host candidates)', () => {
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host\r\n`
      );

      expect(controller.hasValidLocalDescriptionSDP).toBe(false);
    });

    it('should return true for valid SDP (has non-host candidates)', () => {
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      expect(controller.hasValidLocalDescriptionSDP).toBe(true);
    });

    it('should return false when no local description is set', () => {
      expect(controller.hasValidLocalDescriptionSDP).toBe(false);
    });
  });

  describe('Relay Only Mode', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$
      );
    });

    it('should set and get relay only mode', () => {
      expect(controller.isRelayOnly).toBe(false);

      controller.setRelayOnly(true);
      expect(controller.isRelayOnly).toBe(true);

      controller.setRelayOnly(false);
      expect(controller.isRelayOnly).toBe(false);
    });

    it('should restart ICE gathering with relay only', () => {
      controller.restartICEGatheringWithRelayOnly();

      expect(controller.isRelayOnly).toBe(true);
      expect(mockPeerConnection.restartIce).toHaveBeenCalled();
    });

    it('should restart ICE even when already connected', () => {
      mockPeerConnection.connectionState = 'connected';
      controller.restartICEGatheringWithRelayOnly();

      expect(controller.isRelayOnly).toBe(true);
      // setConfiguration() alone does not engage a new iceTransportPolicy.
      // Only restartIce() triggers a fresh gather that actually uses it.
      expect(mockPeerConnection.restartIce).toHaveBeenCalled();
    });
  });

  describe('Timer Management', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 600,
          iceGatheringTimeout: 6000
        }
      );
      isNegotiating$.next(true);
    });

    it('should remove ICE gathering timer', () => {
      controller.removeTimer('iceGatheringTimer');
      // Should not throw and timer should be cleared
      // Verify by advancing time - no timeout should fire
    });

    it('should remove ICE candidate timer', () => {
      mockPeerConnection.simulateICECandidate({
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
        sdpMid: 'audio',
        sdpMLineIndex: 0
      });

      controller.removeTimer('iceCandidateTimer');

      // Timer should be cleared
    });
  });

  describe('ICE Candidates State Observable', () => {
    beforeEach(() => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 600,
          iceGatheringTimeout: 6000
        }
      );
    });

    it('should not emit while not negotiating', async () => {
      // Default is not negotiating (false)
      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      let emitted = false;
      const sub = controller.iceCandidatesState$.subscribe(() => {
        emitted = true;
      });

      mockPeerConnection.simulateICEGatheringStateChange('complete');

      // Not negotiating, should not emit
      expect(emitted).toBe(false);
      sub.unsubscribe();
    });

    it('should emit when negotiating and state changes', async () => {
      // Start negotiating to allow emissions
      isNegotiating$.next(true);

      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      let receivedState: string | null = null;
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedState = state;
      });

      // ICE gathering completes while negotiating - simulate null candidate (end of gathering)
      mockPeerConnection.iceGatheringState = 'complete';
      mockPeerConnection.simulateICECandidate(null);

      expect(receivedState).toBeDefined();
      expect(receivedState).toBe('complete');

      sub.unsubscribe();
    });

    it('should emit each time state changes while negotiating', async () => {
      // Start negotiating to allow emissions
      isNegotiating$.next(true);

      mockPeerConnection.setLocalDescription(
        `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\n`
      );

      const receivedStates: string[] = [];
      const sub = controller.iceCandidatesState$.subscribe((state) => {
        receivedStates.push(state);
      });

      // Initial subscription may have captured the initial 'new' state
      const initialCount = receivedStates.length;

      // 'gathering' state change - should emit 'gathering'
      mockPeerConnection.simulateICEGatheringStateChange('gathering');
      expect(receivedStates.length).toBe(initialCount + 1);
      expect(receivedStates[receivedStates.length - 1]).toBe('gathering');

      // State change while negotiating - simulate null candidate (end of gathering)
      // Note: After complete, event listeners are removed, so no more emissions will occur
      mockPeerConnection.iceGatheringState = 'complete';
      mockPeerConnection.simulateICECandidate(null);

      // Should have one more emission (complete)
      expect(receivedStates.length).toBe(initialCount + 2);
      expect(receivedStates[receivedStates.length - 1]).toBe('complete');

      sub.unsubscribe();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should remove event listeners on destroy', () => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$
      );

      controller.destroy();

      expect(mockPeerConnection.removeEventListener).toHaveBeenCalledWith(
        'icegatheringstatechange',
        expect.any(Function)
      );
      expect(mockPeerConnection.removeEventListener).toHaveBeenCalledWith(
        'icecandidate',
        expect.any(Function)
      );
    });

    it('should clear timers on destroy', () => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$,
        {
          iceCandidateTimeout: 600,
          iceGatheringTimeout: 6000
        }
      );
      isNegotiating$.next(true);

      controller.destroy();

      // Advance time and verify no issues
      vi.advanceTimersByTime(10000);
    });

    it('should complete observables on destroy', () => {
      controller = new ICEGatheringController(
        mockPeerConnection as unknown as RTCPeerConnection,
        isNegotiating$
      );

      const completions: string[] = [];
      controller.iceCandidatesState$.subscribe({
        complete: () => completions.push('iceCandidatesState$')
      });

      controller.destroy();

      expect(completions).toContain('iceCandidatesState$');
    });
  });
});
