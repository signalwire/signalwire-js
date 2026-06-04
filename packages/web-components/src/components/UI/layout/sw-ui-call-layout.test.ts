import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import './sw-ui-call-layout.js';
import type { SwUiCallLayout } from './sw-ui-call-layout.js';

async function mount(props: Partial<SwUiCallLayout> = {}): Promise<SwUiCallLayout> {
  const el = document.createElement('sw-ui-call-layout') as SwUiCallLayout;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

beforeEach(() => {
  // happy-dom: stub fullscreen API.
  Object.defineProperty(document, 'fullscreenElement', {
    value: null, writable: true, configurable: true,
  });
  if (!(HTMLElement.prototype as any).__fsStubbed) {
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      value: function () {
        Object.defineProperty(document, 'fullscreenElement', {
          value: this, writable: true, configurable: true,
        });
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      }, writable: true, configurable: true,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      value: function () {
        Object.defineProperty(document, 'fullscreenElement', {
          value: null, writable: true, configurable: true,
        });
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      }, writable: true, configurable: true,
    });
    (HTMLElement.prototype as any).__fsStubbed = true;
  }
});

describe('sw-ui-call-layout', () => {
  let el: SwUiCallLayout | null = null;
  afterEach(() => { el?.remove(); el = null; });

  it('toggleTranscript flips the transcript property', async () => {
    el = await mount();
    expect(el.transcript).toBe(false);
    el.toggleTranscript();
    expect(el.transcript).toBe(true);
    el.toggleTranscript();
    expect(el.transcript).toBe(false);
  });

  it('reflects transcript and loading as attributes', async () => {
    el = await mount({ transcript: true, loading: true });
    expect(el.hasAttribute('transcript')).toBe(true);
    expect(el.hasAttribute('loading')).toBe(true);
  });

  it('renders the loading spinner when loading=true', async () => {
    el = await mount({ loading: true });
    expect(el.shadowRoot!.querySelector('.loading-overlay')).toBeTruthy();

    el.loading = false;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.loading-overlay')).toBeNull();
  });

  it('toggleFullscreen calls requestFullscreen when not in fullscreen, then exitFullscreen on the next call', async () => {
    el = await mount();
    const reqSpy = vi.spyOn(el, 'requestFullscreen');
    const exitSpy = vi.spyOn(document, 'exitFullscreen');

    el.toggleFullscreen();
    expect(reqSpy).toHaveBeenCalledTimes(1);
    // wait a tick for the fullscreenchange event to flush
    await Promise.resolve();
    expect(el.fullscreen).toBe(true);
    expect(el.hasAttribute('fullscreen')).toBe(true);

    el.toggleFullscreen();
    expect(exitSpy).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(el.fullscreen).toBe(false);
    expect(el.hasAttribute('fullscreen')).toBe(false);
  });

  it('exposes the expected named slots', async () => {
    el = await mount();
    const slotNames = Array.from(el.shadowRoot!.querySelectorAll('slot'))
      .map((s) => s.getAttribute('name'))
      .filter(Boolean);
    expect(slotNames).toEqual(
      expect.arrayContaining(['background', 'video', 'floating-video', 'controls', 'transcript'])
    );
  });
});
