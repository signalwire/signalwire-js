/**
 * In-dialog call control (`call.sendCommand`) — E2E Test Suite
 *
 * `sendCommand` sends a `call.*` verb on the call's own signaling channel via
 * `verto.info`, instead of addressing the member with an explicit
 * `{node_id, call_id, member_id}` tuple over the routed session the way
 * `executeMethod` does. This makes control work without the client needing to know
 * how the conference is hosted.
 *
 * These tests deliberately dial an **SWML `join_conference`** rather than a
 * `conference_rooms` resource, because the in-dialog transport is only accepted for
 * SWML-backed calls — against a `conference_rooms` dial every verb comes back
 * `-32600 Invalid Request` with an `id` of `0`, i.e. refused before the request was
 * even parsed. So this suite is the only place `sendCommand` can be covered end to
 * end, and the rest of the `call/` specs stay on `executeMethod`, which is why both
 * transports still exist.
 */
import { test, expect } from '../fixtures';
import { setupSwmlConferenceCall } from '../helpers/setup';

const OBSERVABLE_TIMEOUT = 10_000;

/**
 * `params.command` on `verto.info` is served by mod_infrastructure #1828, now deployed
 * to both staging and production. Where it is absent every verb comes back `-32600`, so
 * this suite is gated on a flag rather than assuming support.
 *
 * Gated on an env flag rather than sniffing the hostname, so the reason a skip happened
 * is legible in the run output. The workflow defaults the flag to `'true'`; set it to
 * `'false'` to opt an environment out.
 */
const IN_DIALOG_CONTROL_SUPPORTED = process.env.SW_IN_DIALOG_CONTROL === 'true';

test.describe('In-dialog call control (sendCommand)', () => {
  test.skip(
    !IN_DIALOG_CONTROL_SUPPORTED,
    'needs verto.info params.command (mod_infrastructure #1828) — set SW_IN_DIALOG_CONTROL=true for environments that have it'
  );

  test.afterEach(async ({ page }) => {
    await page
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
  });

  test('returns the method payload, not the verto envelope', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupSwmlConferenceCall({ page, resource, prefix: 'e2e-swml-cmd' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(async () => {
      try {
        const response = await window.__swCall.sendCommand('call.layout.list');
        return {
          success: true,
          // The unwrap is the whole contract here: against the raw envelope this
          // is `undefined`, and nothing throws — the request succeeds and the
          // caller silently sees nothing.
          layouts: response?.result?.layouts,
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    expect(result.success, `sendCommand failed: ${result.error ?? ''}`).toBe(true);
    expect(Array.isArray(result.layouts), 'result.layouts is an array').toBe(true);
    // More than one, deliberately: `> 0` alone would pass on a trivial or fallback
    // layout list, so the request succeeding tells us nothing about whether the
    // layouts actually came from the conference.
    expect(result.layouts!.length, 'the real conference layout list').toBeGreaterThan(
      1
    );
  });

  test('a self mute takes effect and is reflected back on the participant', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupSwmlConferenceCall({ page, resource, prefix: 'e2e-swml-cmd' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          // A self-directed op STILL needs its own target. sendCommand is a verbatim
          // passthrough and builds none — with no target the op is refused, even for
          // muting yourself. `node_id` is deliberately omitted; only the two ids
          // belong here.
          const { call_id, member_id } = call.self.target;
          await call.sendCommand('call.mute', {
            channels: ['audio'],
            target: { call_id, member_id },
          });

          // Confirm via the event stream rather than the RPC reply — mute state is
          // authoritative only once the conference reports it.
          const muted = await waitFor(
            call.self.audioMuted$,
            (m: boolean | undefined) => m === true,
            obsTimeout,
            'self.audioMuted$ → true'
          );

          return { success: true, muted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `self mute failed: ${result.error ?? ''}`).toBe(true);
    expect(result.muted, 'conference confirmed the mute').toBe(true);
  });

  test('surfaces a server rejection as a rejected promise', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupSwmlConferenceCall({ page, resource, prefix: 'e2e-swml-cmd' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(async () => {
      const call = window.__swCall;
      // Trigger a real server rejection: call.layout.set requires a `layout` param, so
      // omitting it is reliably refused by the param check. (An invalid layout *name* is
      // NOT refused — the server does not validate the name, it passes it straight to the
      // conference, so a bad name just no-ops.) The target is carried so the refusal is
      // the missing param, not a permission failure.
      const { call_id, member_id } = call.self.target;
      try {
        await call.sendCommand('call.layout.set', {
          target: { call_id, member_id },
        });
        return { rejected: false, error: '', callAlive: !!window.__swCall };
      } catch (error) {
        // A rejected control op must NOT be fatal: the failure is "that verb did
        // not happen", never "the call is dead". Errors buried in the nested verto
        // envelope used to surface as a 10s timeout instead of a rejection.
        return { rejected: true, error: String(error), callAlive: !!window.__swCall };
      }
    });

    expect(result.rejected, 'a refused control op rejected the promise').toBe(true);
    // Pin WHY it rejected — the missing required param, not a permission failure — so the
    // rejection-surfacing path is still exercised if permissions ever change.
    expect(result.error, `unexpected rejection: ${result.error}`).not.toContain(
      'Permission denied'
    );
    expect(result.callAlive, 'the call survived the rejection').toBe(true);
  });
});
