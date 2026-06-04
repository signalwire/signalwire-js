import { describe, it, expect, vi } from 'vitest';
import { ChatState } from './chat-state.js';

describe('ChatState', () => {
  describe('initial state', () => {
    it('starts empty', () => {
      const s = new ChatState();
      expect(s.getHistory()).toEqual([]);
      expect(s.hasAny).toBe(false);
      expect(s.lastSpoken).toBeNull();
    });
  });

  describe('AI utterances', () => {
    it('buffers AI chunks into a single partial', () => {
      const s = new ChatState();
      s.onAiChunk('Hello');
      s.onAiChunk('world');
      const h = s.getHistory();
      expect(h).toHaveLength(1);
      expect(h[0]).toEqual({ speaker: 'ai', text: 'Hello world', state: 'partial' });
      expect(s.lastSpoken).toBe('ai');
    });

    it('ignores empty chunks', () => {
      const s = new ChatState();
      s.onAiChunk('');
      expect(s.getHistory()).toEqual([]);
      expect(s.lastSpoken).toBeNull();
    });

    it('collapses whitespace between buffered chunks', () => {
      const s = new ChatState();
      s.onAiChunk('Hello   ');
      s.onAiChunk('   world');
      expect(s.getHistory()[0]?.text).toBe('Hello world');
    });

    it('promotes partial to complete on completion', () => {
      const s = new ChatState();
      s.onAiChunk('Hi');
      s.onAiComplete('Hi there', false);
      const h = s.getHistory();
      expect(h).toHaveLength(1);
      expect(h[0]).toEqual({ speaker: 'ai', text: 'Hi there', state: 'complete' });
    });

    it('falls back to buffered text when completion text is empty', () => {
      const s = new ChatState();
      s.onAiChunk('buffered');
      s.onAiComplete('', false);
      expect(s.getHistory()[0]).toEqual({
        speaker: 'ai', text: 'buffered', state: 'complete',
      });
    });

    it('inserts directly when completion arrives with no prior partial', () => {
      const s = new ChatState();
      s.onAiComplete('direct', false);
      expect(s.getHistory()).toEqual([
        { speaker: 'ai', text: 'direct', state: 'complete' },
      ]);
    });

    it('drops empty completion when there is no partial', () => {
      const s = new ChatState();
      s.onAiComplete('', false);
      expect(s.getHistory()).toEqual([]);
    });

    it('flips lastSpoken to user when barged', () => {
      const s = new ChatState();
      s.onAiChunk('hi');
      s.onAiComplete('hi', true);
      expect(s.lastSpoken).toBe('user');
    });
  });

  describe('user utterances', () => {
    it('replaces user partial on each call', () => {
      const s = new ChatState();
      s.onUserPartial('hel');
      s.onUserPartial('hello');
      const h = s.getHistory();
      expect(h).toHaveLength(1);
      expect(h[0]).toEqual({ speaker: 'user', text: 'hello', state: 'partial' });
    });

    it('ignores empty user partials', () => {
      const s = new ChatState();
      s.onUserPartial('');
      expect(s.getHistory()).toEqual([]);
    });

    it('promotes user partial to complete', () => {
      const s = new ChatState();
      s.onUserPartial('hello');
      s.onUserComplete('hello world');
      expect(s.getHistory()).toEqual([
        { speaker: 'user', text: 'hello world', state: 'complete' },
      ]);
    });

    it('drops user partial when complete text is empty', () => {
      const s = new ChatState();
      s.onUserPartial('hello');
      s.onUserComplete('');
      expect(s.getHistory()).toEqual([]);
    });
  });

  describe('coexisting partials (barge-in)', () => {
    it('renders both partials, AI then user when user spoke last', () => {
      const s = new ChatState();
      s.onAiChunk('thinking');
      s.onUserPartial('wait');
      const h = s.getHistory();
      expect(h).toHaveLength(2);
      expect(h[0]!.speaker).toBe('ai');
      expect(h[1]!.speaker).toBe('user');
    });

    it('renders user first when AI spoke last', () => {
      const s = new ChatState();
      s.onUserPartial('wait');
      s.onAiChunk('thinking');
      const h = s.getHistory();
      expect(h[0]!.speaker).toBe('user');
      expect(h[1]!.speaker).toBe('ai');
    });
  });

  describe('reset', () => {
    it('clears all entries and partials', () => {
      const s = new ChatState();
      s.onAiComplete('done', false);
      s.onUserPartial('typing');
      s.reset();
      expect(s.getHistory()).toEqual([]);
      expect(s.hasAny).toBe(false);
      expect(s.lastSpoken).toBeNull();
    });
  });

  describe('onUpdate callback', () => {
    it('fires on every state change', () => {
      const s = new ChatState();
      const cb = vi.fn();
      s.onUpdate = cb;
      s.onAiChunk('a');
      s.onUserPartial('b');
      s.onAiComplete('a', false);
      s.onUserComplete('b');
      s.reset();
      expect(cb).toHaveBeenCalledTimes(5);
    });

    it('still fires for ignored empty events (reset path on empty user complete)', () => {
      const s = new ChatState();
      const cb = vi.fn();
      s.onUpdate = cb;
      s.onUserComplete('');
      expect(cb).toHaveBeenCalled();
    });
  });
});
