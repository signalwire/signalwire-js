/**
 * Member positioning — multi-participant E2E (issue #19400, items 1 & 2).
 *
 * Positioning is only meaningfully testable with two participants and a layout
 * that exposes the requested slot, so both tests join two clients to the same
 * room and switch to `highlight-1-responsive` (slots: `reserved-1`,
 * `standard-1..5`, `playback`, `full-screen`).
 *
 * Each test asserts the request was actually HONORED via the SDK's reactive
 * state (`position$`, fed by the server's `layout.changed`) — not just that the
 * RPC resolved. The setPosition test additionally inspects the outgoing wire
 * frame to prove the per-member fix: `call.member.position.set` must carry the
 * TARGET member's OWN `call_id`/`node_id` (matching legacy `setPositions`),
 * while `self` stays the requester. A self-ids implementation only "works" for
 * self-positioning and mis-targets a remote member.
 */
import type { Page } from '@playwright/test';
import { test, expect, createSATToken } from '../fixtures';
import { gotoTestPage, initializeClient, dialAndJoin, roomId } from '../helpers/setup';

const OBSERVABLE_TIMEOUT = 10_000;
const FRAME_TIMEOUT = 5_000;

const POSITION_SET_METHOD = 'call.member.position.set';
// A layout that exposes addressable slots beyond the auto-assigned ones.
const LAYOUT = 'highlight-1-responsive';

interface RemoteInfo {
  id: string | null;
  callId: string | null;
  nodeId: string | null;
}

interface PositionSetFrame {
  method?: string;
  params?: {
    self?: { call_id?: string; node_id?: string };
    targets?: { target?: { member_id?: string; call_id?: string; node_id?: string } }[];
  };
}

async function hangupAndDisconnect(target: Page): Promise<void> {
  await target
    .evaluate(async () => {
      try {
        if (window.__swCall) await window.__swCall.hangup();
      } catch {
        /* call may already be ended */
      }
      try {
        if (window.__swClient) await window.__swClient.disconnect();
      } catch {
        /* client may already be disconnected */
      }
    })
    .catch(() => {});
}

/** Join `page` (A) then `pageB` (B) into a fresh room; return B's own ids. */
async function joinBoth(
  page: Page,
  pageB: Page,
  resource: { createVideoRoom: (name: string) => Promise<{ id: string }> },
  prefix: string
): Promise<RemoteInfo> {
  const roomName = `${prefix}-${roomId()}`;
  const room = await resource.createVideoRoom(roomName);
  expect(room.id, `video room "${roomName}" created`).toBeTruthy();
  const destination = `/public/${roomName}?channel=video`;

  await gotoTestPage(page);
  await initializeClient(page, await createSATToken());
  await dialAndJoin(page, destination);

  await gotoTestPage(pageB);
  await initializeClient(pageB, await createSATToken());
  await dialAndJoin(pageB, destination);

  // B reports its OWN member id + call context.
  const remote = await pageB.evaluate(async ({ obsTimeout }) => {
    const self = await window.__waitFor(
      window.__swCall.self$,
      (s) => s !== null,
      obsTimeout,
      'self$ → member id'
    );
    return { id: self?.id ?? null, callId: self?.callId ?? null, nodeId: self?.nodeId ?? null };
  }, { obsTimeout: OBSERVABLE_TIMEOUT });

  expect(remote.id, 'participant B has a member id').toBeTruthy();
  expect(remote.callId, 'participant B has a call id').toBeTruthy();
  return remote;
}

