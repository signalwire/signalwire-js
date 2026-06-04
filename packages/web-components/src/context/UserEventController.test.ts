import { describe, it, expect, beforeEach } from 'vitest';
import { Subject } from 'rxjs';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { UserEventController } from './UserEventController.js';
import type { Call } from '../types/index.js';
import type { DisplayContentPayload } from '../components/UI/layout/sw-ui-content-drawer.js';

@customElement('test-userevent-host')
class TestHost extends LitElement {
  controller = new UserEventController(this);
}

interface MockCall {
  _stream: Subject<Record<string, unknown>>;
  subscribe: (eventType: string) => Subject<Record<string, unknown>>;
}

function createMockCall(): MockCall {
  const stream = new Subject<Record<string, unknown>>();
  return {
    _stream: stream,
    subscribe: () => stream,
  };
}

describe('UserEventController', () => {
  let host: TestHost;
  let controller: UserEventController;
  let call: MockCall;

  beforeEach(async () => {
    host = document.createElement('test-userevent-host') as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;
    controller = host.controller;
    call = createMockCall();
    controller.setCall(call as unknown as Call);
  });

  it('dispatches sw-display-content for display_content events', () => {
    let payload: DisplayContentPayload | null = null;
    host.addEventListener('sw-display-content', (e) => {
      payload = (e as CustomEvent<DisplayContentPayload>).detail;
    });
    call._stream.next({
      params: {
        type: 'display_content',
        content: '# Hello',
        format: 'markdown',
        title: 'Doc',
        language: undefined,
      },
    });
    expect(payload).not.toBeNull();
    expect(payload!.content).toBe('# Hello');
    expect(payload!.format).toBe('markdown');
    expect(payload!.title).toBe('Doc');
  });

  it('coerces unknown formats to "text"', () => {
    let payload: DisplayContentPayload | null = null;
    host.addEventListener('sw-display-content', (e) => {
      payload = (e as CustomEvent<DisplayContentPayload>).detail;
    });
    call._stream.next({
      params: {
        type: 'display_content',
        content: 'x',
        format: 'evil-format',
      },
    });
    expect(payload!.format).toBe('text');
  });

  it('defaults missing content to empty string', () => {
    let payload: DisplayContentPayload | null = null;
    host.addEventListener('sw-display-content', (e) => {
      payload = (e as CustomEvent<DisplayContentPayload>).detail;
    });
    call._stream.next({
      params: { type: 'display_content', format: 'text' },
    });
    expect(payload!.content).toBe('');
  });

  it('routes non-display_content events to signalwire-address:event', () => {
    let captured: unknown = null;
    host.addEventListener('signalwire-address:event', (e) => {
      captured = (e as CustomEvent).detail;
    });
    call._stream.next({
      params: { type: 'custom_thing', payload: { foo: 'bar' } },
    });
    expect(captured).toEqual({ type: 'custom_thing', payload: { foo: 'bar' } });
  });

  it('does not dispatch sw-display-content for pass-through events', () => {
    let displayed = false;
    host.addEventListener('sw-display-content', () => {
      displayed = true;
    });
    call._stream.next({ params: { type: 'something_else' } });
    expect(displayed).toBe(false);
  });

  it('ignores events without a params object', () => {
    let any = false;
    host.addEventListener('sw-display-content', () => (any = true));
    host.addEventListener('signalwire-address:event', () => (any = true));
    call._stream.next({});
    expect(any).toBe(false);
  });

  it('dispatched events bubble and cross shadow DOM', () => {
    let bubbled = false;
    document.body.addEventListener(
      'sw-display-content',
      () => (bubbled = true),
      { once: true }
    );
    call._stream.next({
      params: { type: 'display_content', content: 'x', format: 'text' },
    });
    expect(bubbled).toBe(true);
  });

  it('unsubscribes when setCall(undefined) is called', () => {
    let count = 0;
    host.addEventListener('signalwire-address:event', () => count++);
    controller.setCall(undefined);
    call._stream.next({ params: { type: 'foo' } });
    expect(count).toBe(0);
  });

  it('rebinds to a new call cleanly', () => {
    let count = 0;
    host.addEventListener('signalwire-address:event', () => count++);
    const newCall = createMockCall();
    controller.setCall(newCall as unknown as Call);

    call._stream.next({ params: { type: 'old' } });
    expect(count).toBe(0);

    newCall._stream.next({ params: { type: 'new' } });
    expect(count).toBe(1);
  });
});
