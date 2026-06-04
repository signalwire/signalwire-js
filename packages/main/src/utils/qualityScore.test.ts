import { describe, it, expect } from 'vitest';

import { computeMOS, mosToQualityLevel } from './qualityScore';

import type { QualityLevel } from './qualityScore';

describe('computeMOS', () => {
  it('should return ~4.41 for perfect conditions (zero rtt, jitter, loss)', () => {
    const mos = computeMOS(0, 0, 0);
    // R = 93.2, MOS = 1 + 0.035*93.2 + 93.2*33.2*6.8*7e-6 ≈ 4.41
    expect(mos).toBeCloseTo(4.41, 1);
  });

  it('should return excellent quality for low RTT (20ms), no jitter, no loss', () => {
    const mos = computeMOS(20, 0, 0);
    expect(mos).toBeGreaterThanOrEqual(4.0);
    expect(mos).toBeLessThanOrEqual(5.0);
  });

  it('should return around good quality for moderate RTT (100ms) + 2% loss', () => {
    const mos = computeMOS(100, 10, 2);
    // R = 93.2 - (50+10)*0.024 - 2*2.5 = 93.2 - 1.44 - 5 = 86.76
    // Should map roughly to ~3.5-4.0 range
    expect(mos).toBeGreaterThanOrEqual(3.5);
    expect(mos).toBeLessThanOrEqual(4.5);
  });

  it('should return poor quality for high RTT (300ms) + 5% loss', () => {
    const mos = computeMOS(300, 30, 5);
    // R = 93.2 - (150+30)*0.024 - 5*2.5 = 93.2 - 4.32 - 12.5 = 76.38
    expect(mos).toBeLessThanOrEqual(4.0);
    expect(mos).toBeGreaterThanOrEqual(1.0);
  });

  it('should return very low quality for extreme conditions', () => {
    const mos = computeMOS(800, 100, 30);
    // R = 93.2 - (400+100)*0.024 - 30*2.5 = 93.2 - 12 - 75 = 6.2
    // Very low R → MOS close to 1
    expect(mos).toBeLessThanOrEqual(2.0);
    expect(mos).toBeGreaterThanOrEqual(1.0);
  });

  it('should clamp to 1.0 for catastrophic conditions', () => {
    const mos = computeMOS(2000, 500, 50);
    expect(mos).toBe(1.0);
  });

  it('should clamp to at most 5.0', () => {
    // Even with impossibly good values, should never exceed 5.0
    const mos = computeMOS(0, 0, 0);
    expect(mos).toBeLessThanOrEqual(5.0);
  });

  it('should produce progressively lower scores as RTT increases', () => {
    const mos0 = computeMOS(0, 0, 0);
    const mos50 = computeMOS(50, 0, 0);
    const mos200 = computeMOS(200, 0, 0);
    const mos500 = computeMOS(500, 0, 0);

    expect(mos0).toBeGreaterThan(mos50);
    expect(mos50).toBeGreaterThan(mos200);
    expect(mos200).toBeGreaterThan(mos500);
  });

  it('should produce progressively lower scores as packet loss increases', () => {
    const loss0 = computeMOS(50, 5, 0);
    const loss2 = computeMOS(50, 5, 2);
    const loss5 = computeMOS(50, 5, 5);
    const loss15 = computeMOS(50, 5, 15);

    expect(loss0).toBeGreaterThan(loss2);
    expect(loss2).toBeGreaterThan(loss5);
    expect(loss5).toBeGreaterThan(loss15);
  });

  it('should produce progressively lower scores as jitter increases', () => {
    const jitter0 = computeMOS(50, 0, 0);
    const jitter20 = computeMOS(50, 20, 0);
    const jitter100 = computeMOS(50, 100, 0);

    expect(jitter0).toBeGreaterThan(jitter20);
    expect(jitter20).toBeGreaterThan(jitter100);
  });
});

describe('mosToQualityLevel', () => {
  it('should return excellent for MOS >= 4.0', () => {
    expect(mosToQualityLevel(5.0)).toBe('excellent');
    expect(mosToQualityLevel(4.5)).toBe('excellent');
    expect(mosToQualityLevel(4.0)).toBe('excellent');
  });

  it('should return good for MOS >= 3.5 and < 4.0', () => {
    expect(mosToQualityLevel(3.99)).toBe('good');
    expect(mosToQualityLevel(3.5)).toBe('good');
    expect(mosToQualityLevel(3.75)).toBe('good');
  });

  it('should return fair for MOS >= 3.0 and < 3.5', () => {
    expect(mosToQualityLevel(3.49)).toBe('fair');
    expect(mosToQualityLevel(3.0)).toBe('fair');
    expect(mosToQualityLevel(3.25)).toBe('fair');
  });

  it('should return poor for MOS >= 2.0 and < 3.0', () => {
    expect(mosToQualityLevel(2.99)).toBe('poor');
    expect(mosToQualityLevel(2.0)).toBe('poor');
    expect(mosToQualityLevel(2.5)).toBe('poor');
  });

  it('should return critical for MOS < 2.0', () => {
    expect(mosToQualityLevel(1.99)).toBe('critical');
    expect(mosToQualityLevel(1.0)).toBe('critical');
    expect(mosToQualityLevel(1.5)).toBe('critical');
  });

  it('should correctly map boundary values', () => {
    const boundaries: Array<{ mos: number; expected: QualityLevel }> = [
      { mos: 4.0, expected: 'excellent' },
      { mos: 3.5, expected: 'good' },
      { mos: 3.0, expected: 'fair' },
      { mos: 2.0, expected: 'poor' },
      { mos: 1.0, expected: 'critical' }
    ];

    for (const { mos, expected } of boundaries) {
      expect(mosToQualityLevel(mos)).toBe(expected);
    }
  });

  it('should integrate correctly with computeMOS output', () => {
    // Perfect conditions → excellent
    expect(mosToQualityLevel(computeMOS(0, 0, 0))).toBe('excellent');

    // Catastrophic conditions → critical or poor
    const extreme = computeMOS(2000, 500, 50);
    const level = mosToQualityLevel(extreme);
    expect(level === 'critical' || level === 'poor').toBe(true);
  });
});
