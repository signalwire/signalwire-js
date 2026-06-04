import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkMonitor } from './NetworkMonitor';

import type { NetworkChangeEvent } from './NetworkMonitor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Typed helper for navigator.connection mock */
interface MockConnection {
  effectiveType: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

/** Stores captured window listeners so tests can dispatch events manually. */
type ListenerMap = Map<string, Set<EventListener>>;

function buildListenerMap(): ListenerMap {
  return new Map();
}

function captureListener(map: ListenerMap, event: string, handler: EventListener): void {
  if (!map.has(event)) {
    map.set(event, new Set());
  }
  map.get(event)!.add(handler);
}

function removeListener(map: ListenerMap, event: string, handler: EventListener): void {
  map.get(event)?.delete(handler);
}

function fireEvent(map: ListenerMap, event: string): void {
  map.get(event)?.forEach((fn) => fn(new Event(event)));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('NetworkMonitor', () => {
  let windowListeners: ListenerMap;
  let originalAddEventListener: typeof window.addEventListener;
  let originalRemoveEventListener: typeof window.removeEventListener;
  let originalOnLine: boolean;

  beforeEach(() => {
    windowListeners = buildListenerMap();

    // Preserve originals
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;
    originalOnLine = navigator.onLine;

    // Spy on window event listener methods
    window.addEventListener = vi.fn((event: string, handler: EventListener) => {
      captureListener(windowListeners, event, handler);
    }) as unknown as typeof window.addEventListener;

    window.removeEventListener = vi.fn((event: string, handler: EventListener) => {
      removeListener(windowListeners, event, handler);
    }) as unknown as typeof window.removeEventListener;

    // Default: browser is online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
    // Remove any navigator.connection mock
    if ('connection' in navigator) {
      Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
    }
  });

  // -----------------------------------------------------------------------
  // Construction & initial state
  // -----------------------------------------------------------------------

  it('should initialize with navigator.onLine value', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const monitor = new NetworkMonitor();

    expect(monitor.isOnline).toBe(false);
    monitor.destroy();
  });

  it('should default to true when navigator.onLine is true', () => {
    const monitor = new NetworkMonitor();

    expect(monitor.isOnline).toBe(true);
    monitor.destroy();
  });

  it('should register window online and offline listeners', () => {
    const monitor = new NetworkMonitor();

    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    monitor.destroy();
  });

  // -----------------------------------------------------------------------
  // Online / Offline events
  // -----------------------------------------------------------------------

  it('should emit isOnline$ = true on online event', () => {
    const monitor = new NetworkMonitor();
    const values: boolean[] = [];

    monitor.isOnline$.subscribe((v) => values.push(v));
    fireEvent(windowListeners, 'online');

    expect(values).toContain(true);
    expect(monitor.isOnline).toBe(true);
    monitor.destroy();
  });

  it('should emit isOnline$ = false on offline event', () => {
    const monitor = new NetworkMonitor();
    const values: boolean[] = [];

    monitor.isOnline$.subscribe((v) => values.push(v));
    fireEvent(windowListeners, 'offline');

    expect(values).toContain(false);
    expect(monitor.isOnline).toBe(false);
    monitor.destroy();
  });

  it('should emit networkChange$ with type "online" on online event', () => {
    const monitor = new NetworkMonitor();
    const events: NetworkChangeEvent[] = [];

    monitor.networkChange$.subscribe((e) => events.push(e));
    fireEvent(windowListeners, 'online');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('online');
    expect(events[0].timestamp).toBeGreaterThan(0);
    monitor.destroy();
  });

  it('should emit networkChange$ with type "offline" on offline event', () => {
    const monitor = new NetworkMonitor();
    const events: NetworkChangeEvent[] = [];

    monitor.networkChange$.subscribe((e) => events.push(e));
    fireEvent(windowListeners, 'offline');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('offline');
    monitor.destroy();
  });

  // -----------------------------------------------------------------------
  // Connection change events (Network Information API)
  // -----------------------------------------------------------------------

  it('should listen to navigator.connection change events when available', () => {
    const mockConnection: MockConnection = {
      effectiveType: '4g',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      configurable: true
    });

    const monitor = new NetworkMonitor();

    expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    monitor.destroy();
  });

  it('should emit networkChange$ with type "connection_change" on connection change', () => {
    const connectionListeners: ListenerMap = buildListenerMap();
    const mockConnection: MockConnection = {
      effectiveType: '3g',
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        captureListener(connectionListeners, event, handler);
      }),
      removeEventListener: vi.fn()
    };
    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      configurable: true
    });

    const monitor = new NetworkMonitor();
    const events: NetworkChangeEvent[] = [];

    monitor.networkChange$.subscribe((e) => events.push(e));
    fireEvent(connectionListeners, 'change');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('connection_change');
    expect(events[0].networkType).toBe('3g');
    monitor.destroy();
  });

  // -----------------------------------------------------------------------
  // Destroy / cleanup
  // -----------------------------------------------------------------------

  it('should remove all window event listeners on destroy', () => {
    const monitor = new NetworkMonitor();
    monitor.destroy();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should remove navigator.connection listener on destroy', () => {
    const mockConnection: MockConnection = {
      effectiveType: '4g',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      configurable: true
    });

    const monitor = new NetworkMonitor();
    monitor.destroy();

    expect(mockConnection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should stop emitting on networkChange$ after destroy', () => {
    const monitor = new NetworkMonitor();
    const events: NetworkChangeEvent[] = [];

    monitor.networkChange$.subscribe((e) => events.push(e));
    monitor.destroy();

    // Manually invoke the handler — should no-op because subjects are complete
    fireEvent(windowListeners, 'online');

    // No new events should arrive
    expect(events).toHaveLength(0);
  });

  it('should stop emitting on isOnline$ after destroy', () => {
    const monitor = new NetworkMonitor();
    const values: boolean[] = [];
    let completed = false;

    monitor.isOnline$.subscribe({
      next: (v) => values.push(v),
      complete: () => {
        completed = true;
      }
    });

    monitor.destroy();

    expect(completed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Non-browser environment safety
  // -----------------------------------------------------------------------

  it('should not throw when window is not available', () => {
    const origWindow = globalThis.window;

    // Temporarily hide window
    Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true });

    expect(() => {
      const monitor = new NetworkMonitor();
      monitor.destroy();
    }).not.toThrow();

    // Restore
    Object.defineProperty(globalThis, 'window', { value: origWindow, configurable: true });
  });

  // -----------------------------------------------------------------------
  // Multiple events in sequence
  // -----------------------------------------------------------------------

  it('should handle rapid online/offline toggling', () => {
    const monitor = new NetworkMonitor();
    const onlineValues: boolean[] = [];
    const changeEvents: NetworkChangeEvent[] = [];

    monitor.isOnline$.subscribe((v) => onlineValues.push(v));
    monitor.networkChange$.subscribe((e) => changeEvents.push(e));

    fireEvent(windowListeners, 'offline');
    fireEvent(windowListeners, 'online');
    fireEvent(windowListeners, 'offline');
    fireEvent(windowListeners, 'online');

    // Initial value (true) + 4 toggles
    expect(onlineValues).toEqual([true, false, true, false, true]);
    expect(changeEvents).toHaveLength(4);
    expect(changeEvents.map((e) => e.type)).toEqual(['offline', 'online', 'offline', 'online']);

    monitor.destroy();
  });
});
