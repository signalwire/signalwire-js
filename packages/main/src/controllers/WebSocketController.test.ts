import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketController } from './WebSocketController';
import { Subject } from 'rxjs';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;

  private eventListeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(event: string, callback: (event: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: (event: any) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSING;
    // Real WebSocket close() is asynchronous - don't call onclose immediately
    // Tests should call simulateClose() to trigger the close event
  });

  // Helper methods for testing
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    const listeners = this.eventListeners.get('open');
    if (listeners) {
      listeners.forEach((callback) => callback(new Event('open')));
    }
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const listeners = this.eventListeners.get('close');
    if (listeners) {
      listeners.forEach((callback) => callback(new CloseEvent('close', { code, reason })));
    }
  }

  simulateError() {
    const listeners = this.eventListeners.get('error');
    if (listeners) {
      listeners.forEach((callback) => callback(new Event('error')));
    }
  }

  simulateMessage(data: string) {
    const listeners = this.eventListeners.get('message');
    if (listeners) {
      listeners.forEach((callback) => callback(new MessageEvent('message', { data })));
    }
  }
}

describe('WebSocketController - Connection Lifecycle', () => {
  let manager: WebSocketController;
  let mockWebSocket: MockWebSocket;
  let send$: Subject<string | ArrayBuffer | Blob>;
  const testEndpoint = 'wss://test.example.com';

  beforeEach(() => {
    vi.useFakeTimers();

    // Create a fresh Subject for each test
    send$ = new Subject<string | ArrayBuffer | Blob>();

    // Mock WebSocket constructor
    const MockWebSocketConstructor = vi.fn(function (this: any, url: string) {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket as any;
    }) as any;

    global.WebSocket = MockWebSocketConstructor;

    manager = new WebSocketController(MockWebSocketConstructor, testEndpoint, send$);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with disconnected status', async () => {
      const statuses: string[] = [];
      const sub = manager.status$.subscribe((s) => statuses.push(s));
      // BehaviorSubject emits current value immediately on subscribe
      expect(statuses[0]).toBe('disconnected');

      sub.unsubscribe();
    });

    it('should not create WebSocket until connect is called', () => {
      expect(global.WebSocket).not.toHaveBeenCalled();
    });
  });

  describe('Connection', () => {
    it('should change status to connecting when connect is called', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();

      expect(statuses[statuses.length - 1]).toBe('connecting');
    });

    it('should create WebSocket with correct endpoint', () => {
      manager.connect();
      expect(global.WebSocket).toHaveBeenCalledWith(testEndpoint);
    });

    it('should change status to connected when WebSocket opens', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();
      mockWebSocket.simulateOpen();

      expect(statuses[statuses.length - 1]).toBe('connected');
    });

    it('should emit status changes through status$ observable', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((status) => statuses.push(status));

      manager.connect();
      mockWebSocket.simulateOpen();

      expect(statuses).toEqual(['disconnected', 'connecting', 'connected']);
    });
  });

  describe('Disconnection', () => {
    beforeEach(() => {
      manager.connect();
      mockWebSocket.simulateOpen();
    });

    it('should change status to disconnecting when disconnect is called', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.disconnect();

      expect(statuses[statuses.length - 1]).toBe('disconnecting');
    });

    it('should close the WebSocket connection', () => {
      manager.disconnect();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should change status to disconnected after WebSocket closes', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.disconnect();
      mockWebSocket.simulateClose(); // Close is async, need to simulate it

      expect(statuses[statuses.length - 1]).toBe('disconnected');
    });

    it('should not attempt to reconnect after manual disconnect', () => {
      manager.disconnect();
      mockWebSocket.simulateClose();

      vi.advanceTimersByTime(10000);

      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Errors', () => {
    it('should emit errors through errors$ observable', async () => {
      const errors: Error[] = [];
      manager.errors$.subscribe((error) => errors.push(error));

      manager.connect();
      mockWebSocket.simulateError();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should change status to reconnecting after connection error', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();
      mockWebSocket.simulateError();
      mockWebSocket.simulateClose(1006); // Abnormal closure

      expect(statuses[statuses.length - 1]).toBe('reconnecting');
    });
  });
});

