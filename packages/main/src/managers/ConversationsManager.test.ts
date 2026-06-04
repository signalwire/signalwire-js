import { describe, it, expect, vi } from 'vitest';
import { Subject } from 'rxjs';

import { ConversationsManager } from './ConversationsManager';

import type { ClientSessionManager } from './ClientSessionManager';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';

/**
 * Create a minimal mock of HTTPRequestController
 */
const createMockHttp = (responses: Record<string, { ok: boolean; body?: string }>) => {
  return {
    request: vi.fn(async (params: { url: string }) => {
      for (const [urlPattern, response] of Object.entries(responses)) {
        if (params.url.includes(urlPattern)) {
          return response;
        }
      }
      return { ok: false, body: undefined };
    })
  } as unknown as HTTPRequestController;
};

const createMockClientSession = () => {
  return {
    signalingEvent$: new Subject<unknown>().asObservable()
  } as unknown as ClientSessionManager;
};

describe('ConversationsManager', () => {
  it('BUG: sendText silently succeeds when HTTP response indicates failure', async () => {
    // Bug #11: ConversationsManager.ts:155 — When the HTTP response for
    // sendText is not ok, a ConversationError is thrown on line 153, but the
    // catch block on line 154 swallows it with only a logger.error call.
    // The error is never re-thrown, so the caller's promise resolves as if
    // the message was sent successfully.
    //
    // Expected behavior: sendText should reject/throw when the send fails.
    // Actual behavior: sendText resolves with undefined (silently succeeds).

    // First join must succeed (to get groupId)
    const mockHttp = createMockHttp({
      '/conversations/join': {
        ok: true,
        body: JSON.stringify({ group_id: 'group-123' })
      },
      '/messages': {
        ok: false, // Message send FAILS
        body: JSON.stringify({ error: 'Server Error' })
      }
    });

    const mockClientSession = createMockClientSession();

    const manager = new ConversationsManager(
      mockClientSession,
      mockHttp,
      () => 'user-address-1',
      undefined
    );

    // sendText should throw/reject because the HTTP response was not ok
    // But due to the bug, it silently resolves.
    await expect(manager.sendText('Hello', 'dest-address-1')).rejects.toThrow();
  });
});
