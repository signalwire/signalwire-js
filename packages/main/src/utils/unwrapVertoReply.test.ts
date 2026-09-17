import { describe, it, expect } from 'vitest';

import { unwrapVertoReply } from './unwrapVertoReply';

/**
 * The failure this guards against is silent: reading the wrong shape yields
 * `undefined` rather than an error, so the request succeeds, the data arrives,
 * and the caller renders nothing. Both response shapes must therefore be
 * accepted by every reader.
 */
describe('unwrapVertoReply', () => {
  it('lifts the method payload out of a nested verto envelope', () => {
    const envelope = {
      id: 'outer',
      result: {
        node_id: 'node-1',
        code: '200',
        result: { jsonrpc: '2.0', id: 'inner', result: { layouts: ['grid'] } }
      }
    };

    expect(unwrapVertoReply<{ result: { layouts: string[] } }>(envelope).result).toEqual({
      layouts: ['grid']
    });
  });

  it('leaves an already-unwrapped reply alone', () => {
    // What the routed transport resolves: the payload is already under .result.
    const direct = { id: 1, result: { layouts: ['1x1'] } };

    expect(unwrapVertoReply(direct)).toBe(direct);
  });

  it('passes a plain ack through untouched', () => {
    // `result.result` is absent, so there is nothing to lift.
    const ack = { id: 1, result: { code: '200', message: 'Success' } };

    expect(unwrapVertoReply(ack)).toBe(ack);
  });

  it('does not unwrap when the inner object carries no result of its own', () => {
    // Guards the lift itself: without the `'result' in inner` check this would
    // return `{ code: '200' }` and silently drop the reply.
    const envelope = { id: 1, result: { result: { code: '200' } } };

    expect(unwrapVertoReply(envelope)).toBe(envelope);
  });

  it.each([[undefined], [null], [{}], ['not an object']])(
    'returns %s unchanged rather than throwing',
    (input) => {
      expect(unwrapVertoReply(input)).toBe(input);
    }
  );
});