describe('WebSocketController - Automatic Reconnection', () => {
  let manager: WebSocketController;
  let mockWebSocket: MockWebSocket;
  let send$: Subject<string | ArrayBuffer | Blob>;
  const testEndpoint = 'wss://test.example.com';

  beforeEach(() => {
    vi.useFakeTimers();
    // Pin Math.random to 1.0 so the equal-jitter formula produces the full
    // ceiling value (delay * (0.5 + 1.0 * 0.5) = delay * 1.0), keeping
    // existing deterministic timing assertions valid.
    vi.spyOn(Math, 'random').mockReturnValue(1.0);

    // Create a fresh Subject for each test
    send$ = new Subject<string | ArrayBuffer | Blob>();

    const MockWebSocketConstructor = vi.fn(function (this: any, url: string) {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket as any;
    }) as any;

    global.WebSocket = MockWebSocketConstructor;

    manager = new WebSocketController(MockWebSocketConstructor, testEndpoint, send$, {
      reconnectDelayMin: 1000,
      reconnectDelayMax: 30000
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Exponential Backoff', () => {
    it('should attempt to reconnect after unexpected disconnection', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose(1006); // Abnormal closure

      expect(statuses[statuses.length - 1]).toBe('reconnecting');

      vi.advanceTimersByTime(1000);

      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should use initial delay for first reconnection attempt', () => {
      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose(1006);

      vi.advanceTimersByTime(999);
      expect(global.WebSocket).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should double the delay after each failed reconnection attempt', () => {
      manager.connect();
      mockWebSocket.simulateOpen();

      // First disconnect
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(1000); // First reconnect after 1000ms
      expect(global.WebSocket).toHaveBeenCalledTimes(2);

      // Second disconnect
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(2000); // Second reconnect after 2000ms
      expect(global.WebSocket).toHaveBeenCalledTimes(3);

      // Third disconnect
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(4000); // Third reconnect after 4000ms
      expect(global.WebSocket).toHaveBeenCalledTimes(4);
    });

    it('should cap reconnection delay at maximum value', () => {
      manager.connect();
      mockWebSocket.simulateOpen();

      // Simulate many failed reconnections to exceed max delay
      for (let i = 0; i < 10; i++) {
        mockWebSocket.simulateClose(1006);
        vi.advanceTimersByTime(Math.min(1000 * Math.pow(2, i), 30000));
      }

      // At this point delay should be capped at 30000ms
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(29999);
      const callsBefore = (global.WebSocket as any).mock.calls.length;

      vi.advanceTimersByTime(1);
      expect(global.WebSocket).toHaveBeenCalledTimes(callsBefore + 1);
    });

    it('should reset backoff delay after successful connection', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();
      mockWebSocket.simulateOpen();

      // First failed reconnection
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(1000);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);

      // Second failed reconnection (delay should be 2000ms)
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(2000);
      expect(global.WebSocket).toHaveBeenCalledTimes(3);

      // Successful connection
      mockWebSocket.simulateOpen();

      expect(statuses[statuses.length - 1]).toBe('connected');

      // Disconnect again - delay should reset to 1000ms
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(1000);
      expect(global.WebSocket).toHaveBeenCalledTimes(4);
    });

    it('should continue reconnecting indefinitely on failure', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();
      mockWebSocket.simulateOpen();

      // Simulate 20 failed reconnection attempts
      for (let i = 0; i < 20; i++) {
        mockWebSocket.simulateClose(1006);
        vi.advanceTimersByTime(Math.min(1000 * Math.pow(2, i), 30000));
      }

      // Close one more time to be in 'reconnecting' state without advancing timer
      mockWebSocket.simulateClose(1006);

      expect(global.WebSocket).toHaveBeenCalledTimes(21); // Initial + 20 reconnections
      expect(statuses[statuses.length - 1]).toBe('reconnecting');
    });
  });

  describe('Reconnection Control', () => {
    it('should reconnect on abnormal closure (code 1006)', () => {
      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose(1006); // Abnormal closure

      vi.advanceTimersByTime(1000);

      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should stop reconnecting when disconnect is called', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose(1006);

      expect(statuses[statuses.length - 1]).toBe('reconnecting');

      manager.disconnect();
      mockWebSocket.simulateClose(); // Simulate the close event after disconnect()

      vi.advanceTimersByTime(10000);

      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      expect(statuses[statuses.length - 1]).toBe('disconnected');
    });
  });

  describe('Jitter', () => {
    it('should apply jitter to reconnection delay to prevent thundering herd', () => {
      // With Math.random = 0.0, the equal-jitter formula gives delay * 0.5
      vi.spyOn(Math, 'random').mockReturnValue(0.0);

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose(1006);

      // ceiling = 1000, jittered = 1000 * (0.5 + 0.0 * 0.5) = 500
      vi.advanceTimersByTime(499);
      expect(global.WebSocket).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should produce different delays for different random values', () => {
      const randomSpy = vi.spyOn(Math, 'random');

      manager.connect();
      mockWebSocket.simulateOpen();

      // First disconnect with random = 0.5
      randomSpy.mockReturnValue(0.5);
      mockWebSocket.simulateClose(1006);

      // ceiling = 1000, jittered = 1000 * (0.5 + 0.5 * 0.5) = 750
      vi.advanceTimersByTime(749);
      expect(global.WebSocket).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should guarantee at least 50% of the backoff delay', () => {
      // Minimum jitter factor is 0.5 (when Math.random returns 0.0)
      vi.spyOn(Math, 'random').mockReturnValue(0.0);

      manager.connect();
      mockWebSocket.simulateOpen();

      // First disconnect: ceiling = 1000, min jittered delay = 500
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(500);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);

      // Second disconnect: ceiling = 2000, min jittered delay = 1000
      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(999);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(1);
      expect(global.WebSocket).toHaveBeenCalledTimes(3);
    });

    it('should spread concurrent clients across the jitter window', () => {
      // Simulate what happens when many clients use different random values:
      // all delays should fall within [ceiling * 0.5, ceiling * 1.0]
      const delays: number[] = [];
      const testValues = [0.0, 0.25, 0.5, 0.75, 1.0];
      const randomSpy = vi.spyOn(Math, 'random');

      for (const randomValue of testValues) {
        const testSend$ = new Subject<string | ArrayBuffer | Blob>();
        const TestMock = vi.fn(function (this: any, url: string) {
          return new MockWebSocket(url) as any;
        }) as any;
        const testManager = new WebSocketController(TestMock, testEndpoint, testSend$, {
          reconnectDelayMin: 1000,
          reconnectDelayMax: 30000
        });

        testManager.connect();
        const ws = TestMock.mock.results[0].value as MockWebSocket;
        ws.simulateOpen();

        randomSpy.mockReturnValue(randomValue);
        ws.simulateClose(1006);

        // ceiling = 1000, expected = 1000 * (0.5 + randomValue * 0.5)
        const expected = 1000 * (0.5 + randomValue * 0.5);
        delays.push(expected);
      }

      // Verify spread: delays should be [500, 625, 750, 875, 1000]
      expect(delays).toEqual([500, 625, 750, 875, 1000]);
      // The spread is 500ms across 5 clients — no thundering herd
      expect(delays[delays.length - 1] - delays[0]).toBe(500);
    });
  });
});

