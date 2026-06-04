import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { CallStateContextController } from './CallStateContextController.js';
import type { Call } from '../types/index.js';

@customElement('test-callstate-host')
class TestHost extends LitElement {
  controller = new CallStateContextController(this);
}

function createMockCall() {
  const subjects = {
    status$: new BehaviorSubject('new' as string),
    recording$: new BehaviorSubject(false),
    streaming$: new BehaviorSubject(false),
    locked$: new BehaviorSubject(false),
    raiseHandPriority$: new BehaviorSubject(false),
    meta$: new BehaviorSubject<Record<string, unknown>>({}),
    participants$: new BehaviorSubject<unknown[]>([]),
    self$: new BehaviorSubject<unknown | null>(null),
    remoteStream$: new BehaviorSubject<MediaStream | null>(null),
    localStream$: new BehaviorSubject<MediaStream | null>(null),
    mediaDirections$: new BehaviorSubject({ audio: 'inactive', video: 'inactive' }),
    layout$: new BehaviorSubject<string | undefined>(undefined),
    layouts$: new BehaviorSubject<string[]>([]),
    layoutLayers$: new BehaviorSubject<unknown[]>([]),
    address$: new BehaviorSubject<unknown>(undefined),
    capabilities$: new BehaviorSubject<string[]>([]),
  };
  const actions = {
    hangup: vi.fn().mockResolvedValue(undefined),
    toggleLock: vi.fn().mockResolvedValue(undefined),
    toggleHold: vi.fn().mockResolvedValue(undefined),
    setLayout: vi.fn().mockResolvedValue(undefined),
    startRecording: vi.fn().mockResolvedValue(undefined),
    startStreaming: vi.fn().mockResolvedValue(undefined),
    sendDigits: vi.fn().mockResolvedValue(undefined),
    answer: vi.fn(),
    reject: vi.fn(),
  };
  return {
    id: 'call-1',
    direction: 'outbound' as const,
    to: 'sip:bob@example.com',
    ...subjects,
    ...actions,
  };
}

type MockCall = ReturnType<typeof createMockCall>;

function getState(host: TestHost) {
  // ContextProvider stores the value internally. Read it via the private provider.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (host.controller as any)._state;
}

describe('CallStateContextController', () => {
  let host: TestHost;
  let call: MockCall;

  beforeEach(async () => {
    host = document.createElement('test-callstate-host') as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;
    call = createMockCall();
  });

  it('initialises with empty/default state before connect', () => {
    const s = getState(host);
    expect(s.id).toBe('');
    expect(s.status).toBe('new');
    expect(s.participants).toEqual([]);
    expect(s.layouts).toEqual([]);
  });

  it('populates identity (id, direction, to) on connect', () => {
    host.controller.connect(call as unknown as Call);
    const s = getState(host);
    expect(s.id).toBe('call-1');
    expect(s.direction).toBe('outbound');
    expect(s.to).toBe('sip:bob@example.com');
  });

  it('reflects observable updates after connect', () => {
    host.controller.connect(call as unknown as Call);
    call.status$.next('active');
    call.recording$.next(true);
    call.locked$.next(true);
    call.layouts$.next(['grid', 'spotlight']);
    const s = getState(host);
    expect(s.status).toBe('active');
    expect(s.recording).toBe(true);
    expect(s.locked).toBe(true);
    expect(s.layouts).toEqual(['grid', 'spotlight']);
  });

  it('forwards action calls to the Call instance', async () => {
    host.controller.connect(call as unknown as Call);
    const s = getState(host);
    await s.hangup();
    await s.toggleLock();
    await s.toggleHold();
    await s.startRecording();
    await s.startStreaming();
    await s.sendDigits('123');
    await s.setLayout('grid', { 'p1': { x: 0, y: 0, width: 50, height: 50 } });
    s.answer();
    s.reject();
    expect(call.hangup).toHaveBeenCalled();
    expect(call.toggleLock).toHaveBeenCalled();
    expect(call.toggleHold).toHaveBeenCalled();
    expect(call.startRecording).toHaveBeenCalled();
    expect(call.startStreaming).toHaveBeenCalled();
    expect(call.sendDigits).toHaveBeenCalledWith('123');
    expect(call.setLayout).toHaveBeenCalledWith('grid', expect.any(Object));
    expect(call.answer).toHaveBeenCalled();
    expect(call.reject).toHaveBeenCalled();
  });

  it('disconnect resets state to empty defaults', () => {
    host.controller.connect(call as unknown as Call);
    call.status$.next('active');
    host.controller.disconnect();
    const s = getState(host);
    expect(s.id).toBe('');
    expect(s.status).toBe('new');
    expect(s.recording).toBe(false);
  });

  it('disconnect unsubscribes — late observable emissions do not mutate state', () => {
    host.controller.connect(call as unknown as Call);
    host.controller.disconnect();
    call.status$.next('active');
    expect(getState(host).status).toBe('new');
  });

  it('reconnecting to a new call replaces state and detaches from the old one', () => {
    host.controller.connect(call as unknown as Call);
    call.status$.next('active');

    const call2 = createMockCall();
    call2.id = 'call-2';
    call2.to = 'sip:carol@example.com';
    host.controller.connect(call2 as unknown as Call);

    const s = getState(host);
    expect(s.id).toBe('call-2');
    expect(s.to).toBe('sip:carol@example.com');

    // old call should not affect state any more
    call.status$.next('ended');
    expect(getState(host).status).not.toBe('ended');
  });

  it('hostDisconnected disconnects subscriptions', () => {
    host.controller.connect(call as unknown as Call);
    host.remove();
    call.status$.next('ended');
    expect(getState(host).status).not.toBe('ended');
  });
});
