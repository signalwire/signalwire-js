import { describe, it, expect, afterEach, vi } from 'vitest';
import './sw-ui-dropup.js';
import type { SwUiDropup, DropUpItem } from './sw-ui-dropup.js';

async function mount(props: Partial<SwUiDropup> = {}): Promise<SwUiDropup> {
  const el = document.createElement('sw-ui-dropup') as SwUiDropup;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('sw-ui-dropup', () => {
  let el: SwUiDropup | null = null;
  afterEach(() => { el?.remove(); el = null; });

  it('hides the menu when closed and shows it when open', async () => {
    el = await mount({
      items: [{ id: 'a', label: 'A' }] as DropUpItem[],
    });
    let menu = el.shadowRoot!.querySelector('.menu')!;
    expect(menu.classList.contains('open')).toBe(false);

    el.open = true;
    await el.updateComplete;
    menu = el.shadowRoot!.querySelector('.menu')!;
    expect(menu.classList.contains('open')).toBe(true);
  });

  it('renders one button per item with the correct label', async () => {
    el = await mount({
      open: true,
      items: [{ id: 'a', label: 'Apple' }, { id: 'b', label: 'Berry' }] as DropUpItem[],
    });
    const labels = Array.from(
      el.shadowRoot!.querySelectorAll('button')
    ).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Apple', 'Berry']);
  });

  it('emits sw-dropup-select with the picked item and marks it selected', async () => {
    el = await mount({
      open: true,
      items: [{ id: 'a', label: 'Apple' }, { id: 'b', label: 'Berry' }] as DropUpItem[],
    });
    const fn = vi.fn();
    el.addEventListener('sw-dropup-select', fn as EventListener);

    el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')[1]!.click();

    const ev = fn.mock.calls[0]![0] as CustomEvent;
    expect(ev.detail).toMatchObject({ id: 'b', label: 'Berry', selected: true });
    await el.updateComplete;
    const items = el.items as DropUpItem[];
    expect(items[0]!.selected).toBe(false);
    expect(items[1]!.selected).toBe(true);
  });

  it('emits sw-dropup-close on outside click; does not emit on inside click', async () => {
    el = await mount({
      open: true,
      items: [{ id: 'a', label: 'A' }] as DropUpItem[],
    });
    const fn = vi.fn();
    el.addEventListener('sw-dropup-close', fn as EventListener);

    // click inside
    const inside = new MouseEvent('mousedown', { bubbles: true, composed: true });
    el.shadowRoot!.querySelector('button')!.dispatchEvent(inside);
    expect(fn).not.toHaveBeenCalled();

    // click outside
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    expect(fn).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it('treats an `anchor` element as inside for outside-click', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);

    el = await mount({
      open: true,
      anchor,
      items: [{ id: 'a', label: 'A' }] as DropUpItem[],
    });
    const fn = vi.fn();
    el.addEventListener('sw-dropup-close', fn as EventListener);

    anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    expect(fn).not.toHaveBeenCalled();
    anchor.remove();
  });

  it('accepts plain string items and normalizes them to {id,label}', async () => {
    el = await mount({ open: true, items: ['Solo'] });
    const fn = vi.fn();
    el.addEventListener('sw-dropup-select', fn as EventListener);
    el.shadowRoot!.querySelector<HTMLButtonElement>('button')!.click();
    expect((fn.mock.calls[0]![0] as CustomEvent).detail).toMatchObject({ id: 'Solo', label: 'Solo' });
  });
});