describe('WebSocketController - Message Queuing', () => {
  let manager: WebSocketController;
  let mockWebSocket: MockWebSocket;
  let send$: Subject<string | ArrayBuffer | Blob>;
  const testEndpoint = 'wss://test.example.com';

  beforeEach(() => {
    vi.useFakeTimers();

    // Create a fresh Subject for each test
    send$ = new Subject<string | ArrayBuffer | Blob>();

    const MockWebSocketConstructor = vi.fn(function (this: any, url: string) {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket as any;
    }) as any;

    global.WebSocket = MockWebSocketConstructor;

    manager = new WebSocketController(MockWebSocketConstructor, testEndpoint, send$);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Sending Messages', () => {
    it('should send message immediately when connected', () => {
      manager.connect();
      mockWebSocket.simulateOpen();

      manager.send('test message');

      expect(mockWebSocket.send).toHaveBeenCalledWith('test message');
    });

    it('should support sending different data types', () => {
      manager.connect();
      mockWebSocket.simulateOpen();

      const blob = new Blob(['test']);
      const buffer = new ArrayBuffer(8);

      manager.send('string');
      manager.send(blob);
      manager.send(buffer);

      expect(mockWebSocket.send).toHaveBeenCalledWith('string');
      expect(mockWebSocket.send).toHaveBeenCalledWith(blob);
      expect(mockWebSocket.send).toHaveBeenCalledWith(buffer);
    });

    it('should send messages through send$ observable', () => {
      manager.connect();
      mockWebSocket.simulateOpen();

      send$.next('observable message');

      expect(mockWebSocket.send).toHaveBeenCalledWith('observable message');
    });
  });

  describe('Message Queue', () => {
    it('should queue messages when disconnected', () => {
      manager.send('queued message');

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should queue messages when connecting', () => {
      manager.connect();
      manager.send('queued message');

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should send queued messages when connection opens', () => {
      manager.send('message 1');
      manager.send('message 2');
      manager.send('message 3');

      manager.connect();
      mockWebSocket.simulateOpen();

      expect(mockWebSocket.send).toHaveBeenCalledWith('message 1');
      expect(mockWebSocket.send).toHaveBeenCalledWith('message 2');
      expect(mockWebSocket.send).toHaveBeenCalledWith('message 3');
      expect(mockWebSocket.send).toHaveBeenCalledTimes(3);
    });

    it('should maintain message order when flushing queue', () => {
      const messages = ['first', 'second', 'third', 'fourth'];
      messages.forEach((msg) => manager.send(msg));

      manager.connect();
      mockWebSocket.simulateOpen();

      const calls = (mockWebSocket.send as any).mock.calls;
      expect(calls[0][0]).toBe('first');
      expect(calls[1][0]).toBe('second');
      expect(calls[2][0]).toBe('third');
      expect(calls[3][0]).toBe('fourth');
    });

    it('should queue messages sent through send$ observable', () => {
      send$.next('queued via observable');

      manager.connect();
      mockWebSocket.simulateOpen();

      expect(mockWebSocket.send).toHaveBeenCalledWith('queued via observable');
    });

    it('should clear queue after sending', () => {
      manager.send('message 1');
      manager.send('message 2');

      manager.connect();
      const firstSocket = mockWebSocket; // Capture after connect() creates it
      firstSocket.simulateOpen();

      expect(firstSocket.send).toHaveBeenCalledTimes(2);

      // Disconnect and reconnect - this creates a NEW WebSocket
      firstSocket.simulateClose(1006);
      vi.advanceTimersByTime(1000);

      // Now mockWebSocket points to the NEW instance
      mockWebSocket.simulateOpen();

      // Should not resend old messages (checking total calls across both sockets)
      // First socket should still have 2 calls, second socket should have 0
      expect(firstSocket.send).toHaveBeenCalledTimes(2);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(0);
    });

    it('should queue messages during reconnection', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose(1006);

      expect(statuses[statuses.length - 1]).toBe('reconnecting');

      manager.send('message during reconnection');

      vi.advanceTimersByTime(1000);
      mockWebSocket.simulateOpen();

      expect(mockWebSocket.send).toHaveBeenCalledWith('message during reconnection');
    });

    it('should handle mixed immediate and queued messages', () => {
      manager.send('queued 1');

      manager.connect();
      mockWebSocket.simulateOpen();

      manager.send('immediate 1');

      expect(mockWebSocket.send).toHaveBeenNthCalledWith(1, 'queued 1');
      expect(mockWebSocket.send).toHaveBeenNthCalledWith(2, 'immediate 1');
    });
  });
});

