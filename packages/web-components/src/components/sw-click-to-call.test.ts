import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('./sw-call-widget/sw-call-widget.js', () => ({}));
vi.mock('./UI/layout/sw-ui-background.js', () => ({}));
vi.mock('./UI/icons/sw-ui-icon.js', () => ({}));

import './sw-click-to-call.js';
import type { SwClickToCall } from './sw-click-to-call.js';

async function mount(props: Partial<SwClickToCall> = {}): Promise<SwClickToCall> {
  const el = document.createElement('sw-click-to-call') as SwClickToCall;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('sw-click-to-call', () => {
  let el: SwClickToCall | null = null;

  afterEach(() => { el?.remove(); el = null; });

  it('renders a call-button', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('.call-button')).toBeTruthy();
  });

  it('shows default label "Call"', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('.call-button')!.textContent!.trim()).toContain('Call');
  });

  it('shows custom label when label prop is set', async () => {
    el = await mount({ label: 'Start Session' });
    expect(el.shadowRoot!.querySelector('.call-button')!.textContent!.trim()).toContain('Start Session');
  });

  it('updates label when label prop changes', async () => {
    el = await mount({ label: 'Call' });
    el.label = 'Connect';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.call-button')!.textContent!.trim()).toContain('Connect');
  });

  it('renders sw-call-widget with modal attribute', async () => {
    el = await mount();
    const widget = el.shadowRoot!.querySelector('sw-call-widget');
    expect(widget).toBeTruthy();
    expect(widget!.hasAttribute('modal')).toBe(true);
  });

  it('passes token to sw-call-widget', async () => {
    el = await mount({ token: 'my-token' });
    const widget = el.shadowRoot!.querySelector('sw-call-widget') as any;
    expect(widget.token).toBe('my-token');
  });

  it('passes destination to sw-call-widget', async () => {
    el = await mount({ destination: 'sip:bob@example.com' });
    const widget = el.shadowRoot!.querySelector('sw-call-widget') as any;
    expect(widget.destination).toBe('sip:bob@example.com');
  });

  it('reflects audio-only attribute on host', async () => {
    el = await mount({ audioOnly: true });
    expect(el.hasAttribute('audio-only')).toBe(true);
  });
});
