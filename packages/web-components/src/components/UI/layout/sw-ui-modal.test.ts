import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import './sw-ui-modal.js';
import type { SwUiModal } from './sw-ui-modal.js';

async function mount(props: Partial<SwUiModal> = {}): Promise<SwUiModal> {
  const el = document.createElement('sw-ui-modal') as SwUiModal;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function dialog(el: SwUiModal): HTMLDialogElement {
  return el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;
}

beforeEach(() => {
  // happy-dom doesn't implement showModal/close — stub them on the prototype.
  if (!(HTMLDialogElement.prototype as any).__stubbed) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      value: function () { (this as any).open = true; },
      writable: true, configurable: true,
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      value: function () { (this as any).open = false; },
      writable: true, configurable: true,
    });
    (HTMLDialogElement.prototype as any).__stubbed = true;
  }
});

describe('sw-ui-modal', () => {
  let el: SwUiModal | null = null;
  afterEach(() => {
    el?.remove();
    el = null;
    document.body.style.overflow = '';
  });

  it('opens the underlying <dialog> when `open` flips to true and locks body scroll', async () => {
    el = await mount();
    expect(dialog(el).open).toBeFalsy();

    el.open = true;
    await el.updateComplete;
    expect(dialog(el).open).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('fires a cancelable sw-modal-close on ESC and closes when not prevented', async () => {
    el = await mount({ open: true });
    const fn = vi.fn();
    el.addEventListener('sw-modal-close', fn as EventListener);

    const cancel = new Event('cancel', { cancelable: true });
    dialog(el).dispatchEvent(cancel);

    expect(fn).toHaveBeenCalledTimes(1);
    expect((fn.mock.calls[0]![0] as Event).cancelable).toBe(true);
    expect(el.open).toBe(false);
  });

  it('lets a listener prevent ESC close via preventDefault()', async () => {
    el = await mount({ open: true });
    el.addEventListener('sw-modal-close', (e) => e.preventDefault());

    dialog(el).dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(el.open).toBe(true);
  });

  it('treats a click directly on the <dialog> (the backdrop) as a close request', async () => {
    el = await mount({ open: true });
    const fn = vi.fn();
    el.addEventListener('sw-modal-close', fn as EventListener);

    const evt = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(evt, 'target', { value: dialog(el) });
    dialog(el).dispatchEvent(evt);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(el.open).toBe(false);
  });

  it('ignores clicks on slotted content (target is not the dialog itself)', async () => {
    el = await mount({ open: true });
    const child = document.createElement('button');
    el.appendChild(child);
    await el.updateComplete;

    const fn = vi.fn();
    el.addEventListener('sw-modal-close', fn as EventListener);

    const evt = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(evt, 'target', { value: child });
    dialog(el).dispatchEvent(evt);

    expect(fn).not.toHaveBeenCalled();
    expect(el.open).toBe(true);
  });
});