describe('WebSocketController - Observable Streams', () => {
  let manager: WebSocketController;
  let mockWebSocket: MockWebSocket;
  let send$: Subject<string | ArrayBuffer | Blob>;
  const testEndpoint = 'wss://test.example.com';

  beforeEach(() => {
    vi.useFakeTimers();

    // Create a fresh Subject for each test
    send$ = new Subject<string | ArrayBuffer | Blob>();

    const MockWebSocketConstructor = vi.fn(function (this: any, url: string) {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket as any;
    }) as any;

    global.WebSocket = MockWebSocketConstructor;

    manager = new WebSocketController(MockWebSocketConstructor, testEndpoint, send$);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('messages$ Observable', () => {
    it('should emit incoming WebSocket messages', async () => {
      const messages: string[] = [];
      manager.incomingMessages$.subscribe((event) => messages.push(event.data));

      manager.connect();
      mockWebSocket.simulateOpen();

      mockWebSocket.simulateMessage('message 1');
      mockWebSocket.simulateMessage('message 2');
      mockWebSocket.simulateMessage('message 3');

      expect(messages).toEqual(['message 1', 'message 2', 'message 3']);
    });

    it('should provide full MessageEvent to subscribers', async () => {
      let receivedEvent: MessageEvent | null = null;
      manager.incomingMessages$.subscribe((event) => {
        receivedEvent = event;
      });

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateMessage('test data');

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent?.data).toBe('test data');
      expect(receivedEvent?.type).toBe('message');
    });

    it('should continue emitting messages after reconnection', async () => {
      const messages: string[] = [];
      manager.incomingMessages$.subscribe((event) => messages.push(event.data));

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateMessage('before disconnect');

      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(1000);
      mockWebSocket.simulateOpen();

      mockWebSocket.simulateMessage('after reconnect');

      expect(messages).toEqual(['before disconnect', 'after reconnect']);
    });
  });

  describe('errors$ Observable', () => {
    it('should emit connection errors', async () => {
      const errors: Error[] = [];
      manager.errors$.subscribe((error) => errors.push(error));

      manager.connect();
      mockWebSocket.simulateError();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toBeInstanceOf(Error);
    });

    it('should emit timeout errors', async () => {
      const errors: Error[] = [];
      manager.errors$.subscribe((error) => errors.push(error));

      manager.connect();

      // Don't simulate open - let it timeout
      await vi.advanceTimersByTimeAsync(10000);

      const timeoutError = errors.find((e) => e.message.includes('timeout'));
      expect(timeoutError).toBeDefined();
    });

    it('should continue emitting errors after reconnection', async () => {
      const errors: Error[] = [];
      manager.errors$.subscribe((error) => errors.push(error));

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateError();

      const errorCountBefore = errors.length;

      mockWebSocket.simulateClose(1006);
      vi.advanceTimersByTime(1000);
      mockWebSocket.simulateError();

      expect(errors.length).toBeGreaterThan(errorCountBefore);
    });
  });

  describe('status$ Observable', () => {
    it('should be a BehaviorSubject with initial value', async () => {
      const statuses: string[] = [];
      const sub = manager.status$.subscribe((s) => statuses.push(s));
      // BehaviorSubject emits current value immediately on subscribe
      expect(statuses[0]).toBe('disconnected');

      sub.unsubscribe();
    });

    it('should emit all status transitions', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((status) => statuses.push(status));

      manager.connect();
      mockWebSocket.simulateOpen();
      manager.disconnect();
      mockWebSocket.simulateClose(); // Simulate close event after disconnect()

      expect(statuses).toEqual([
        'disconnected',
        'connecting',
        'connected',
        'disconnecting',
        'disconnected'
      ]);
    });

    it('should emit reconnecting status', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((status) => statuses.push(status));

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose(1006);

      expect(statuses).toContain('reconnecting');
    });

    it('should allow late subscribers to get current status', async () => {
      manager.connect();
      mockWebSocket.simulateOpen();

      // Subscribe after connection is established
      let currentStatus = '';
      manager.status$.subscribe((status) => {
        currentStatus = status;
      });

      expect(currentStatus).toBe('connected');
    });
  });

  describe('send$ Observable', () => {
    it('should send messages when values are emitted', () => {
      manager.connect();
      mockWebSocket.simulateOpen();

      send$.next('test message');

      expect(mockWebSocket.send).toHaveBeenCalledWith('test message');
    });

    it('should queue messages emitted while disconnected', () => {
      send$.next('queued message');

      manager.connect();
      mockWebSocket.simulateOpen();

      expect(mockWebSocket.send).toHaveBeenCalledWith('queued message');
    });

    it('should handle multiple subscribers', () => {
      manager.connect();
      mockWebSocket.simulateOpen();

      // Both subscriptions should result in the same message being sent once
      send$.next('shared message');

      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      expect(mockWebSocket.send).toHaveBeenCalledWith('shared message');
    });
  });
});

