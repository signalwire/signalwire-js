import { describe, it, expect, afterEach } from 'vitest';
import './sw-ui-icon.js';
import type { SwUiIcon } from './sw-ui-icon.js';

async function mount(props: Partial<SwUiIcon> = {}): Promise<SwUiIcon> {
  const el = document.createElement('sw-ui-icon') as SwUiIcon;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('sw-ui-icon', () => {
  let el: SwUiIcon | null = null;
  afterEach(() => { el?.remove(); el = null; });

  it('registers as a custom element', () => {
    expect(customElements.get('sw-ui-icon')).toBeDefined();
  });

  it('renders an inline SVG for a known name', async () => {
    el = await mount({ name: 'mic-on' });
    const svg = el.shadowRoot?.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders nothing for an unknown name (no throw)', async () => {
    // @ts-expect-error - intentionally testing the fallback path
    el = await mount({ name: 'definitely-not-a-real-icon' });
    expect(el.shadowRoot?.querySelector('svg')).toBeNull();
  });

  it('applies the size attribute as width/height on the SVG', async () => {
    el = await mount({ name: 'mic-on', size: 32 });
    const svg = el.shadowRoot?.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('defaults to size 24 when not specified', async () => {
    el = await mount({ name: 'mic-on' });
    const svg = el.shadowRoot?.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('24');
  });
});