test.describe('Member positioning (multi-participant)', () => {
  test('setPosition moves the remote member to the requested slot, using its own call context', async ({
    page,
    resource,
    browser,
  }) => {
    const targetSlot = 'standard-3'; // empty in highlight-1-responsive with 2 members

    // Capture page A's outgoing frames BEFORE its WebSocket opens.
    const sentFrames: string[] = [];
    page.on('websocket', (ws) => {
      ws.on('framesent', (frame) => {
        if (typeof frame.payload === 'string') sentFrames.push(frame.payload);
      });
    });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    try {
      // ── SETUP ────────────────────────────────────────────
      const remote = await joinBoth(page, pageB, resource, 'e2e-pos-multi');

      // ── CHECK ────────────────────────────────────────────
      const result = await page.evaluate(
        async ({ remoteMemberId, layout, targetSlot, obsTimeout }) => {
          const call = window.__swCall;
          await window.__waitFor(
            call.participants$,
            (p) => p.some((x) => x.id === remoteMemberId),
            obsTimeout,
            'participants$ → remote member present'
          );

          await call.setLayout(layout);
          await window.__waitFor(call.layout$, (l) => l === layout, obsTimeout, `layout$ → ${layout}`);

          const member = call.participants.find((x) => x.id === remoteMemberId)!;
          await member.setPosition(targetSlot);

          // The proper assertion: the server honored it and the member's
          // reactive position reflects the requested slot.
          const applied = await window.__waitFor(
            member.position$,
            (pos) => pos?.position === targetSlot,
            obsTimeout,
            `B.position$ → ${targetSlot}`
          );
          return { appliedPosition: applied?.position ?? null };
        },
        { remoteMemberId: remote.id, layout: LAYOUT, targetSlot, obsTimeout: OBSERVABLE_TIMEOUT }
      );

      // Server honored the request — the member actually moved.
      expect(result.appliedPosition, 'remote member moved to the requested slot').toBe(targetSlot);

      // Per-member wire proof (#19400): the target carries the REMOTE member's
      // OWN call_id/node_id, not the positioner's (self) ids.
      await expect
        .poll(() => sentFrames.some((raw) => raw.includes(POSITION_SET_METHOD)), {
          timeout: FRAME_TIMEOUT,
          message: 'positioner sent a call.member.position.set frame',
        })
        .toBe(true);

      const frame = sentFrames
        .map((raw): PositionSetFrame | null => {
          try {
            return JSON.parse(raw) as PositionSetFrame;
          } catch {
            return null;
          }
        })
        .find((f) => f?.method === POSITION_SET_METHOD);

      expect(frame, 'call.member.position.set frame parsed').toBeTruthy();
      const params = frame!.params!;
      const target = params.targets?.[0]?.target;

      expect(target?.member_id, 'targets the remote member').toBe(remote.id);
      expect(target?.call_id, 'target.call_id is the remote member call_id').toBe(remote.callId);
      expect(target?.node_id, 'target.node_id is the remote member node_id').toBe(remote.nodeId);
      expect(target?.call_id, 'target.call_id differs from the self call_id').not.toBe(
        params.self?.call_id
      );
    } finally {
      await hangupAndDisconnect(pageB);
      await contextB.close();
      await hangupAndDisconnect(page);
    }
  });

  test('setLayout(layout, positions) switches the layout and moves the member', async ({
    page,
    resource,
    browser,
  }) => {
    const targetSlot = 'standard-4'; // empty in highlight-1-responsive with 2 members

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    try {
      // ── SETUP ────────────────────────────────────────────
      const remote = await joinBoth(page, pageB, resource, 'e2e-layout-pos-multi');

      // ── CHECK ────────────────────────────────────────────
      const result = await page.evaluate(
        async ({ remoteMemberId, layout, targetSlot, obsTimeout }) => {
          const call = window.__swCall;
          await window.__waitFor(
            call.participants$,
            (p) => p.some((x) => x.id === remoteMemberId),
            obsTimeout,
            'participants$ → remote member present'
          );

          // Single call: switch layout AND position the remote member.
          await call.setLayout(layout, { [remoteMemberId]: targetSlot });

          const newLayout = await window.__waitFor(
            call.layout$,
            (l) => l === layout,
            obsTimeout,
            `layout$ → ${layout}`
          );

          const member = call.participants.find((x) => x.id === remoteMemberId)!;
          const applied = await window.__waitFor(
            member.position$,
            (pos) => pos?.position === targetSlot,
            obsTimeout,
            `B.position$ → ${targetSlot}`
          );
          return { newLayout, appliedPosition: applied?.position ?? null };
        },
        { remoteMemberId: remote.id, layout: LAYOUT, targetSlot, obsTimeout: OBSERVABLE_TIMEOUT }
      );

      expect(result.newLayout, 'layout switched to the requested layout').toBe(LAYOUT);
      expect(result.appliedPosition, 'member moved to the requested slot').toBe(targetSlot);
    } finally {
      await hangupAndDisconnect(pageB);
      await contextB.close();
      await hangupAndDisconnect(page);
    }
  });
});