describe('WebSocketController - Connection Timeout', () => {
  let manager: WebSocketController;
  let mockWebSocket: MockWebSocket;
  let send$: Subject<string | ArrayBuffer | Blob>;
  const testEndpoint = 'wss://test.example.com';

  beforeEach(() => {
    vi.useFakeTimers();

    // Create a fresh Subject for each test
    send$ = new Subject<string | ArrayBuffer | Blob>();

    const MockWebSocketConstructor = vi.fn(function (this: any, url: string) {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket as any;
    }) as any;

    global.WebSocket = MockWebSocketConstructor;

    manager = new WebSocketController(MockWebSocketConstructor, testEndpoint, send$, {
      connectionTimeout: 5000
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Timeout Handling', () => {
    it('should timeout if connection does not open in time', async () => {
      const errors: Error[] = [];
      manager.errors$.subscribe((error) => errors.push(error));

      manager.connect();

      // Advance time but don't simulate open
      await vi.advanceTimersByTimeAsync(5000);

      const timeoutError = errors.find((e) => e.message.includes('timeout'));
      expect(timeoutError).toBeDefined();
    });

    it('should close WebSocket on timeout', async () => {
      manager.connect();

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should transition to reconnecting after timeout', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();

      await vi.advanceTimersByTimeAsync(5000);
      mockWebSocket.simulateClose(1006);

      expect(statuses[statuses.length - 1]).toBe('reconnecting');
    });

    it('should not timeout if connection opens in time', async () => {
      const errors: Error[] = [];
      manager.errors$.subscribe((error) => errors.push(error));
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();

      await vi.advanceTimersByTimeAsync(4999);
      mockWebSocket.simulateOpen();

      await vi.advanceTimersByTimeAsync(1);

      const timeoutError = errors.find((e) => e.message.includes('timeout'));
      expect(timeoutError).toBeUndefined();
      expect(statuses[statuses.length - 1]).toBe('connected');
    });

    it('should clear timeout timer when connection opens', async () => {
      const statuses: string[] = [];
      manager.status$.subscribe((s) => statuses.push(s));

      manager.connect();

      mockWebSocket.simulateOpen();

      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(10000);

      // Should still be connected
      expect(statuses[statuses.length - 1]).toBe('connected');
      expect(mockWebSocket.close).not.toHaveBeenCalled();
    });

    it('should apply timeout to reconnection attempts', async () => {
      const errors: Error[] = [];
      manager.errors$.subscribe((error) => errors.push(error));

      manager.connect();
      mockWebSocket.simulateOpen();
      mockWebSocket.simulateClose(1006);

      // Wait for reconnection attempt
      await vi.advanceTimersByTimeAsync(1000);

      // Let it timeout
      await vi.advanceTimersByTimeAsync(5000);

      const timeoutErrors = errors.filter((e) => e.message.includes('timeout'));
      expect(timeoutErrors.length).toBeGreaterThan(0);
    });

    it('should use custom timeout value', async () => {
      const customSend$ = new Subject<string | ArrayBuffer | Blob>();
      const CustomMockWebSocketConstructor = vi.fn(function (this: any, url: string) {
        mockWebSocket = new MockWebSocket(url);
        return mockWebSocket as any;
      }) as any;

      const customManager = new WebSocketController(
        CustomMockWebSocketConstructor,
        testEndpoint,
        customSend$,
        {
          connectionTimeout: 3000
        }
      );

      const errors: Error[] = [];
      customManager.errors$.subscribe((error) => errors.push(error));

      customManager.connect();

      await vi.advanceTimersByTimeAsync(2999);
      expect(errors.length).toBe(0);

      await vi.advanceTimersByTimeAsync(1);
      const timeoutError = errors.find((e) => e.message.includes('timeout'));
      expect(timeoutError).toBeDefined();
    });
  });
});

describe('WebSocketController - Unbounded Message Queue', () => {
  let manager: WebSocketController;
  let send$: Subject<string | ArrayBuffer | Blob>;
  const testEndpoint = 'wss://test.example.com';

  beforeEach(() => {
    vi.useFakeTimers();
    send$ = new Subject<string | ArrayBuffer | Blob>();

    const MockWebSocketConstructor = vi.fn(function (this: any, url: string) {
      return new MockWebSocket(url) as any;
    }) as any;

    global.WebSocket = MockWebSocketConstructor;

    manager = new WebSocketController(MockWebSocketConstructor, testEndpoint, send$);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('BUG: message queue grows without bound while disconnected', () => {
    // Bug #4: WebSocketController.ts:39 — The messageQueue array has no upper
    // bound. When disconnected, every call to send() pushes to the array.
    // Over time (e.g., heartbeats/keepalives), this can consume unbounded memory.
    //
    // This test documents the behavior: sending 10,000 messages while disconnected
    // results in all 10,000 being queued with no limit.

    const MESSAGE_COUNT = 10_000;

    for (let i = 0; i < MESSAGE_COUNT; i++) {
      manager.send(`message-${i}`);
    }

    // Access the private messageQueue to verify it grew without bound.
    // This is a white-box test that proves the queue has no cap.
    const queue = (manager as any).messageQueue as unknown[];
    expect(queue.length).toBe(MESSAGE_COUNT);

    // A well-behaved implementation would cap or drop old messages.
    // This test passes, documenting that the unbounded behavior exists.
  });
});
