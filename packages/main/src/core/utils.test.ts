import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';

// Mock the logger before importing utils
vi.mock('../utils/logger', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    wsTraffic: vi.fn()
  };
  return {
    getLogger: () => mockLogger
  };
});

// Import after mocking
import { getLogger } from '../utils/logger';
import { callListener, PendingRPC } from './utils';
import { InvalidListenerError, JSONRPCError, RPCTimeoutError } from './errors';
import { JSONRPCRequest, JSONRPCResponse } from './RPCMessages/interfaces';

const logger = getLogger();

describe('callListener', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Happy path - synchronous listeners', () => {
    it('should call synchronous listener with value', async () => {
      const listener = vi.fn();
      const value = { test: 'data' };

      await callListener(listener, value);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(value);
    });

    it('should handle multiple calls with different values', async () => {
      const listener = vi.fn();

      await callListener(listener, 'first');
      await callListener(listener, 'second');

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 'first');
      expect(listener).toHaveBeenNthCalledWith(2, 'second');
    });
  });

  describe('Happy path - asynchronous listeners', () => {
    it('should call async listener with value', async () => {
      const listener = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      const value = { async: 'data' };

      await callListener(listener, value);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(value);
    });

    it('should wait for async listener to complete', async () => {
      let completed = false;
      const listener = async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        completed = true;
      };

      await callListener(listener, 'test');

      expect(completed).toBe(true);
    });
  });

  describe('Error handling - invalid listener', () => {
    it('should handle null listener gracefully', async () => {
      const onError = vi.fn();
      (logger.error as any).mockClear();

      await callListener(null as any, 'value', onError);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(InvalidListenerError));
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle undefined listener gracefully', async () => {
      const onError = vi.fn();
      (logger.error as any).mockClear();

      await callListener(undefined as any, 'value', onError);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(InvalidListenerError));
    });

    it('should handle non-function listener gracefully', async () => {
      const onError = vi.fn();
      (logger.error as any).mockClear();

      await callListener('not a function' as any, 'value', onError);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(InvalidListenerError));
    });

    it('should log error when listener is not a function', async () => {
      (logger.error as any).mockClear();

      await callListener({} as any, 'value');

      expect(logger.error).toHaveBeenCalledWith('listener is not a function');
    });
  });

  describe('Error handling - listener throws', () => {
    it('should catch synchronous errors and call onError callback', async () => {
      const error = new Error('Sync error');
      const listener = vi.fn(() => {
        throw error;
      });
      const onError = vi.fn();
      (logger.warn as any).mockClear();

      await callListener(listener, 'value', onError);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(logger.warn).toHaveBeenCalledWith('Error calling listener:', error);
    });

    it('should catch async errors and call onError callback', async () => {
      const error = new Error('Async error');
      const listener = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw error;
      });
      const onError = vi.fn();
      (logger.warn as any).mockClear();

      await callListener(listener, 'value', onError);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should log warning when listener throws', async () => {
      const error = new Error('Test error');
      const listener = () => {
        throw error;
      };
      (logger.warn as any).mockClear();

      await callListener(listener, 'value');

      expect(logger.warn).toHaveBeenCalledWith('Error calling listener:', error);
    });

    it('should not call onError if listener succeeds', async () => {
      const listener = vi.fn();
      const onError = vi.fn();

      await callListener(listener, 'value', onError);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Error handling - onError callback is optional', () => {
    it('should work without onError callback when listener is valid', async () => {
      const validListener = vi.fn();
      (logger.warn as any).mockClear();

      await callListener(validListener, 'value');

      expect(validListener).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should work without onError callback when listener throws', async () => {
      const listener = () => {
        throw new Error('Test error');
      };
      (logger.warn as any).mockClear();

      await callListener(listener, 'value');

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Type safety', () => {
    it('should preserve generic type information', async () => {
      interface TestData {
        id: number;
        name: string;
      }

      const listener = vi.fn((data: TestData) => {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
      });

      const value: TestData = { id: 1, name: 'test' };
      await callListener(listener, value);

      expect(listener).toHaveBeenCalledWith(value);
    });

    it('should handle primitive types', async () => {
      const stringListener = vi.fn();
      const numberListener = vi.fn();
      const booleanListener = vi.fn();

      await callListener(stringListener, 'string value');
      await callListener(numberListener, 42);
      await callListener(booleanListener, true);

      expect(stringListener).toHaveBeenCalledWith('string value');
      expect(numberListener).toHaveBeenCalledWith(42);
      expect(booleanListener).toHaveBeenCalledWith(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null value', async () => {
      const listener = vi.fn();

      await callListener(listener, null);

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should handle undefined value', async () => {
      const listener = vi.fn();

      await callListener(listener, undefined);

      expect(listener).toHaveBeenCalledWith(undefined);
    });

    it('should handle complex nested objects', async () => {
      const listener = vi.fn();
      const complexValue = {
        nested: {
          deep: {
            array: [1, 2, 3],
            object: { key: 'value' }
          }
        }
      };

      await callListener(listener, complexValue);

      expect(listener).toHaveBeenCalledWith(complexValue);
    });

    it('should propagate errors from onError callback', async () => {
      const listener = () => {
        throw new Error('Listener error');
      };
      const onError = () => {
        throw new Error('OnError callback error');
      };
      (logger.warn as any).mockClear();

      // onError callback errors should propagate
      await expect(callListener(listener, 'value', onError)).rejects.toThrow(
        'OnError callback error'
      );
    });
  });
});

describe('PendingRPC', () => {
  let responses$: Subject<JSONRPCResponse>;
  let request: JSONRPCRequest;

  beforeEach(() => {
    vi.useFakeTimers();
    responses$ = new Subject<JSONRPCResponse>();
    request = {
      jsonrpc: '2.0',
      id: 'test-request-id',
      method: 'test.method',
      params: { foo: 'bar' }
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    responses$.complete();
  });

  describe('Happy path - successful response', () => {
    it('should resolve with matching response', async () => {
      const pendingRPC = new PendingRPC(request, responses$);

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { success: true }
      };

      // Emit response asynchronously
      setTimeout(() => responses$.next(response), 10);
      vi.advanceTimersByTime(10);
      await vi.runAllTimersAsync();

      const result = await pendingRPC;
      expect(result).toEqual(response);
    });

    it('should only resolve with response matching request id', async () => {
      const pendingRPC = new PendingRPC(request, responses$);

      const wrongResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'different-id',
        result: { wrong: true }
      };

      const correctResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { success: true }
      };

      setTimeout(() => {
        responses$.next(wrongResponse);
        responses$.next(correctResponse);
      }, 10);
      vi.advanceTimersByTime(10);
      await vi.runAllTimersAsync();

      const result = await pendingRPC;
      expect(result).toEqual(correctResponse);
    });

    it('should reject with JSONRPCError when response contains error field', async () => {
      const pendingRPC = new PendingRPC(request, responses$);
      const resultPromise = pendingRPC.catch((e) => e);

      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        error: { code: -32600, message: 'Invalid Request' }
      };

      setTimeout(() => responses$.next(errorResponse), 10);
      vi.advanceTimersByTime(10);
      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(JSONRPCError);
      expect((error as JSONRPCError).code).toBe(-32600);
      expect((error as JSONRPCError).message).toBe('Invalid Request');
      expect((error as JSONRPCError).requestId).toBe('test-request-id');
    });
  });

  describe('Timeout handling', () => {
    it('should reject with RPCTimeoutError after default timeout (5000ms)', async () => {
      const pendingRPC = new PendingRPC(request, responses$);

      const resultPromise = pendingRPC.catch((error) => error);

      // Advance time to just before timeout
      vi.advanceTimersByTime(4999);
      await Promise.resolve();

      // Should not have timed out yet
      expect(resultPromise).toBeInstanceOf(Promise);

      // Advance past timeout
      vi.advanceTimersByTime(2);
      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(RPCTimeoutError);
      expect(error.message).toContain('test-request-id');
      expect(error.message).toContain('RPC request test-request-id timed out after 5000ms');
      expect(error.requestId).toBe('test-request-id');
      expect(error.timeoutMs).toBe(5000);
    });

    it('should reject with RPCTimeoutError after custom timeout', async () => {
      const pendingRPC = new PendingRPC(request, responses$, {
        timeoutMs: 3000
      });

      const resultPromise = pendingRPC.catch((error) => error);

      vi.advanceTimersByTime(3001);
      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(RPCTimeoutError);
      expect(error.timeoutMs).toBe(3000);
    });

    it('should not timeout if response arrives in time', async () => {
      const pendingRPC = new PendingRPC(request, responses$);

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { success: true }
      };

      // Advance time but not past timeout (default is 3000ms)
      vi.advanceTimersByTime(2000);

      // Send response before timeout
      responses$.next(response);
      await vi.runAllTimersAsync();

      const result = await pendingRPC;
      expect(result).toEqual(response);
    });

    it('should support very short timeouts', async () => {
      const pendingRPC = new PendingRPC(request, responses$, {
        timeoutMs: 100
      });

      const resultPromise = pendingRPC.catch((error) => error);

      vi.advanceTimersByTime(101);
      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(RPCTimeoutError);
      expect(error.timeoutMs).toBe(100);
    });

    it('should support very long timeouts', async () => {
      const pendingRPC = new PendingRPC(request, responses$, {
        timeoutMs: 60000
      });

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { success: true }
      };

      vi.advanceTimersByTime(59000);
      responses$.next(response);
      await vi.runAllTimersAsync();

      const result = await pendingRPC;
      expect(result).toEqual(response);
    });
  });

  describe('Error handling - Observable errors', () => {
    it('should reject when observable emits error', async () => {
      const pendingRPC = new PendingRPC(request, responses$);

      const testError = new Error('Observable error');
      const resultPromise = pendingRPC.catch((error) => error);

      setTimeout(() => responses$.error(testError), 10);
      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBe(testError);
      expect(error.message).toBe('Observable error');
    });

    it('should reject immediately on observable error even before timeout', async () => {
      const pendingRPC = new PendingRPC(request, responses$, {
        timeoutMs: 5000
      });

      const testError = new Error('Connection lost');
      const resultPromise = pendingRPC.catch((error) => error);

      // Error happens early
      vi.advanceTimersByTime(100);
      responses$.error(testError);
      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBe(testError);
      expect(error).not.toBeInstanceOf(RPCTimeoutError);
    });
  });

  describe('Cancellation with AbortSignal', () => {
    it('should reject with AbortError when signal is aborted', async () => {
      const controller = new AbortController();
      const pendingRPC = new PendingRPC(request, responses$, {
        signal: controller.signal
      });

      const resultPromise = pendingRPC.catch((error) => error);

      setTimeout(() => controller.abort(), 100);
      vi.advanceTimersByTime(101);
      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error.name).toBe('AbortError');
    });

    it('should reject immediately if signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const pendingRPC = new PendingRPC(request, responses$, {
        signal: controller.signal
      });
      const resultPromise = pendingRPC.catch((error) => error);

      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error.name).toBe('AbortError');
    });

    it('should not reject if response arrives before abort', async () => {
      const controller = new AbortController();
      const pendingRPC = new PendingRPC(request, responses$, {
        signal: controller.signal
      });

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { success: true }
      };

      responses$.next(response);
      await vi.runAllTimersAsync();

      // Abort after response (should have no effect)
      controller.abort();

      const result = await pendingRPC;
      expect(result).toEqual(response);
    });

    it('should work without abort signal', async () => {
      const pendingRPC = new PendingRPC(request, responses$);

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { success: true }
      };

      setTimeout(() => responses$.next(response), 10);
      vi.advanceTimersByTime(10);
      await vi.runAllTimersAsync();

      const result = await pendingRPC;
      expect(result).toEqual(response);
    });
  });

  describe('Subscription cleanup', () => {
    it('should unsubscribe from responses$ after getting response', async () => {
      const pendingRPC = new PendingRPC(request, responses$);

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { success: true }
      };

      setTimeout(() => responses$.next(response), 10);
      vi.advanceTimersByTime(10);
      await vi.runAllTimersAsync();
      await pendingRPC;

      // Verify subscription was cleaned up by checking that subsequent emissions don't cause issues
      const laterResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { late: true }
      };

      expect(() => responses$.next(laterResponse)).not.toThrow();
    });

    it('should unsubscribe after timeout', async () => {
      const pendingRPC = new PendingRPC(request, responses$, {
        timeoutMs: 1000
      });

      const resultPromise = pendingRPC.catch(() => {});

      vi.advanceTimersByTime(1001);
      await vi.runAllTimersAsync();
      await resultPromise;

      // Try to emit after timeout - should not cause issues
      const laterResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { late: true }
      };

      expect(() => responses$.next(laterResponse)).not.toThrow();
    });

    it('should unsubscribe after abort', async () => {
      const controller = new AbortController();
      const pendingRPC = new PendingRPC(request, responses$, {
        signal: controller.signal
      });

      const resultPromise = pendingRPC.catch(() => {});

      controller.abort();
      await vi.runAllTimersAsync();
      await resultPromise;

      // Try to emit after abort - should not cause issues
      const laterResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { late: true }
      };

      expect(() => responses$.next(laterResponse)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple pending RPCs with same response stream', async () => {
      const request1: JSONRPCRequest = { ...request, id: 'req-1' };
      const request2: JSONRPCRequest = { ...request, id: 'req-2' };
      const request3: JSONRPCRequest = { ...request, id: 'req-3' };

      const pending1 = new PendingRPC(request1, responses$);
      const pending2 = new PendingRPC(request2, responses$);
      const pending3 = new PendingRPC(request3, responses$);

      const response1: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'req-1',
        result: { order: 1 }
      };
      const response2: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'req-2',
        result: { order: 2 }
      };
      const response3: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'req-3',
        result: { order: 3 }
      };

      setTimeout(() => {
        responses$.next(response2);
        responses$.next(response1);
        responses$.next(response3);
      }, 10);
      vi.advanceTimersByTime(10);
      await vi.runAllTimersAsync();

      const [result1, result2, result3] = await Promise.all([pending1, pending2, pending3]);

      expect(result1).toEqual(response1);
      expect(result2).toEqual(response2);
      expect(result3).toEqual(response3);
    });

    it('should expose request property', () => {
      const pendingRPC = new PendingRPC(request, responses$);
      pendingRPC.catch(() => {}); // Prevent unhandled rejection, since it will eventually timeout
      expect(pendingRPC.request).toEqual(request);
      expect(pendingRPC.request.id).toBe('test-request-id');
    });

    it('should reject with JSONRPCError when response has both result and error', async () => {
      const pendingRPC = new PendingRPC(request, responses$);
      const resultPromise = pendingRPC.catch((e) => e);

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: { data: 'test' },
        error: { code: -32000, message: 'Custom error' }
      };

      setTimeout(() => responses$.next(response), 10);
      vi.advanceTimersByTime(10);
      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(JSONRPCError);
      expect(error.code).toBe(-32000);
      expect(error.message).toBe('Custom error');
    });

    it('should timeout when observable completes without matching response', async () => {
      // Create a fresh Subject for this test since we're completing it
      const freshResponses$ = new Subject<JSONRPCResponse>();

      const pendingRPC = new PendingRPC(request, freshResponses$, {
        timeoutMs: 4000
      });

      // Emit a non-matching response and complete
      freshResponses$.next({
        jsonrpc: '2.0',
        id: 'different-id',
        result: { other: true }
      });
      freshResponses$.complete();

      await expect(pendingRPC).rejects.toThrow(RPCTimeoutError);
    });
  });

  describe('Type safety', () => {
    it('should preserve response type information', async () => {
      interface CustomResult {
        customField: string;
        count: number;
      }

      const pendingRPC = new PendingRPC(request, responses$);

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'test-request-id',
        result: {
          customField: 'test',
          count: 42
        } as CustomResult
      };

      setTimeout(() => responses$.next(response), 10);
      vi.advanceTimersByTime(10);
      await vi.runAllTimersAsync();

      const result = await pendingRPC;
      expect(result.result).toHaveProperty('customField');
      expect(result.result).toHaveProperty('count');
      expect((result.result as CustomResult).customField).toBe('test');
      expect((result.result as CustomResult).count).toBe(42);
    });
  });
});
