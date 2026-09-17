import { describe, it, expect, beforeEach } from 'vitest';
import { Subject } from 'rxjs';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { IncomingCallController, type IncomingCallInfo } from './call-state-context.js';
import type { Call } from '../types/index.js';

@customElement('test-incoming-call-host')
class TestHost extends LitElement {
  controller = new IncomingCallController(this);
}

const makeCall = (over: Partial<Call> = {}): Call =>
  ({ id: 'call-1', fromName: 'Ada', from: '+15551234567', ...over }) as unknown as Call;

describe('IncomingCallController', () => {
  let host: TestHost;
  let controller: IncomingCallController;
  let incoming$: Subject<Call[]>;

  beforeEach(async () => {
    host = document.createElement('test-incoming-call-host') as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;
    controller = host.controller;
    incoming$ = new Subject<Call[]>();
  });

  it('fires the callback for a new inbound call, mapping name/number', () => {
    const seen: IncomingCallInfo[] = [];
    controller.onIncomingCall = (info) => seen.push(info);
    controller.connect(incoming$);

    incoming$.next([makeCall()]);

    expect(seen).toHaveLength(1);
    expect(seen[0]!.call.id).toBe('call-1');
    expect(seen[0]!.callerName).toBe('Ada');
    expect(seen[0]!.callerNumber).toBe('+15551234567');
  });

  it('deduplicates a call id seen across emissions', () => {
    let count = 0;
    controller.onIncomingCall = () => count++;
    controller.connect(incoming$);

    incoming$.next([makeCall({ id: 'dup' })]);
    incoming$.next([makeCall({ id: 'dup' })]);

    expect(count).toBe(1);
  });

  it('announces each distinct call within a single emission', () => {
    const ids: string[] = [];
    controller.onIncomingCall = (info) => ids.push(info.call.id);
    controller.connect(incoming$);

    incoming$.next([makeCall({ id: 'a' }), makeCall({ id: 'b' })]);

    expect(ids).toEqual(['a', 'b']);
  });

  it('does not throw when no callback is registered', () => {
    // Exercises the `this._callback?.(…)` optional-chaining no-op branch.
    controller.connect(incoming$);
    expect(() => incoming$.next([makeCall()])).not.toThrow();
  });

  it('reconnecting tears down the previous subscription', () => {
    let count = 0;
    controller.onIncomingCall = () => count++;

    const first$ = new Subject<Call[]>();
    controller.connect(first$);
    // Reconnect to a new stream. connect() calls disconnect() first, which also
    // clears the seen-ids set, so the same id counts again on the new stream.
    // This documents current behaviour rather than endorsing it: on a websocket
    // reconnect where incomingCalls$ replays a still-ringing call, the call gets
    // re-announced and the consumer shows a second prompt. Pre-existing, and out
    // of scope for a test-only change.
    controller.connect(incoming$);

    first$.next([makeCall({ id: 'x' })]);
    expect(count).toBe(0);

    incoming$.next([makeCall({ id: 'x' })]);
    expect(count).toBe(1);
  });

  it('stops announcing after disconnect()', () => {
    let count = 0;
    controller.onIncomingCall = () => count++;
    controller.connect(incoming$);

    controller.disconnect();
    incoming$.next([makeCall()]);

    expect(count).toBe(0);
  });

  it('cleans up when the host element is disconnected from the DOM', () => {
    let count = 0;
    controller.onIncomingCall = () => count++;
    controller.connect(incoming$);

    // hostDisconnected() → disconnect()
    host.remove();
    incoming$.next([makeCall()]);

    expect(count).toBe(0);
  });

  it('disconnect() is safe to call when never connected', () => {
    expect(() => controller.disconnect()).not.toThrow();
  });
});
