import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createVideoElement,
  waitForVideoReady,
  attachMediaStream,
  detachMediaStream,
} from './video.js';
import { VIDEO_READY_TIMEOUT_MS } from '../constants.js';

const setReadyState = (el: HTMLVideoElement, value: number) => {
  Object.defineProperty(el, 'readyState', { value, configurable: true });
};

describe('createVideoElement', () => {
  it('returns a muted, autoplaying, inline-playing video element', () => {
    const el = createVideoElement();
    expect(el.tagName).toBe('VIDEO');
    expect(el.muted).toBe(true);
    expect(el.autoplay).toBe(true);
    expect(el.playsInline).toBe(true);
  });

  it('re-plays the video when a pause event fires', () => {
    const el = createVideoElement();
    const play = vi.fn().mockResolvedValue(undefined);
    el.play = play as unknown as HTMLVideoElement['play'];
    el.dispatchEvent(new Event('pause'));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('logs an error when the re-play attempt rejects', async () => {
    const el = createVideoElement();
    const error = new Error('play failed');
    el.play = vi.fn().mockRejectedValue(error) as unknown as HTMLVideoElement['play'];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    el.dispatchEvent(new Event('pause'));
    // waitFor rather than a fixed number of microtask flushes, which would
    // break if the promise chain in the pause handler gains a link.
    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledWith('Video Element Paused', error);
    });
    spy.mockRestore();
  });
});

describe('waitForVideoReady', () => {
  it('resolves immediately when the element already has metadata', async () => {
    // happy-dom does not define the HTMLMediaElement.HAVE_* readyState
    // constants; shim it so the early-return branch is reachable.
    const proto = HTMLMediaElement as unknown as { HAVE_METADATA?: number };
    const had = Object.prototype.hasOwnProperty.call(proto, 'HAVE_METADATA');
    const prev = proto.HAVE_METADATA;
    proto.HAVE_METADATA = 1;
    try {
      const el = createVideoElement();
      setReadyState(el, 2);
      await expect(waitForVideoReady(el)).resolves.toBeUndefined();
    } finally {
      if (had) proto.HAVE_METADATA = prev;
      else delete proto.HAVE_METADATA;
    }
  });

  it('resolves once "canplay" fires for a not-yet-ready element', async () => {
    const el = createVideoElement();
    setReadyState(el, 0);
    const pending = waitForVideoReady(el);
    el.dispatchEvent(new Event('canplay'));
    await expect(pending).resolves.toBeUndefined();
  });

  it('stays settled when another ready event fires afterwards', async () => {
    const el = createVideoElement();
    setReadyState(el, 0);
    const pending = waitForVideoReady(el);
    el.dispatchEvent(new Event('canplay'));
    // `done` already removed both listeners, so this never reaches the handler.
    // The `resolved` guard itself is defensive and unreachable by construction.
    el.dispatchEvent(new Event('resize'));
    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves via the timeout fallback for audio-only streams', async () => {
    vi.useFakeTimers();
    try {
      const el = createVideoElement();
      setReadyState(el, 0);
      const pending = waitForVideoReady(el);
      vi.advanceTimersByTime(VIDEO_READY_TIMEOUT_MS);
      await expect(pending).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('attachMediaStream / detachMediaStream', () => {
  let el: HTMLVideoElement;

  beforeEach(() => {
    el = createVideoElement();
  });

  it('attaches a stream and can detach it back to null', () => {
    const stream = new MediaStream();
    attachMediaStream(el, stream);
    expect(el.srcObject).toBe(stream);
    detachMediaStream(el);
    expect(el.srcObject).toBeNull();
  });

  it('attaching null clears the stream', () => {
    attachMediaStream(el, new MediaStream());
    attachMediaStream(el, null);
    expect(el.srcObject).toBeNull();
  });

  it('detaching when nothing is attached is a no-op', () => {
    // element.srcObject is falsy → the guarded branch is skipped.
    expect(el.srcObject).toBeFalsy();
    detachMediaStream(el);
    expect(el.srcObject).toBeNull();
  });
});
