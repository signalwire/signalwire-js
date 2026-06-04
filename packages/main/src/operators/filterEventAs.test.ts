import { of, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { ifIsMap, filterAs } from './filterEventAs';

import type { JSONRPCRequest, JSONRPCResponse } from '../core/RPCMessages/types/base';

describe('ifIsMap', () => {
  describe('type narrowing and filtering', () => {
    interface CallEvent {
      type: 'call.started' | 'call.ended';
      id: string;
      timestamp: number;
    }

    interface OtherEvent {
      type: 'other';
      data: string;
    }

    const isCallStarted = (event: unknown): event is CallEvent => {
      return (
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        (event as CallEvent).type === 'call.started'
      );
    };

    it('should filter events using type guard and map to transformed output', async () => {
      const events = [
        { type: 'call.started', id: '123', timestamp: 1000 },
        { type: 'other', data: 'ignored' },
        { type: 'call.started', id: '456', timestamp: 2000 },
        { type: 'call.ended', id: '789', timestamp: 3000 }
      ];

      const results = await of(...events)
        .pipe(
          ifIsMap(isCallStarted, (event) => ({
            callId: event.id,
            time: event.timestamp
          })),
          toArray()
        )
        .toPromise();

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result).toHaveProperty('callId');
        expect(result).toHaveProperty('time');
        expect(['123', '456']).toContain(result.callId);
      });
    });

    it('should only emit events that match the predicate', async () => {
      const events = [
        { type: 'call.started', id: '123', timestamp: 1000 },
        { type: 'other', data: 'ignored' },
        { type: 'call.started', id: '456', timestamp: 2000 }
      ];

      const results = await of(...events)
        .pipe(
          ifIsMap(isCallStarted, (event) => event.id),
          toArray()
        )
        .toPromise();

      expect(results).toEqual(['123', '456']);
    });

    it('should emit nothing when no events match', async () => {
      const events = [
        { type: 'other', data: 'ignored' },
        { type: 'call.ended', id: '789', timestamp: 3000 }
      ];

      const results = await of(...events)
        .pipe(
          ifIsMap(isCallStarted, (event) => event.id),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([]);
    });

    it('should handle empty observable', async () => {
      const results = await of()
        .pipe(
          ifIsMap(isCallStarted, (event) => event.id),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([]);
    });
  });

  describe('type safety with unknown input', () => {
    it('should accept Observable<unknown> as input', async () => {
      interface TestEvent {
        value: number;
      }

      const isTestEvent = (e: unknown): e is TestEvent => {
        return typeof e === 'object' && e !== null && 'value' in e;
      };

      const source$: Observable<unknown> = of({ value: 1 }, 'not an event', { value: 2 }, null, {
        value: 3
      });

      const results = await source$
        .pipe(
          ifIsMap(isTestEvent, (event) => event.value * 2),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([2, 4, 6]);
    });

    it('should accept union types as input', async () => {
      interface EventA {
        type: 'a';
        data: string;
      }

      interface EventB {
        type: 'b';
        count: number;
      }

      const isEventA = (e: unknown): e is EventA => {
        return typeof e === 'object' && e !== null && 'type' in e && (e as EventA).type === 'a';
      };

      const source$: Observable<EventA | EventB | null> = of(
        { type: 'a', data: 'test' } as EventA,
        { type: 'b', count: 42 } as EventB,
        null,
        { type: 'a', data: 'test2' } as EventA
      );

      const results = await source$
        .pipe(
          ifIsMap(isEventA, (event) => event.data),
          toArray()
        )
        .toPromise();

      expect(results).toEqual(['test', 'test2']);
    });
  });

  describe('mapping transformations', () => {
    interface SourceEvent {
      id: string;
      payload: {
        name: string;
        value: number;
      };
    }

    const isSourceEvent = (e: unknown): e is SourceEvent => {
      return (
        typeof e === 'object' &&
        e !== null &&
        'id' in e &&
        'payload' in e &&
        typeof (e as SourceEvent).payload === 'object'
      );
    };

    it('should extract nested properties', async () => {
      const events = [
        { id: '1', payload: { name: 'first', value: 10 } },
        { id: '2', payload: { name: 'second', value: 20 } }
      ];

      const results = await of(...events)
        .pipe(
          ifIsMap(isSourceEvent, (event) => event.payload),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([
        { name: 'first', value: 10 },
        { name: 'second', value: 20 }
      ]);
    });

    it('should transform to different shape', async () => {
      const events = [
        { id: '1', payload: { name: 'first', value: 10 } },
        { id: '2', payload: { name: 'second', value: 20 } }
      ];

      const results = await of(...events)
        .pipe(
          ifIsMap(isSourceEvent, (event) => ({
            identifier: event.id,
            label: event.payload.name,
            amount: event.payload.value * 2
          })),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([
        { identifier: '1', label: 'first', amount: 20 },
        { identifier: '2', label: 'second', amount: 40 }
      ]);
    });
  });
});

describe('filterAs with JSONRPC events', () => {
  interface TestJSONRPCRequest extends JSONRPCRequest {
    method: 'test.event';
    params: {
      event_type: string;
      data: {
        value: number;
      };
    };
  }

  const isTestEvent = (e: unknown): e is TestJSONRPCRequest => {
    return (
      typeof e === 'object' &&
      e !== null &&
      'method' in e &&
      (e as TestJSONRPCRequest).method === 'test.event'
    );
  };

  describe('property extraction', () => {
    it('should extract top-level property', async () => {
      const events: unknown[] = [
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'test.event',
          params: { event_type: 'foo', data: { value: 42 } }
        },
        {
          jsonrpc: '2.0',
          id: '2',
          method: 'other.event',
          params: { something: 'else' }
        },
        {
          jsonrpc: '2.0',
          id: '3',
          method: 'test.event',
          params: { event_type: 'bar', data: { value: 99 } }
        }
      ];

      const results = await of(...events)
        .pipe(filterAs<TestJSONRPCRequest, 'params'>(isTestEvent, 'params'), toArray())
        .toPromise();

      expect(results).toEqual([
        { event_type: 'foo', data: { value: 42 } },
        { event_type: 'bar', data: { value: 99 } }
      ]);
    });

    it('should extract nested property', async () => {
      const events: unknown[] = [
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'test.event',
          params: { event_type: 'foo', data: { value: 42 } }
        },
        {
          jsonrpc: '2.0',
          id: '2',
          method: 'test.event',
          params: { event_type: 'bar', data: { value: 99 } }
        }
      ];

      const results = await of(...events)
        .pipe(filterAs<TestJSONRPCRequest, 'params.data'>(isTestEvent, 'params.data'), toArray())
        .toPromise();

      expect(results).toEqual([{ value: 42 }, { value: 99 }]);
    });

    it('should extract deeply nested property', async () => {
      const events: unknown[] = [
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'test.event',
          params: { event_type: 'foo', data: { value: 42 } }
        },
        {
          jsonrpc: '2.0',
          id: '2',
          method: 'test.event',
          params: { event_type: 'bar', data: { value: 99 } }
        }
      ];

      const results = await of(...events)
        .pipe(
          filterAs<TestJSONRPCRequest, 'params.data.value'>(isTestEvent, 'params.data.value'),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([42, 99]);
    });
  });

  describe('filtering with JSONRPC messages', () => {
    it('should filter out non-matching JSONRPC requests', async () => {
      const messages: unknown[] = [
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'test.event',
          params: { event_type: 'match', data: { value: 1 } }
        },
        {
          jsonrpc: '2.0',
          id: '2',
          method: 'other.method',
          params: { different: 'structure' }
        },
        {
          jsonrpc: '2.0',
          id: '3',
          result: 'success'
        },
        {
          jsonrpc: '2.0',
          id: '4',
          method: 'test.event',
          params: { event_type: 'match2', data: { value: 2 } }
        }
      ];

      const results = await of(...messages)
        .pipe(
          filterAs<TestJSONRPCRequest, 'params.event_type'>(isTestEvent, 'params.event_type'),
          toArray()
        )
        .toPromise();

      expect(results).toEqual(['match', 'match2']);
    });

    it('should work with Observable<JSONRPCRequest | JSONRPCResponse>', async () => {
      type Message = JSONRPCRequest | JSONRPCResponse;

      const messages$: Observable<Message> = of(
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'test.event',
          params: { event_type: 'foo', data: { value: 42 } }
        } as JSONRPCRequest,
        {
          jsonrpc: '2.0',
          id: '2',
          result: 'success'
        } as JSONRPCResponse,
        {
          jsonrpc: '2.0',
          id: '3',
          method: 'test.event',
          params: { event_type: 'bar', data: { value: 99 } }
        } as JSONRPCRequest
      );

      const results = await messages$
        .pipe(
          filterAs<TestJSONRPCRequest, 'params.event_type'>(isTestEvent, 'params.event_type'),
          toArray()
        )
        .toPromise();

      expect(results).toEqual(['foo', 'bar']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty observable', async () => {
      const results = await of()
        .pipe(
          filterAs<TestJSONRPCRequest, 'params.event_type'>(isTestEvent, 'params.event_type'),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([]);
    });

    it('should handle observable with no matches', async () => {
      const messages: unknown[] = [
        { jsonrpc: '2.0', id: '1', method: 'other.event', params: {} },
        { jsonrpc: '2.0', id: '2', result: 'success' }
      ];

      const results = await of(...messages)
        .pipe(
          filterAs<TestJSONRPCRequest, 'params.event_type'>(isTestEvent, 'params.event_type'),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([]);
    });

    it('should silently filter out events when property path is not found', async () => {
      const events: unknown[] = [
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'test.event',
          params: { event_type: 'foo' } // Missing data property
        }
      ];

      const results = await of(...events)
        .pipe(
          filterAs<TestJSONRPCRequest, 'params.data.missing'>(isTestEvent, 'params.data.missing'),
          toArray()
        )
        .toPromise();

      // Implementation silently filters out events where path is not found
      expect(results).toEqual([]);
    });
  });

  describe('real-world SignalWire event scenario', () => {
    interface SignalWireEvent extends JSONRPCRequest {
      method: 'signalwire.event';
      params: {
        event_type: string;
        event_channel: string;
        timestamp: number;
        params: {
          call_id?: string;
          member_id?: string;
        };
      };
    }

    const isSignalWireEvent = (e: unknown): e is SignalWireEvent => {
      return (
        typeof e === 'object' &&
        e !== null &&
        'method' in e &&
        (e as SignalWireEvent).method === 'signalwire.event'
      );
    };

    it('should extract SignalWire event params', async () => {
      const messages: unknown[] = [
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'signalwire.event',
          params: {
            event_type: 'call.state',
            event_channel: 'room.123',
            timestamp: 1234567890,
            params: { call_id: 'call-456' }
          }
        },
        {
          jsonrpc: '2.0',
          id: '2',
          method: 'other.method',
          params: {}
        },
        {
          jsonrpc: '2.0',
          id: '3',
          method: 'signalwire.event',
          params: {
            event_type: 'member.joined',
            event_channel: 'room.123',
            timestamp: 1234567891,
            params: { member_id: 'member-789' }
          }
        }
      ];

      const results = await of(...messages)
        .pipe(filterAs<SignalWireEvent, 'params'>(isSignalWireEvent, 'params'), toArray())
        .toPromise();

      expect(results).toHaveLength(2);
      expect(results[0].event_type).toBe('call.state');
      expect(results[0].params.call_id).toBe('call-456');
      expect(results[1].event_type).toBe('member.joined');
      expect(results[1].params.member_id).toBe('member-789');
    });
  });
});

