import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyframeThrottler } from './KeyframeThrottler';

describe('KeyframeThrottler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canRequest()', () => {
    it('should allow requests when no prior requests exist', () => {
      const throttler = new KeyframeThrottler();
      expect(throttler.canRequest()).toBe(true);
    });

    it('should allow requests within the burst limit', () => {
      const throttler = new KeyframeThrottler({ maxBurst: 3 });

      throttler.record();
      expect(throttler.canRequest()).toBe(true);

      throttler.record();
      expect(throttler.canRequest()).toBe(true);
    });

    it('should block after reaching burst limit', () => {
      const throttler = new KeyframeThrottler({ maxBurst: 3 });

      throttler.record();
      throttler.record();
      throttler.record();

      expect(throttler.canRequest()).toBe(false);
    });

    it('should block during cooldown period after burst', () => {
      const throttler = new KeyframeThrottler({
        maxBurst: 2,
        cooldownMs: 5000
      });

      throttler.record();
      throttler.record();

      // Advance 3 seconds - still in cooldown
      vi.advanceTimersByTime(3000);
      expect(throttler.canRequest()).toBe(false);
    });

    it('should allow requests after cooldown expires', () => {
      const throttler = new KeyframeThrottler({
        maxBurst: 2,
        burstWindowMs: 3000,
        cooldownMs: 5000
      });

      throttler.record();
      throttler.record();

      expect(throttler.canRequest()).toBe(false);

      // Advance past cooldown period
      vi.advanceTimersByTime(5001);
      expect(throttler.canRequest()).toBe(true);
    });

    it('should allow requests after burst window expires naturally', () => {
      const throttler = new KeyframeThrottler({
        maxBurst: 3,
        burstWindowMs: 2000,
        cooldownMs: 10000
      });

      // Make 2 requests (under burst limit, no cooldown)
      throttler.record();
      throttler.record();

      expect(throttler.canRequest()).toBe(true);

      // Advance past burst window so old timestamps expire
      vi.advanceTimersByTime(2001);

      // Should allow since old timestamps are outside the window
      expect(throttler.canRequest()).toBe(true);
    });
  });

  describe('record()', () => {
    it('should track request timestamps', () => {
      const throttler = new KeyframeThrottler({ maxBurst: 3 });

      expect(throttler.canRequest()).toBe(true);
      throttler.record();
      expect(throttler.canRequest()).toBe(true);
      throttler.record();
      expect(throttler.canRequest()).toBe(true);
      throttler.record();
      expect(throttler.canRequest()).toBe(false);
    });

    it('should activate cooldown when burst limit is reached', () => {
      const throttler = new KeyframeThrottler({
        maxBurst: 2,
        cooldownMs: 10000
      });

      throttler.record();
      throttler.record();

      // Should be in cooldown
      vi.advanceTimersByTime(5000);
      expect(throttler.canRequest()).toBe(false);

      // After cooldown
      vi.advanceTimersByTime(5001);
      expect(throttler.canRequest()).toBe(true);
    });
  });

  describe('reset()', () => {
    it('should clear all timestamps and allow requests again', () => {
      const throttler = new KeyframeThrottler({ maxBurst: 2 });

      throttler.record();
      throttler.record();
      expect(throttler.canRequest()).toBe(false);

      throttler.reset();
      expect(throttler.canRequest()).toBe(true);
    });

    it('should clear cooldown state', () => {
      const throttler = new KeyframeThrottler({
        maxBurst: 2,
        cooldownMs: 60000
      });

      throttler.record();
      throttler.record();

      // In cooldown
      vi.advanceTimersByTime(1000);
      expect(throttler.canRequest()).toBe(false);

      throttler.reset();
      expect(throttler.canRequest()).toBe(true);
    });

    it('should allow full burst again after reset', () => {
      const throttler = new KeyframeThrottler({ maxBurst: 3 });

      throttler.record();
      throttler.record();
      throttler.record();
      expect(throttler.canRequest()).toBe(false);

      throttler.reset();

      throttler.record();
      expect(throttler.canRequest()).toBe(true);
      throttler.record();
      expect(throttler.canRequest()).toBe(true);
      throttler.record();
      expect(throttler.canRequest()).toBe(false);
    });
  });

  describe('default options', () => {
    it('should use default maxBurst of 3', () => {
      const throttler = new KeyframeThrottler();

      throttler.record();
      throttler.record();
      expect(throttler.canRequest()).toBe(true);

      throttler.record();
      expect(throttler.canRequest()).toBe(false);
    });

    it('should use default burstWindowMs of 3000', () => {
      const throttler = new KeyframeThrottler();

      throttler.record();
      throttler.record();

      // Advance past default burst window
      vi.advanceTimersByTime(3001);

      // Old timestamps should have expired from the window
      expect(throttler.canRequest()).toBe(true);
    });

    it('should use default cooldownMs of 10000', () => {
      const throttler = new KeyframeThrottler();

      throttler.record();
      throttler.record();
      throttler.record();

      // Still in cooldown at 9 seconds
      vi.advanceTimersByTime(9999);
      expect(throttler.canRequest()).toBe(false);

      // Past cooldown at 10+ seconds
      vi.advanceTimersByTime(2);
      expect(throttler.canRequest()).toBe(true);
    });
  });

  describe('custom options', () => {
    it('should respect custom maxBurst', () => {
      const throttler = new KeyframeThrottler({ maxBurst: 1 });

      throttler.record();
      expect(throttler.canRequest()).toBe(false);
    });

    it('should respect custom burstWindowMs', () => {
      const throttler = new KeyframeThrottler({
        maxBurst: 2,
        burstWindowMs: 1000
      });

      throttler.record();

      // Advance past custom burst window
      vi.advanceTimersByTime(1001);

      // Old timestamp should have expired
      throttler.record();
      expect(throttler.canRequest()).toBe(true);
    });

    it('should respect custom cooldownMs', () => {
      const throttler = new KeyframeThrottler({
        maxBurst: 1,
        burstWindowMs: 1000,
        cooldownMs: 2000
      });

      throttler.record();
      expect(throttler.canRequest()).toBe(false);

      vi.advanceTimersByTime(2001);
      expect(throttler.canRequest()).toBe(true);
    });
  });
});
