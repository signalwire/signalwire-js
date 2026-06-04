import { describe, it, expect, afterEach, vi } from 'vitest';
import './sw-ui-control-bar.js';
import type { SwUiControlBar } from './sw-ui-control-bar.js';

async function mount(props: Partial<SwUiControlBar> = {}): Promise<SwUiControlBar> {
  const el = document.createElement('sw-ui-control-bar') as SwUiControlBar;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

/**
 * The control bar is composed of `sw-ui-split-button` instances; we drive
 * the public surface by dispatching the split-button events directly on
 * each split-button child rather than reaching through its shadow DOM.
 */
function splitButtons(el: SwUiControlBar): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.bar > sw-ui-split-button'));
}

const fire = (target: EventTarget, type: string, detail?: unknown) => {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
};

const detailAt = (fn: ReturnType<typeof vi.fn>, i: number): unknown =>
  (fn.mock.calls[i]![0] as CustomEvent).detail;

describe('sw-ui-control-bar', () => {
  let el: SwUiControlBar | null = null;
  afterEach(() => { el?.remove(); el = null; });

  it('toggles mic and emits sw-mic-toggle with the new state', async () => {
    el = await mount();
    const fn = vi.fn();
    el.addEventListener('sw-mic-toggle', fn as EventListener);

    const mic = splitButtons(el)[0]!;
    fire(mic, 'sw-split-button-toggle');
    expect(el.micMuted).toBe(true);
    expect(detailAt(fn, 0)).toEqual({ muted: true });

    fire(mic, 'sw-split-button-toggle');
    expect(el.micMuted).toBe(false);
    expect(detailAt(fn, 1)).toEqual({ muted: false });
  });

  it('toggles camera and speaker with the right event names', async () => {
    el = await mount();
    const cam = vi.fn();
    const spk = vi.fn();
    el.addEventListener('sw-camera-toggle', cam as EventListener);
    el.addEventListener('sw-speaker-toggle', spk as EventListener);

    const buttons = splitButtons(el);
    fire(buttons[1]!, 'sw-split-button-toggle');
    fire(buttons[2]!, 'sw-split-button-toggle');

    expect(detailAt(cam, 0)).toEqual({ muted: true });
    expect(detailAt(spk, 0)).toEqual({ muted: true });
  });

  it('emits sw-device-change with kind, deviceId, and label when a chevron item is selected', async () => {
    el = await mount({
      micDevices: [{ id: 'dev-1', label: 'External Mic' }],
    });
    const fn = vi.fn();
    el.addEventListener('sw-device-change', fn as EventListener);

    const mic = splitButtons(el)[0]!;
    fire(mic, 'sw-dropup-select', { id: 'dev-1', label: 'External Mic' });
    expect(detailAt(fn, 0)).toEqual({
      kind: 'mic',
      deviceId: 'dev-1',
      label: 'External Mic',
    });
  });

  it('emits sw-call-hangup with no detail when hang-up is clicked', async () => {
    el = await mount();
    const fn = vi.fn();
    el.addEventListener('sw-call-hangup', fn as EventListener);
    const hangup = el.shadowRoot!.querySelector<HTMLElement>('sw-ui-split-button.hangup')!;
    fire(hangup, 'sw-split-button-click');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('hides screen-share / hand-raise / transcript / settings by default and renders them when enabled', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelectorAll('.bar > sw-ui-split-button.optional').length).toBe(1); // fullscreen on

    el.showScreenShare = true;
    el.showHandRaise = true;
    el.showTranscript = true;
    el.showSettings = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.bar > sw-ui-split-button.optional').length).toBe(5);
  });

  it('screen-share / hand-raise / fullscreen toggles flip state and fire events', async () => {
    el = await mount({ showScreenShare: true, showHandRaise: true, showFullscreen: true });
    const ss = vi.fn();
    const hr = vi.fn();
    const fs = vi.fn();
    el.addEventListener('sw-screen-share-toggle', ss as EventListener);
    el.addEventListener('sw-hand-raise-toggle', hr as EventListener);
    el.addEventListener('sw-fullscreen-toggle', fs as EventListener);

    const optional = el.shadowRoot!.querySelectorAll<HTMLElement>('.bar > sw-ui-split-button.optional');
    // order: screen-share, hand-raise, fullscreen (transcript/settings disabled)
    fire(optional[0]!, 'sw-split-button-click');
    fire(optional[1]!, 'sw-split-button-click');
    fire(optional[2]!, 'sw-split-button-click');

    expect(detailAt(ss, 0)).toEqual({ active: true });
    expect(detailAt(hr, 0)).toEqual({ raised: true });
    expect(detailAt(fs, 0)).toEqual({ fullscreen: true });
  });

  it('settings menu re-emits sw-settings-change with the picked id', async () => {
    el = await mount({
      showSettings: true,
      settingsItems: [{ id: 'noise-suppression', label: 'Noise suppression' }],
    });
    const fn = vi.fn();
    el.addEventListener('sw-settings-change', fn as EventListener);

    // optional buttons: settings (0), fullscreen (1) — showFullscreen defaults true
    const settingsBtn = el.shadowRoot!.querySelectorAll<HTMLElement>('.bar > sw-ui-split-button.optional')[0]!;
    fire(settingsBtn, 'sw-dropup-select', { id: 'noise-suppression', label: 'Noise suppression' });
    expect(detailAt(fn, 0)).toEqual({ settingId: 'noise-suppression' });
  });

  it('overflow menu routes synthetic ids back to their toggle handlers', async () => {
    el = await mount({ showScreenShare: true });
    const ss = vi.fn();
    el.addEventListener('sw-screen-share-toggle', ss as EventListener);

    const overflow = el.shadowRoot!.querySelector<HTMLElement>('.bar > sw-ui-split-button.overflow')!;
    fire(overflow, 'sw-dropup-select', { id: '__overflow:screen-share', label: 'Share screen' });
    expect(detailAt(ss, 0)).toEqual({ active: true });
    expect(el.screenSharing).toBe(true);
  });
});
