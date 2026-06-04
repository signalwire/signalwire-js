import { describe, it, expect } from 'vitest';
import { toError } from './toError';

describe('toError', () => {
  it('returns Error instances unchanged', () => {
    const err = new TypeError('test');
    expect(toError(err)).toBe(err);
  });

  it('returns Error subclass instances unchanged', () => {
    const err = new RangeError('out of range');
    expect(toError(err)).toBe(err);
    expect(toError(err)).toBeInstanceOf(RangeError);
  });

  it('wraps string values', () => {
    const result = toError('something went wrong');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('something went wrong');
  });

  it('wraps null', () => {
    expect(toError(null).message).toBe('null');
  });

  it('wraps undefined', () => {
    expect(toError(undefined).message).toBe('undefined');
  });

  it('wraps numbers', () => {
    expect(toError(42).message).toBe('42');
  });

  it('wraps objects', () => {
    const result = toError({ code: 500 });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('[object Object]');
  });
});
