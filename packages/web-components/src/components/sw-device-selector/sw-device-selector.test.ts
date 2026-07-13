import { describe, it, expect, afterEach, vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';

vi.mock('../UI/icons/sw-ui-icon.js', () => ({}));
vi.mock('../sw-local-camera.js', () => ({}));
vi.mock('../sw-audio-level.js', () => ({}));
vi.mock('@signalwire/js', () => ({ getLogger: () => ({ error: vi.fn(), warn: vi.fn(), debug: vi.fn() }) }));

import './sw-device-selector.js';
import type { SwDeviceSelector } from './sw-device-selector.js';

function makeDevice(id: string, label: string): MediaDeviceInfo {
  return { deviceId: id, label, groupId: '', kind: 'audioinput', toJSON: () => ({}) } as MediaDeviceInfo;
}

function makeController(opts: {
  audioIn?: MediaDeviceInfo[];
  videoIn?: MediaDeviceInfo[];
  audioOut?: MediaDeviceInfo[];
  selAudioIn?: MediaDeviceInfo | null;
  selVideoIn?: MediaDeviceInfo | null;
  selAudioOut?: MediaDeviceInfo | null;
} = {}) {
  return {
    audioInputDevices$: new BehaviorSubject(opts.audioIn ?? []),
    videoInputDevices$: new BehaviorSubject(opts.videoIn ?? []),
    audioOutputDevices$: new BehaviorSubject(opts.audioOut ?? []),
    selectedAudioInputDevice$: new BehaviorSubject(opts.selAudioIn ?? null),
    selectedVideoInputDevice$: new BehaviorSubject(opts.selVideoIn ?? null),
    selectedAudioOutputDevice$: new BehaviorSubject(opts.selAudioOut ?? null),
    selectAudioInputDevice: vi.fn(),
    selectVideoInputDevice: vi.fn(),
    selectAudioOutputDevice: vi.fn(),
  };
}

async function mount(props: Partial<SwDeviceSelector> = {}): Promise<SwDeviceSelector> {
  const el = document.createElement('sw-device-selector') as SwDeviceSelector;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function getTrigger(el: SwDeviceSelector) {
  return el.shadowRoot!.querySelector('.trigger') as HTMLButtonElement;
}

describe('sw-device-selector', () => {
  let el: SwDeviceSelector | null = null;

  afterEach(() => { el?.remove(); el = null; });

  it('renders trigger button and label', async () => {
    el = await mount();
    expect(getTrigger(el)).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.label')!.textContent!.trim()).toBe('Devices');
  });

  it('trigger is disabled when no devices', async () => {
    el = await mount();
    expect(getTrigger(el).disabled).toBe(true);
  });

  it('trigger is enabled when devices are available', async () => {
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic')] });
    el = await mount({ deviceController: dc as any });
    expect(getTrigger(el).disabled).toBe(false);
  });

  it('panel is not shown initially', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('.panel')).toBeNull();
  });

  it('opens panel on trigger click', async () => {
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic')] });
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.panel')).toBeTruthy();
  });

  it('closes panel on second trigger click', async () => {
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic')] });
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    getTrigger(el).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.panel')).toBeNull();
  });

  it('closes panel on Escape key', async () => {
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic')] });
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    el.shadowRoot!.querySelector('.panel')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.panel')).toBeNull();
  });

  it('closes panel on outside click', async () => {
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic')] });
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.panel')).toBeNull();
  });

  it('renders microphone section with device items', async () => {
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic 1'), makeDevice('a2', 'Mic 2')] });
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    const items = el.shadowRoot!.querySelectorAll('.device-item');
    expect(items.length).toBe(2);
  });

  it('renders "No devices found" when section is empty', async () => {
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic')] });
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    const noDevice = el.shadowRoot!.querySelectorAll('.no-devices');
    expect(noDevice.length).toBeGreaterThan(0);
  });

  it('fires sw-device-change when mic is selected', async () => {
    const mic = makeDevice('a1', 'Mic 1');
    const dc = makeController({ audioIn: [mic] });
    el = await mount({ deviceController: dc as any });
    const handler = vi.fn();
    el.addEventListener('sw-device-change', handler);
    getTrigger(el).click();
    await el.updateComplete;
    (el.shadowRoot!.querySelector('.device-item') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].detail.type).toBe('microphone');
    expect(handler.mock.calls[0]![0].detail.device).toEqual(mic);
  });

  it('calls selectAudioInputDevice on controller when mic selected', async () => {
    const mic = makeDevice('a1', 'Mic 1');
    const dc = makeController({ audioIn: [mic] });
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    (el.shadowRoot!.querySelector('.device-item') as HTMLElement).click();
    expect(dc.selectAudioInputDevice).toHaveBeenCalledWith(mic);
  });

  it('fires sw-device-change when camera is selected', async () => {
    const cam = { ...makeDevice('v1', 'Cam 1'), kind: 'videoinput' as MediaDeviceKind };
    const dc = makeController({ videoIn: [cam] });
    el = await mount({ deviceController: dc as any });
    const handler = vi.fn();
    el.addEventListener('sw-device-change', handler);
    getTrigger(el).click();
    await el.updateComplete;
    (el.shadowRoot!.querySelector('.device-item') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].detail.type).toBe('camera');
  });

  it('fires sw-device-change when speaker is selected', async () => {
    const spk = { ...makeDevice('o1', 'Speaker 1'), kind: 'audiooutput' as MediaDeviceKind };
    const dc = makeController({ audioOut: [spk] });
    el = await mount({ deviceController: dc as any });
    const handler = vi.fn();
    el.addEventListener('sw-device-change', handler);
    getTrigger(el).click();
    await el.updateComplete;
    (el.shadowRoot!.querySelector('.device-item') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].detail.type).toBe('speaker');
  });

  it('marks selected device with selected class', async () => {
    const mic = makeDevice('a1', 'Mic 1');
    const dc = makeController({ audioIn: [mic], selAudioIn: mic });
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.device-item.selected')).toBeTruthy();
  });

  it('reflects show-preview attribute', async () => {
    el = await mount({ showPreview: true });
    expect(el.hasAttribute('show-preview')).toBe(true);
  });

  it('updates devices when observable emits', async () => {
    const subject = new BehaviorSubject<MediaDeviceInfo[]>([makeDevice('a1', 'Mic 1')]);
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic 1')] });
    (dc as any).audioInputDevices$ = subject;
    el = await mount({ deviceController: dc as any });
    getTrigger(el).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.device-item').length).toBe(1);
    subject.next([makeDevice('a1', 'Mic 1'), makeDevice('a2', 'Mic 2')]);
    await el.updateComplete;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.device-item').length).toBe(2);
  });

  it('re-subscribes when deviceController changes', async () => {
    const dc1 = makeController({ audioIn: [makeDevice('a1', 'Mic 1')] });
    el = await mount({ deviceController: dc1 as any });
    const dc2 = makeController({ audioIn: [makeDevice('b1', 'Mic B'), makeDevice('b2', 'Mic C')] });
    el.deviceController = dc2 as any;
    await el.updateComplete;
    await el.updateComplete;
    getTrigger(el).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.device-item').length).toBe(2);
  });

  it('removes document click listener on disconnect', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    el = await mount();
    el.remove();
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
    el = null;
    removeSpy.mockRestore();
  });

  it('aria-expanded reflects open state', async () => {
    const dc = makeController({ audioIn: [makeDevice('a1', 'Mic')] });
    el = await mount({ deviceController: dc as any });
    expect(getTrigger(el).getAttribute('aria-expanded')).toBe('false');
    getTrigger(el).click();
    await el.updateComplete;
    expect(getTrigger(el).getAttribute('aria-expanded')).toBe('true');
  });
});
