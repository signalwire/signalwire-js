import { describe, it, expect } from 'vitest';
import {
  parseUserVariablesAttribute,
  withWidgetCapabilities,
  WIDGET_DISPLAY_FORMATS,
} from './user-variables.js';

describe('parseUserVariablesAttribute', () => {
  it('returns empty object for null/undefined/empty string', () => {
    expect(parseUserVariablesAttribute(null)).toEqual({});
    expect(parseUserVariablesAttribute(undefined)).toEqual({});
    expect(parseUserVariablesAttribute('')).toEqual({});
  });

  it('parses a valid JSON object', () => {
    expect(parseUserVariablesAttribute('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
  });

  it('returns empty object for invalid JSON', () => {
    expect(parseUserVariablesAttribute('{not json')).toEqual({});
  });

  it('returns empty object for non-object JSON (array, primitive)', () => {
    expect(parseUserVariablesAttribute('[1,2,3]')).toEqual({});
    expect(parseUserVariablesAttribute('42')).toEqual({});
    expect(parseUserVariablesAttribute('"string"')).toEqual({});
    expect(parseUserVariablesAttribute('null')).toEqual({});
  });
});

describe('withWidgetCapabilities', () => {
  const fakeNow = () => '2026-04-27T12:00:00.000Z';

  it('adds display_content capability when none is provided', () => {
    const out = withWidgetCapabilities({}, fakeNow);
    expect(out['capabilities']).toEqual({
      display_content: { formats: [...WIDGET_DISPLAY_FORMATS] },
    });
  });

  it('adds metadata.widget.opened_at timestamp', () => {
    const out = withWidgetCapabilities({}, fakeNow);
    expect(out['metadata']).toEqual({
      widget: { opened_at: '2026-04-27T12:00:00.000Z' },
    });
  });

  it('preserves user-supplied top-level keys', () => {
    const out = withWidgetCapabilities({ customer_id: 'abc', theme: 'dark' }, fakeNow);
    expect(out['customer_id']).toBe('abc');
    expect(out['theme']).toBe('dark');
  });

  it('user-supplied capabilities override widget defaults on key conflict', () => {
    const out = withWidgetCapabilities(
      { capabilities: { display_content: { formats: ['text'] } } },
      fakeNow
    );
    // shallow-merged: user wins on display_content
    expect((out['capabilities'] as Record<string, unknown>)['display_content'])
      .toEqual({ formats: ['text'] });
  });

  it('preserves user-supplied capabilities alongside the widget signal', () => {
    const out = withWidgetCapabilities(
      { capabilities: { custom_cap: true } },
      fakeNow
    );
    const caps = out['capabilities'] as Record<string, unknown>;
    expect(caps['custom_cap']).toBe(true);
    expect(caps['display_content']).toEqual({
      formats: [...WIDGET_DISPLAY_FORMATS],
    });
  });

  it('preserves user-supplied metadata sub-keys', () => {
    const out = withWidgetCapabilities(
      { metadata: { source: 'landing-page', widget: { variant: 'compact' } } },
      fakeNow
    );
    const meta = out['metadata'] as Record<string, unknown>;
    expect(meta['source']).toBe('landing-page');
    const widget = meta['widget'] as Record<string, unknown>;
    expect(widget['variant']).toBe('compact');
    expect(widget['opened_at']).toBe('2026-04-27T12:00:00.000Z');
  });

  it('user-supplied metadata.widget.opened_at wins on conflict', () => {
    const out = withWidgetCapabilities(
      { metadata: { widget: { opened_at: 'user-supplied' } } },
      fakeNow
    );
    const widget = (out['metadata'] as Record<string, unknown>)['widget'] as Record<string, unknown>;
    expect(widget['opened_at']).toBe('user-supplied');
  });

  it('treats non-object capabilities/metadata as missing (defensive)', () => {
    const out = withWidgetCapabilities(
      { capabilities: 'oops', metadata: 42 } as unknown as Record<string, unknown>,
      fakeNow
    );
    expect(out['capabilities']).toEqual({
      display_content: { formats: [...WIDGET_DISPLAY_FORMATS] },
    });
    expect(out['metadata']).toEqual({
      widget: { opened_at: '2026-04-27T12:00:00.000Z' },
    });
  });

  it('uses real Date.now() by default', () => {
    const out = withWidgetCapabilities({});
    const meta = out['metadata'] as Record<string, unknown>;
    const widget = meta['widget'] as Record<string, unknown>;
    expect(typeof widget['opened_at']).toBe('string');
    // Loose ISO-8601 sanity check
    expect(widget['opened_at']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
