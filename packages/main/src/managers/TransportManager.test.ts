import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransportManager } from './TransportManager';
import type { StorageManager } from './StorageManager';
import type { JSONRPCRequest } from '../core/RPCMessages/types/base';
import type { WebSocketAdapter } from '../core/types/common.types';

const CURRENT_PROTOCOL = 'signalwire_proto_current';
const PROTOCOL_KEY = 'protocol_key';
const RELAY_HOST = 'wss://relay.test';

/**
 * Minimal WebSocket mock (modeled on WebSocketController.test.ts) —
 * just enough to open the connection and inject incoming messages.
 */
class MockWebSocket {
  readyState = 0; // CONNECTING

  private eventListeners: Map<string, Set<(event: unknown) => void>> = new Map();

  constructor(public url: string) {}

  addEventListener(event: string, callback: (event: unknown) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: (event: unknown) => void) {
    this.eventListeners.get(event)?.delete(callback);
  }

  send = vi.fn();
  close = vi.fn();

  simulateOpen() {
    this.readyState = 1; // OPEN
    this.eventListeners.get('open')?.forEach((callback) => callback(new Event('open')));
  }

  simulateMessage(data: string) {
    this.eventListeners
      .get('message')
      ?.forEach((callback) => callback(new MessageEvent('message', { data })));
  }
}

function createMockStorage(): StorageManager {
  const store: Record<string, unknown> = {};
  return {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete store[key];
    })
  } as unknown as StorageManager;
}

let eventId = 0;
function signalwireEvent(eventType: string, eventChannel: string): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: `evt-${++eventId}`,
    method: 'signalwire.event',
    params: {
      event_type: eventType,
      event_channel: eventChannel,
      params: {}
    }
  });
}

type ReceivedEvent = JSONRPCRequest & {
  params: { event_type: string; event_channel: string };
};

describe('TransportManager - discardStaleEvents', () => {
  let transport: TransportManager;
  let mockWebSocket: MockWebSocket | undefined;
  let received: ReceivedEvent[];

  beforeEach(async () => {
    mockWebSocket = undefined;
    const MockWebSocketConstructor = vi.fn(function (url: string) {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket;
    }) as unknown as WebSocketAdapter;

    transport = new TransportManager(
      createMockStorage(),
      PROTOCOL_KEY,
      MockWebSocketConstructor,
      RELAY_HOST
    );

    received = [];
    transport.incomingEvent$.subscribe((event) => received.push(event as ReceivedEvent));

    const connected = transport.connect();
    // The socket is created only after the async storage init completes
    await vi.waitFor(() => {
      if (!mockWebSocket) throw new Error('socket not created yet');
    });
    mockWebSocket!.simulateOpen();
    await connected;

    await transport.setProtocol(CURRENT_PROTOCOL);
  });

  afterEach(() => {
    transport.destroy();
    vi.clearAllMocks();
  });

  it('passes conversation.* events whose event_channel is not tied to the current protocol', () => {
    mockWebSocket!.simulateMessage(
      signalwireEvent('conversation.message', 'conversation-broadcast-channel')
    );

    expect(received).toHaveLength(1);
    expect(received[0].params.event_type).toBe('conversation.message');
  });

  it('discards non-conversation events whose event_channel does not match the current protocol', () => {
    mockWebSocket!.simulateMessage(signalwireEvent('call.state', 'signalwire_proto_stale'));

    expect(received).toHaveLength(0);
  });

  it('passes events whose event_channel matches the current protocol', () => {
    mockWebSocket!.simulateMessage(
      signalwireEvent('call.state', `room.${CURRENT_PROTOCOL}.channel`)
    );

    expect(received).toHaveLength(1);
    expect(received[0].params.event_type).toBe('call.state');
  });
});
