import { describe, it, expect, afterEach, vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';

vi.mock('./UI/icons/sw-ui-icon.js', () => ({}));

import './sw-directory.js';
import type { SwDirectory, Address, DirectoryService } from './sw-directory.js';

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    name: 'Alice',
    displayName: 'Alice Smith',
    type: 'person',
    channels: { audio: true, video: true },
    ...overrides,
  };
}

function makeDirectory(addresses: Address[] = [], opts: {
  loading?: boolean;
  hasMore?: boolean;
  loadMore?: () => Promise<void>;
} = {}): DirectoryService {
  return {
    addresses$: new BehaviorSubject(addresses),
    loading$: new BehaviorSubject(opts.loading ?? false),
    hasMore$: new BehaviorSubject(opts.hasMore ?? false),
    loadMore: opts.loadMore ?? vi.fn().mockResolvedValue(undefined),
  };
}

async function mount(props: Partial<SwDirectory> = {}): Promise<SwDirectory> {
  const el = document.createElement('sw-directory') as SwDirectory;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('sw-directory', () => {
  let el: SwDirectory | null = null;

  afterEach(() => { el?.remove(); el = null; });

  it('renders container and search input', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('.container')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.search-input')).toBeTruthy();
  });

  it('shows "No addresses found" when no directory', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('.empty')!.textContent!.trim()).toBe('No addresses found');
  });

  it('shows "Loading..." when loading with no addresses', async () => {
    const dir = makeDirectory([], { loading: true });
    el = await mount({ directory: dir });
    expect(el.shadowRoot!.querySelector('.loading')!.textContent!.trim()).toBe('Loading...');
  });

  it('renders address items from directory', async () => {
    const addresses = [makeAddress(), makeAddress({ id: 'addr-2', name: 'Bob', displayName: 'Bob Jones' })];
    const dir = makeDirectory(addresses);
    el = await mount({ directory: dir });
    const items = el.shadowRoot!.querySelectorAll('.item');
    expect(items.length).toBe(2);
  });

  it('renders address displayName', async () => {
    const dir = makeDirectory([makeAddress({ displayName: 'Alice Smith' })]);
    el = await mount({ directory: dir });
    expect(el.shadowRoot!.querySelector('.item-name')!.textContent!.trim()).toBe('Alice Smith');
  });

  it('renders address name when no displayName', async () => {
    const dir = makeDirectory([makeAddress({ displayName: undefined, name: 'alice' })]);
    el = await mount({ directory: dir });
    expect(el.shadowRoot!.querySelector('.item-name')!.textContent!.trim()).toBe('alice');
  });

  it('renders address type', async () => {
    const dir = makeDirectory([makeAddress({ type: 'room' })]);
    el = await mount({ directory: dir });
    expect(el.shadowRoot!.querySelector('.item-type')!.textContent!.trim()).toBe('room');
  });

  it('renders dial button per item', async () => {
    const dir = makeDirectory([makeAddress(), makeAddress({ id: 'addr-2', name: 'Bob' })]);
    el = await mount({ directory: dir });
    expect(el.shadowRoot!.querySelectorAll('.dial-button').length).toBe(2);
  });

  it('fires sw-address-select on item click', async () => {
    const addr = makeAddress();
    const dir = makeDirectory([addr]);
    el = await mount({ directory: dir });
    const handler = vi.fn();
    el.addEventListener('sw-address-select', handler);
    (el.shadowRoot!.querySelector('.item') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].detail.address).toEqual(addr);
  });

  it('adds selected class on item click', async () => {
    const dir = makeDirectory([makeAddress()]);
    el = await mount({ directory: dir });
    (el.shadowRoot!.querySelector('.item') as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.item')!.classList.contains('selected')).toBe(true);
  });

  it('fires sw-dial on dial button click', async () => {
    const addr = makeAddress();
    const dir = makeDirectory([addr]);
    el = await mount({ directory: dir });
    const handler = vi.fn();
    el.addEventListener('sw-dial', handler);
    (el.shadowRoot!.querySelector('.dial-button') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].detail.address).toEqual(addr);
  });

  it('dial button click does not bubble to item click', async () => {
    const addr = makeAddress();
    const dir = makeDirectory([addr]);
    el = await mount({ directory: dir });
    const selectHandler = vi.fn();
    el.addEventListener('sw-address-select', selectHandler);
    (el.shadowRoot!.querySelector('.dial-button') as HTMLElement).click();
    expect(selectHandler).not.toHaveBeenCalled();
  });

  it('fires sw-dial on item double-click', async () => {
    const addr = makeAddress();
    const dir = makeDirectory([addr]);
    el = await mount({ directory: dir });
    const handler = vi.fn();
    el.addEventListener('sw-dial', handler);
    const item = el.shadowRoot!.querySelector('.item') as HTMLElement;
    item.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls loadMore on connect', async () => {
    const loadMore = vi.fn().mockResolvedValue(undefined);
    const dir = makeDirectory([], { loadMore });
    el = await mount({ directory: dir });
    expect(loadMore).toHaveBeenCalled();
  });

  it('filters addresses by search query', async () => {
    vi.useFakeTimers();
    const addresses = [
      makeAddress({ id: '1', name: 'Alice', displayName: 'Alice Smith' }),
      makeAddress({ id: '2', name: 'Bob', displayName: 'Bob Jones' }),
    ];
    const dir = makeDirectory(addresses);
    el = await mount({ directory: dir });
    const input = el.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
    input.value = 'alice';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(200);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.item').length).toBe(1);
    expect(el.shadowRoot!.querySelector('.item-name')!.textContent!.trim()).toBe('Alice Smith');
    vi.useRealTimers();
  });

  it('shows empty state when search finds nothing', async () => {
    vi.useFakeTimers();
    const dir = makeDirectory([makeAddress({ name: 'Alice' })]);
    el = await mount({ directory: dir });
    const input = el.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
    input.value = 'xyz';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(200);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.empty')).toBeTruthy();
    vi.useRealTimers();
  });

  it('updates when directory observable emits new addresses', async () => {
    const subject = new BehaviorSubject<Address[]>([]);
    const dir: DirectoryService = { addresses$: subject, loadMore: vi.fn().mockResolvedValue(undefined) };
    el = await mount({ directory: dir });
    expect(el.shadowRoot!.querySelectorAll('.item').length).toBe(0);
    subject.next([makeAddress()]);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.item').length).toBe(1);
  });

  it('cleans up subscriptions and re-subscribes on directory change', async () => {
    const dir1 = makeDirectory([makeAddress({ id: '1', name: 'Alpha' })]);
    el = await mount({ directory: dir1 });
    expect(el.shadowRoot!.querySelectorAll('.item').length).toBe(1);

    const dir2 = makeDirectory([makeAddress({ id: '2', name: 'Beta' }), makeAddress({ id: '3', name: 'Gamma' })]);
    el.directory = dir2;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.item').length).toBe(2);
  });

  it('unsubscribes on disconnect', async () => {
    const subject = new BehaviorSubject<Address[]>([]);
    const dir: DirectoryService = { addresses$: subject, loadMore: vi.fn().mockResolvedValue(undefined) };
    el = await mount({ directory: dir });
    el.remove();
    subject.next([makeAddress()]);
    // Element is detached; no error and no DOM update
    el = null;
  });

  it('renders listbox role', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('[role="listbox"]')).toBeTruthy();
  });

  it('renders option role per item', async () => {
    const dir = makeDirectory([makeAddress(), makeAddress({ id: 'addr-2', name: 'Bob' })]);
    el = await mount({ directory: dir });
    const options = el.shadowRoot!.querySelectorAll('[role="option"]');
    expect(options.length).toBe(2);
  });

  it('sets aria-selected on selected item', async () => {
    const dir = makeDirectory([makeAddress()]);
    el = await mount({ directory: dir });
    (el.shadowRoot!.querySelector('.item') as HTMLElement).click();
    await el.updateComplete;
    const option = el.shadowRoot!.querySelector('[role="option"]');
    expect(option!.getAttribute('aria-selected')).toBe('true');
  });
});
