import { describe, it, expect, afterEach, vi } from 'vitest';
import './sw-ui-split-button.js';
import type { SwUiSplitButton } from './sw-ui-split-button.js';

async function mount(opts: {
  items?: SwUiSplitButton['items'];
  active?: boolean;
  toggleSlots?: boolean;
}): Promise<SwUiSplitButton> {
  const el = document.createElement('sw-ui-split-button') as SwUiSplitButton;
  if (opts.items) el.items = opts.items;
  if (opts.active !== undefined) el.active = opts.active;
  if (opts.toggleSlots) {
    const a = document.createElement('span');
    a.setAttribute('slot', 'active');
    a.textContent = 'on';
    const i = document.createElement('span');
    i.setAttribute('slot', 'inactive');
    i.textContent = 'off';
    el.append(a, i);
  } else {
    const def = document.createElement('span');
    def.textContent = 'go';
    el.append(def);
  }
  document.body.appendChild(el);
  await el.updateComplete;
  // Slot detection happens after initial slotchange; happy-dom is unreliable
  // on this, so prime the named-slot state explicitly when the test asks for it.
  if (opts.toggleSlots) {
    (el as unknown as { _hasNamedSlots: boolean })._hasNamedSlots = true;
    el.requestUpdate();
    await el.updateComplete;
  }
  return el;
}

describe('sw-ui-split-button', () => {
  let el: SwUiSplitButton | null = null;
  afterEach(() => { el?.remove(); el = null; });

  it('renders as a solo pill with no chevron when items is empty', async () => {
    el = await mount({});
    expect(el.shadowRoot!.querySelector('.solo')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.chevron')).toBeNull();
  });

  it('renders as a split pill with main + chevron when items is non-empty', async () => {
    el = await mount({ items: [{ id: 'a', label: 'A' }] });
    expect(el.shadowRoot!.querySelector('.pill')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.main')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.chevron')).toBeTruthy();
  });

  it('push mode (default slot only): emits sw-split-button-click and does not flip active', async () => {
    el = await mount({});
    const fn = vi.fn();
    el.addEventListener('sw-split-button-click', fn as EventListener);

    el.shadowRoot!.querySelector<HTMLButtonElement>('.solo')!.click();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(el.active).toBe(false);
  });

  it('toggle mode (active/inactive slots): flips state and emits sw-split-button-toggle with the new value', async () => {
    el = await mount({ toggleSlots: true });
    const fn = vi.fn();
    el.addEventListener('sw-split-button-toggle', fn as EventListener);

    el.shadowRoot!.querySelector<HTMLButtonElement>('.solo')!.click();
    expect(el.active).toBe(true);
    expect((fn.mock.calls[0]![0] as CustomEvent).detail).toBe(true);

    el.shadowRoot!.querySelector<HTMLButtonElement>('.solo')!.click();
    expect(el.active).toBe(false);
    expect((fn.mock.calls[1]![0] as CustomEvent).detail).toBe(false);
  });

  it('chevron click toggles the embedded sw-ui-dropup open state', async () => {
    el = await mount({ items: [{ id: 'a', label: 'A' }] });
    const dropup = el.shadowRoot!.querySelector('sw-ui-dropup') as HTMLElement & { open: boolean };
    expect(dropup.open).toBe(false);

    el.shadowRoot!.querySelector<HTMLButtonElement>('.chevron')!.click();
    await el.updateComplete;
    expect(dropup.open).toBe(true);
  });

  it('updates `selected` flags on items when the dropup picks one', async () => {
    el = await mount({
      items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    });
    // The listener is wired on the embedded sw-ui-dropup, so dispatch from there.
    const dropup = el.shadowRoot!.querySelector('sw-ui-dropup')!;
    dropup.dispatchEvent(new CustomEvent('sw-dropup-select', {
      detail: { id: 'b', label: 'B' },
      bubbles: true, composed: true,
    }));
    await el.updateComplete;
    const items = el.items as { id: string; selected?: boolean }[];
    expect(items.find((i) => i.id === 'a')?.selected).toBe(false);
    expect(items.find((i) => i.id === 'b')?.selected).toBe(true);
  });
});
