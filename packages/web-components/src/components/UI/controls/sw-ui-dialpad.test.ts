import { describe, it, expect, afterEach, vi } from 'vitest';
import './sw-ui-dialpad.js';
import type { SwUiDialpad } from './sw-ui-dialpad.js';

async function mount(props: Partial<SwUiDialpad> = {}): Promise<SwUiDialpad> {
  const el = document.createElement('sw-ui-dialpad') as SwUiDialpad;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function keyButtons(el: SwUiDialpad): HTMLButtonElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.keypad .key'));
}

function input(el: SwUiDialpad): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('.display-input')!;
}

const detailAt = (fn: ReturnType<typeof vi.fn>, i: number): unknown =>
  (fn.mock.calls[i]![0] as CustomEvent).detail;

describe('sw-ui-dialpad', () => {
  let el: SwUiDialpad | null = null;
  afterEach(() => { el?.remove(); el = null; });

  it('renders 12 keys in standard telephone order', async () => {
    el = await mount();
    const labels = Array.from(keyButtons(el)).map((b) =>
      b.querySelector('.key-digit')?.textContent
    );
    expect(labels).toEqual(['1','2','3','4','5','6','7','8','9','*','0','#']);
  });

  it('emits sw-digit-press with the running buffer when a key is clicked', async () => {
    el = await mount();
    const onPress = vi.fn();
    el.addEventListener('sw-digit-press', onPress as EventListener);

    const keys = keyButtons(el);
    keys[0]!.click();
    keys[1]!.click();

    expect(onPress).toHaveBeenCalledTimes(2);
    expect(detailAt(onPress, 0)).toEqual({ digit: '1', digits: '1' });
    expect(detailAt(onPress, 1)).toEqual({ digit: '2', digits: '12' });
    await el.updateComplete;
    expect(input(el).value).toBe('12');
  });

  it('emits sw-dialpad-backspace and trims the buffer; ignores when empty', async () => {
    el = await mount();
    const onBack = vi.fn();
    el.addEventListener('sw-dialpad-backspace', onBack as EventListener);

    keyButtons(el)[0]!.click(); // '1'
    keyButtons(el)[1]!.click(); // '2'
    await el.updateComplete;

    const backspace = el.shadowRoot!.querySelector<HTMLButtonElement>('.backspace-button')!;
    backspace.click();
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(detailAt(onBack, 0)).toEqual({ digits: '1' });

    backspace.click();
    backspace.click(); // buffer empty — should be a no-op
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('emits sw-dial only when the buffer is non-empty and the call button is shown', async () => {
    el = await mount({ showCallButton: true });
    const onDial = vi.fn();
    el.addEventListener('sw-dial', onDial as EventListener);

    let callBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.call-button')!;
    expect(callBtn.disabled).toBe(true);
    callBtn.click();
    expect(onDial).not.toHaveBeenCalled();

    keyButtons(el)[0]!.click();
    keyButtons(el)[1]!.click();
    keyButtons(el)[2]!.click();
    await el.updateComplete;

    callBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.call-button')!;
    callBtn.click();
    expect(onDial).toHaveBeenCalledTimes(1);
    expect(detailAt(onDial, 0)).toEqual({ digits: '123' });
  });

  it('does not render the call button when showCallButton is false', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('.call-button')).toBeNull();
  });

  it('keyboard: DTMF keys append; Backspace deletes; printable letters are blocked', async () => {
    el = await mount();
    const onPress = vi.fn();
    el.addEventListener('sw-digit-press', onPress as EventListener);
    const dispatch = (key: string) =>
      input(el!).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

    dispatch('1');
    dispatch('5');
    dispatch('a'); // blocked
    dispatch('Backspace');

    expect(onPress).toHaveBeenCalledTimes(2);
    await el.updateComplete;
    expect(input(el).value).toBe('1');
  });

  it('keyboard: Enter dials when call button is shown and buffer is non-empty', async () => {
    el = await mount({ showCallButton: true });
    const onDial = vi.fn();
    el.addEventListener('sw-dial', onDial as EventListener);
    keyButtons(el)[6]!.click(); // '7'
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onDial).toHaveBeenCalledTimes(1);
  });

  it('long-press on the 0 key inserts a "+" and suppresses the click', async () => {
    vi.useFakeTimers();
    try {
      el = await mount();
      const onPress = vi.fn();
      el.addEventListener('sw-digit-press', onPress as EventListener);

      const zero = keyButtons(el).find(
        (b) => b.querySelector('.key-digit')?.textContent === '0'
      )!;
      zero.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(600);
      zero.dispatchEvent(new Event('pointerup', { bubbles: true }));
      zero.click(); // simulated by browser after pointerup — must be suppressed

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(detailAt(onPress, 0)).toEqual({ digit: '+', digits: '+' });
      await el.updateComplete;
      expect(input(el).value).toBe('+');
    } finally {
      vi.useRealTimers();
    }
  });

  it('short-press on the 0 key inserts a "0" (long-press timer cancelled)', async () => {
    vi.useFakeTimers();
    try {
      el = await mount();
      const onPress = vi.fn();
      el.addEventListener('sw-digit-press', onPress as EventListener);

      const zero = keyButtons(el).find(
        (b) => b.querySelector('.key-digit')?.textContent === '0'
      )!;
      zero.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(100);
      zero.dispatchEvent(new Event('pointerup', { bubbles: true }));
      zero.click();
      vi.advanceTimersByTime(600); // ensure no late firing

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(detailAt(onPress, 0)).toEqual({ digit: '0', digits: '0' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('long-press on the backspace clears the entire buffer', async () => {
    vi.useFakeTimers();
    try {
      el = await mount();
      keyButtons(el)[0]!.click();
      keyButtons(el)[1]!.click();
      keyButtons(el)[2]!.click();
      await el.updateComplete;

      const onBack = vi.fn();
      el.addEventListener('sw-dialpad-backspace', onBack as EventListener);

      const backspace = el.shadowRoot!.querySelector<HTMLButtonElement>('.backspace-button')!;
      backspace.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(600);
      backspace.dispatchEvent(new Event('pointerup', { bubbles: true }));
      backspace.click(); // suppressed

      expect(onBack).toHaveBeenCalledTimes(1);
      expect(detailAt(onBack, 0)).toEqual({ digits: '' });
      await el.updateComplete;
      expect(input(el).value).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('allow-text: input event emits sw-dialpad-input with the typed value', async () => {
    el = await mount({ allowText: true });
    const onInput = vi.fn();
    el.addEventListener('sw-dialpad-input', onInput as EventListener);

    input(el).value = 'sip:foo@bar';
    input(el).dispatchEvent(new Event('input', { bubbles: true }));

    expect(onInput).toHaveBeenCalledTimes(1);
    expect(detailAt(onInput, 0)).toEqual({ digits: 'sip:foo@bar' });
  });
});