describe('filterAs', () => {
  describe('generic type filtering and extraction', () => {
    interface EventParams {
      event_type: string;
      data: {
        value: number;
      };
    }

    const isEventParams = (e: unknown): e is EventParams => {
      return typeof e === 'object' && e !== null && 'event_type' in e && 'data' in e;
    };

    it('should filter and extract from non-JSONRPC types', async () => {
      const events: unknown[] = [
        { event_type: 'auth', data: { value: 42 } },
        { event_type: 'other', something: 'else' },
        { event_type: 'auth', data: { value: 99 } }
      ];

      const results = await of(...events)
        .pipe(filterAs<EventParams, { value: number }>(isEventParams, 'data'), toArray())
        .toPromise();

      expect(results).toEqual([{ value: 42 }, { value: 99 }]);
    });

    it('should extract deeply nested properties', async () => {
      const events: unknown[] = [
        { event_type: 'test', data: { value: 42 } },
        { event_type: 'test', data: { value: 99 } }
      ];

      const results = await of(...events)
        .pipe(filterAs<EventParams, number>(isEventParams, 'data.value'), toArray())
        .toPromise();

      expect(results).toEqual([42, 99]);
    });

    it('should work with Observable<unknown>', async () => {
      const source$: Observable<unknown> = of(
        { event_type: 'test', data: { value: 1 } },
        'not an event',
        { event_type: 'test', data: { value: 2 } },
        null,
        { event_type: 'test', data: { value: 3 } }
      );

      const results = await source$
        .pipe(filterAs<EventParams, number>(isEventParams, 'data.value'), toArray())
        .toPromise();

      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('working with already-narrowed types', () => {
    interface SWEventParams {
      event_type: string;
      params: {
        authorization_state: string;
      };
    }

    interface AuthEventParams {
      event_type: 'signalwire.authorization.state';
      authorization_state: string;
    }

    const isSWEventParams = (e: unknown): e is SWEventParams => {
      return typeof e === 'object' && e !== null && 'event_type' in e && 'params' in e;
    };

    const isAuthEventParams = (e: unknown): e is AuthEventParams => {
      return (
        typeof e === 'object' &&
        e !== null &&
        'event_type' in e &&
        (e as AuthEventParams).event_type === 'signalwire.authorization.state'
      );
    };

    it('should filter params without additional extraction', async () => {
      const params: unknown[] = [
        {
          event_type: 'signalwire.authorization.state',
          authorization_state: 'authorized'
        },
        { event_type: 'other.event', something: 'else' },
        {
          event_type: 'signalwire.authorization.state',
          authorization_state: 'unauthorized'
        }
      ];

      const results = await of(...params)
        .pipe(
          filterAs<AuthEventParams, string>(isAuthEventParams, 'authorization_state'),
          toArray()
        )
        .toPromise();

      expect(results).toEqual(['authorized', 'unauthorized']);
    });

    it('should work in a pipeline from SWEventParams', async () => {
      const swEvents: unknown[] = [
        {
          event_type: 'call.state',
          params: { authorization_state: 'authorized' }
        },
        {
          event_type: 'member.joined',
          params: { member_id: '123' }
        }
      ];

      const results = await of(...swEvents)
        .pipe(
          filterAs<SWEventParams, { authorization_state: string }>(isSWEventParams, 'params'),
          toArray()
        )
        .toPromise();

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('authorization_state');
    });
  });

  describe('edge cases', () => {
    interface TestType {
      value: number;
    }

    const isTestType = (e: unknown): e is TestType => {
      return typeof e === 'object' && e !== null && 'value' in e;
    };

    it('should handle empty observable', async () => {
      const results = await of()
        .pipe(filterAs<TestType, number>(isTestType, 'value'), toArray())
        .toPromise();

      expect(results).toEqual([]);
    });

    it('should silently filter out events when properties are missing', async () => {
      const events: unknown[] = [{ value: 42 }, { notValue: 99 }];

      const results = await of(...events)
        .pipe(filterAs<TestType, 'missing'>(isTestType, 'missing'), toArray())
        .toPromise();

      // Implementation silently filters out events where path is not found
      expect(results).toEqual([]);
    });
  });

  describe('automatic type inference', () => {
    interface NestedType {
      level1: {
        level2: {
          value: number;
        };
      };
    }

    const isNestedType = (e: unknown): e is NestedType => {
      return (
        typeof e === 'object' &&
        e !== null &&
        'level1' in e &&
        typeof (e as NestedType).level1 === 'object'
      );
    };

    it('should infer types for single-level property extraction', async () => {
      const events: unknown[] = [
        { level1: { level2: { value: 42 } } },
        { level1: { level2: { value: 99 } } }
      ];

      const results = await of(...events)
        .pipe(
          // Type is automatically inferred as { level2: { value: number } }
          filterAs(isNestedType, 'level1'),
          toArray()
        )
        .toPromise();

      expect(results).toHaveLength(2);
      expect(results[0].level2.value).toBe(42);
      expect(results[1].level2.value).toBe(99);
    });

    it('should infer types for nested property extraction', async () => {
      const events: unknown[] = [
        { level1: { level2: { value: 42 } } },
        { level1: { level2: { value: 99 } } }
      ];

      const results = await of(...events)
        .pipe(
          // Type is automatically inferred as { value: number }
          filterAs(isNestedType, 'level1.level2'),
          toArray()
        )
        .toPromise();

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe(42);
      expect(results[1].value).toBe(99);
    });

    it('should infer types for deeply nested property extraction', async () => {
      const events: unknown[] = [
        { level1: { level2: { value: 42 } } },
        { level1: { level2: { value: 99 } } }
      ];

      const results = await of(...events)
        .pipe(
          // Type is automatically inferred as 'number'
          filterAs(isNestedType, 'level1.level2.value'),
          toArray()
        )
        .toPromise();

      expect(results).toEqual([42, 99]);
    });
  });
});
