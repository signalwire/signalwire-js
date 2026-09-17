import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not invoke the function synchronously', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
  });

  it('invokes the function once the wait elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('collapses rapid calls into a single invocation (clears the pending timer)', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    // First call: timeout is null, the clearTimeout branch is skipped.
    debounced();
    // Subsequent calls: timeout !== null, so the previous timer is cleared.
    vi.advanceTimersByTime(40);
    debounced();
    vi.advanceTimersByTime(40);
    debounced();
    // Only 20ms elapsed since the last call — nothing fired yet.
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('invokes with the arguments from the most recent call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a', 1);
    debounced('b', 2);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b', 2);
  });

  it('can fire again for a fresh call after a completed cycle', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    // timeout is back to null here — next call takes the skip-clear branch again.
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
