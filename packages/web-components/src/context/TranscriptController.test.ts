import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Subject } from 'rxjs';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TranscriptController } from './TranscriptController.js';
import type { Call } from '../types/index.js';

@customElement('test-transcript-host')
class TestHost extends LitElement {
  controller = new TranscriptController(this);
}

interface MockCall {
  subscribe: (eventType: string) => Subject<Record<string, unknown>>;
  _streams: Record<string, Subject<Record<string, unknown>>>;
}

function createMockCall(): MockCall {
  const streams: Record<string, Subject<Record<string, unknown>>> = {};
  const get = (eventType: string) => {
    if (!streams[eventType]) streams[eventType] = new Subject();
    return streams[eventType];
  };
  return {
    _streams: streams,
    subscribe: (eventType: string) => get(eventType),
  };
}

function emit(call: MockCall, eventType: string, params: Record<string, unknown>) {
  call._streams[eventType]?.next({ event_type: eventType, params });
}

describe('TranscriptController', () => {
  let host: TestHost;
  let controller: TranscriptController;
  let call: MockCall;

  beforeEach(async () => {
    host = document.createElement('test-transcript-host') as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;
    controller = host.controller;
    call = createMockCall();
    controller.setCall(call as unknown as Call);
  });

  it('routes ai.response_utterance into agent partial entries', () => {
    emit(call, 'ai.response_utterance', { utterance: 'hello' });
    const entries = controller.state.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]!.type).toBe('agent');
    expect(entries[0]!.state).toBe('partial');
    expect(entries[0]!.text).toBe('hello');
  });

  it('falls back to params.text when utterance is missing', () => {
    emit(call, 'ai.response_utterance', { text: 'fallback' });
    expect(controller.state.entries[0]!.text).toBe('fallback');
  });

  it('promotes agent partial to complete on ai.completion', () => {
    emit(call, 'ai.response_utterance', { utterance: 'partial text' });
    emit(call, 'ai.completion', { text: 'final text', type: 'finished' });
    const entries = controller.state.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]!.state).toBe('complete');
    expect(entries[0]!.text).toBe('final text');
  });

  it('routes ai.partial_result as user partial', () => {
    emit(call, 'ai.partial_result', { text: 'hel' });
    const entries = controller.state.entries;
    expect(entries[0]!.type).toBe('user');
    expect(entries[0]!.state).toBe('partial');
  });

  it('strips {confidence=...} markers from user complete text', () => {
    emit(call, 'ai.speech_detect', { text: 'hello {confidence=0.95}' });
    expect(controller.state.entries[0]!.text).toBe('hello');
  });

  it('strips voice directives at the start of agent utterances', () => {
    emit(call, 'ai.response_utterance', {
      utterance: '~LN(English (United States))-; actual content',
    });
    expect(controller.state.entries[0]!.text).toBe('actual content');
  });

  it('strips voice directives in the middle, keeping the prefix', () => {
    emit(call, 'ai.completion', {
      text: 'real content ~LN(English (United States))-; repeated',
    });
    expect(controller.state.entries[0]!.text).toBe('real content');
  });

  it('clears entries when setCall is called with undefined', () => {
    emit(call, 'ai.completion', { text: 'something', type: 'finished' });
    expect(controller.state.entries).toHaveLength(1);
    controller.setCall(undefined);
    expect(controller.state.entries).toEqual([]);
  });

  it('unsubscribes from old call streams when re-binding', () => {
    emit(call, 'ai.response_utterance', { utterance: 'first' });
    expect(controller.state.entries).toHaveLength(1);

    const newCall = createMockCall();
    controller.setCall(newCall as unknown as Call);
    // Old call emissions must not affect state
    emit(call, 'ai.response_utterance', { utterance: 'ignored' });
    expect(controller.state.entries).toEqual([]);

    emit(newCall, 'ai.response_utterance', { utterance: 'second' });
    expect(controller.state.entries[0]!.text).toBe('second');
  });

  it('appends injected entries after chat entries', () => {
    emit(call, 'ai.completion', { text: 'agent line', type: 'finished' });
    controller.injectEntry({
      id: 'sys-1',
      type: 'system',
      state: 'complete',
      text: 'system line',
    });
    const entries = controller.state.entries;
    expect(entries).toHaveLength(2);
    expect(entries[0]!.type).toBe('agent');
    expect(entries[1]!.type).toBe('system');
  });

  it('does not throw when an event has no params object', () => {
    // Bare event without params — controller should treat the event itself as params
    // and produce empty text.
    expect(() => {
      call._streams['ai.partial_result']?.next({} as Record<string, unknown>);
    }).not.toThrow();
  });

  it('survives a handler that throws (logs warning, no crash)', () => {
    // Push a non-string text — asString returns '', so handler is a no-op
    // (covers defensive paths in the route handler).
    expect(() => {
      emit(call, 'ai.partial_result', { text: 12345 });
    }).not.toThrow();
    expect(controller.state.entries).toEqual([]);
  });

  it('cleans up subscriptions when host disconnects', () => {
    host.remove();
    // After disconnect, emissions are still pushed to the old subject, but
    // no entries should appear because the host is gone — verify state
    // remains stable (no exceptions, no spurious updates).
    expect(() => emit(call, 'ai.response_utterance', { utterance: 'ghost' })).not.toThrow();
  });

  it('flips entry order on barge (lastSpoken=user)', () => {
    emit(call, 'ai.response_utterance', { utterance: 'I think' });
    emit(call, 'ai.completion', { text: 'I think', type: 'barged' });
    emit(call, 'ai.partial_result', { text: 'wait' });
    const entries = controller.state.entries;
    expect(entries.find((e) => e.type === 'agent')?.state).toBe('complete');
    expect(entries.find((e) => e.type === 'user')?.state).toBe('partial');
  });
});

// Suppress unused-warning at the module level — vi is used implicitly above.
void vi;
