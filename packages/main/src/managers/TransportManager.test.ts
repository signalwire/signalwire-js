import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransportManager } from './TransportManager';
import { RPCConnect, RPCEventAckResponse, RPCExecute } from '../core/RPCMessages';
import { PreferencesContainer } from '../containers/PreferencesContainer';
import { SERVER_PING_PROBE_TIMEOUT_MS, SERVER_PING_TIMEOUT_MS } from '../core/constants';
import { RPCTimeoutError } from '../core/errors';

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

  simulateClose() {
    this.readyState = 3; // CLOSED
    this.eventListeners.get('close')?.forEach((callback) => callback({ code: 1006 }));
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

/**
 * Outbound gate: a new socket must carry signalwire.connect
 * before anything else. Responses belong to the socket they answer, and
 * requests wait until the session authenticates on the new socket.
 */
describe('TransportManager - outbound gate', () => {
  let transport: TransportManager;
  let sockets: MockWebSocket[];

  const connectRequest = RPCConnect({ version: { major: 4, minor: 0, revision: 0 } } as never);
  const request = RPCExecute({ method: 'webrtc.verto', params: {} });

  const sentOn = (socket: MockWebSocket): string[] =>
    socket.send.mock.calls.map(([payload]) => {
      const message = JSON.parse(payload as string) as { id: string; method?: string };
      return message.method ?? `response:${message.id}`;
    });

  beforeEach(async () => {
    sockets = [];
    const MockWebSocketConstructor = vi.fn(function (url: string) {
      const socket = new MockWebSocket(url);
      sockets.push(socket);
      return socket;
    }) as unknown as WebSocketAdapter;

    transport = new TransportManager(
      createMockStorage(),
      PROTOCOL_KEY,
      MockWebSocketConstructor,
      RELAY_HOST
    );

    const connected = transport.connect();
    await vi.waitFor(() => {
      if (sockets.length === 0) throw new Error('socket not created yet');
    });
    sockets[0].simulateOpen();
    await connected;
  });

  afterEach(() => {
    vi.useRealTimers();
    transport.destroy();
    vi.clearAllMocks();
  });

  it('sends signalwire.connect before the session authenticates', () => {
    transport.send(connectRequest);

    expect(sentOn(sockets[0])).toEqual(['signalwire.connect']);
  });

  it('holds a request until the session authenticates, then sends it', () => {
    transport.send(request);
    expect(sentOn(sockets[0])).toEqual([]);

    transport.setAuthenticated();

    expect(sentOn(sockets[0])).toEqual(['webrtc.verto']);
  });

  it('sends signalwire.connect first on a new socket and drops stale responses', () => {
    vi.useFakeTimers();
    transport.setAuthenticated();

    sockets[0].simulateClose();
    // Frames produced while the socket is down: an event ack and a request
    transport.send(RPCEventAckResponse('event-from-old-socket'));
    transport.send(request);

    vi.advanceTimersByTime(PreferencesContainer.instance.reconnectDelayMin);
    expect(sockets).toHaveLength(2);
    sockets[1].simulateOpen();
    expect(sentOn(sockets[1])).toEqual([]);

    transport.send(connectRequest);
    expect(sentOn(sockets[1])).toEqual(['signalwire.connect']);

    transport.setAuthenticated();
    expect(sentOn(sockets[1])).toEqual(['signalwire.connect', 'webrtc.verto']);
  });

  it('does not send a held request after it timed out', async () => {
    vi.useFakeTimers();
    const pending = transport.execute(request, { timeoutMs: 5000 });

    vi.advanceTimersByTime(5000);
    await expect(pending).rejects.toBeInstanceOf(RPCTimeoutError);

    transport.setAuthenticated();
    expect(sentOn(sockets[0])).toEqual([]);
  });

  it('discards held requests on an explicit disconnect', async () => {
    transport.send(request);
    transport.disconnect();
    sockets[0].simulateClose();

    const reconnected = transport.connect();
    await vi.waitFor(() => {
      if (sockets.length < 2) throw new Error('socket not created yet');
    });
    sockets[1].simulateOpen();
    await reconnected;
    transport.setAuthenticated();

    expect(sentOn(sockets[1])).toEqual([]);
  });

  it('sends a response on an open socket before authentication', () => {
    transport.send(RPCEventAckResponse('event-1'));

    expect(sentOn(sockets[0])).toEqual(['response:event-1']);
  });
});

describe('TransportManager - server ping watchdog', () => {
  let transport: TransportManager;
  let sockets: MockWebSocket[];

  const serverPing = (): string =>
    JSON.stringify({
      jsonrpc: '2.0',
      id: `ping-${++eventId}`,
      method: 'signalwire.ping',
      params: { timestamp: Date.now() / 1000 }
    });

  beforeEach(async () => {
    sockets = [];
    const MockWebSocketConstructor = vi.fn(function (url: string) {
      const socket = new MockWebSocket(url);
      sockets.push(socket);
      return socket;
    }) as unknown as WebSocketAdapter;

    transport = new TransportManager(
      createMockStorage(),
      PROTOCOL_KEY,
      MockWebSocketConstructor,
      RELAY_HOST
    );
    // Pings are answered inside incomingEvent$, which the session keeps subscribed
    transport.incomingEvent$.subscribe();

    const connected = transport.connect();
    await vi.waitFor(() => {
      if (sockets.length === 0) throw new Error('socket not created yet');
    });
    sockets[0].simulateOpen();
    await connected;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    transport.destroy();
    vi.clearAllMocks();
  });

  const advancePastReconnectDelay = () =>
    vi.advanceTimersByTimeAsync(PreferencesContainer.instance.reconnectDelayMin);

  const probesSentOn = (socket: MockWebSocket): string[] =>
    socket.send.mock.calls
      .map(([payload]) => JSON.parse(payload as string) as { id: string; method?: string })
      .filter((message) => message.method === 'signalwire.ping')
      .map((message) => message.id);

  const answerProbe = (socket: MockWebSocket): void => {
    const [id] = probesSentOn(socket).slice(-1);
    socket.simulateMessage(
      JSON.stringify({ jsonrpc: '2.0', id, result: { timestamp: Date.now() / 1000 } })
    );
  };

  it('probes the server when no ping arrives in time', async () => {
    transport.setAuthenticated();

    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS - 1);
    expect(probesSentOn(sockets[0])).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(probesSentOn(sockets[0])).toHaveLength(1);
    expect(transport.connectionStatus).toBe('connected');
  });

  it('keeps the socket and waits again when the server answers the probe', async () => {
    transport.setAuthenticated();
    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS);
    answerProbe(sockets[0]);

    await vi.advanceTimersByTimeAsync(SERVER_PING_PROBE_TIMEOUT_MS);
    expect(transport.connectionStatus).toBe('connected');
    expect(probesSentOn(sockets[0])).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS - SERVER_PING_PROBE_TIMEOUT_MS);
    expect(probesSentOn(sockets[0])).toHaveLength(2);
  });

  it('replaces the socket when the probe goes unanswered', async () => {
    transport.setAuthenticated();
    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS);

    await vi.advanceTimersByTimeAsync(SERVER_PING_PROBE_TIMEOUT_MS - 1);
    expect(transport.connectionStatus).toBe('connected');

    await vi.advanceTimersByTimeAsync(1);
    expect(transport.connectionStatus).toBe('reconnecting');
    await advancePastReconnectDelay();
    expect(sockets[0].close).toHaveBeenCalled();
    expect(sockets).toHaveLength(2);
  });

  it('does not probe while pings keep arriving', async () => {
    transport.setAuthenticated();

    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS - 1000);
      sockets[0].simulateMessage(serverPing());
    }

    expect(probesSentOn(sockets[0])).toHaveLength(0);
  });

  it('does not arm before the session authenticates', async () => {
    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS * 2);

    expect(probesSentOn(sockets[0])).toHaveLength(0);
  });

  it('does not arm on a ping before the session authenticates', async () => {
    sockets[0].simulateMessage(serverPing());

    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS * 2);

    expect(probesSentOn(sockets[0])).toHaveLength(0);
  });

  it('does not replace a new socket when the probe on the old one fails', async () => {
    transport.setAuthenticated();
    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS);
    sockets[0].simulateClose();
    await advancePastReconnectDelay();
    sockets[1].simulateOpen();
    transport.setAuthenticated();

    await vi.advanceTimersByTimeAsync(SERVER_PING_PROBE_TIMEOUT_MS);

    expect(transport.connectionStatus).toBe('connected');
    expect(sockets).toHaveLength(2);
  });

  it('does not re-arm on a late ping from the socket it is replacing', async () => {
    transport.setAuthenticated();
    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS + SERVER_PING_PROBE_TIMEOUT_MS);
    expect(transport.connectionStatus).toBe('reconnecting');
    sockets[0].simulateMessage(serverPing());
    await advancePastReconnectDelay();
    sockets[1].simulateOpen();

    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS * 2);

    expect(probesSentOn(sockets[1])).toHaveLength(0);
    expect(sockets).toHaveLength(2);
  });

  it('disarms when the socket closes', async () => {
    transport.setAuthenticated();
    sockets[0].simulateClose();
    await advancePastReconnectDelay();
    expect(sockets).toHaveLength(2);
    sockets[1].simulateOpen();

    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS * 2);

    expect(probesSentOn(sockets[1])).toHaveLength(0);
  });

  it('does not reconnect after an explicit disconnect with a probe in flight', async () => {
    transport.setAuthenticated();
    await vi.advanceTimersByTimeAsync(SERVER_PING_TIMEOUT_MS);
    transport.disconnect();
    sockets[0].simulateClose();

    await vi.advanceTimersByTimeAsync(SERVER_PING_PROBE_TIMEOUT_MS * 2);

    expect(transport.connectionStatus).toBe('disconnected');
    expect(sockets).toHaveLength(1);
  });
});
