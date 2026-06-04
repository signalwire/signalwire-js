import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import './sw-ui-alert.js';
import { showPrompt, type SwUiAlert } from './sw-ui-alert.js';

beforeEach(() => {
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

afterEach(() => {
  document.body.querySelectorAll('sw-ui-alert').forEach((n) => n.remove());
});

const queryButton = (el: SwUiAlert, klass: 'accept' | 'reject') =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`button.${klass}`);

describe('sw-ui-alert', () => {
  it('confirm prompt: clicking Accept resolves true', async () => {
    const promise = showPrompt({ title: 'Delete?', type: 'confirm' });
    // Wait a microtask for the element to be appended and rendered.
    await Promise.resolve();
    const el = document.body.querySelector('sw-ui-alert') as SwUiAlert;
    await el.updateComplete;

    queryButton(el, 'accept')!.click();
    await expect(promise).resolves.toBe(true);
    expect(document.body.querySelector('sw-ui-alert')).toBeNull();
  });

  it('confirm prompt: clicking Reject resolves false', async () => {
    const promise = showPrompt({ title: 'Delete?', type: 'confirm' });
    await Promise.resolve();
    const el = document.body.querySelector('sw-ui-alert') as SwUiAlert;
    await el.updateComplete;

    queryButton(el, 'reject')!.click();
    await expect(promise).resolves.toBe(false);
  });

  it('alert prompt: only renders OK and resolves true when clicked', async () => {
    const promise = showPrompt({ title: 'Heads up', type: 'alert' });
    await Promise.resolve();
    const el = document.body.querySelector('sw-ui-alert') as SwUiAlert;
    await el.updateComplete;

    expect(queryButton(el, 'reject')).toBeNull();
    queryButton(el, 'accept')!.click();
    await expect(promise).resolves.toBe(true);
  });

  it('renders the title and description on the prompt', async () => {
    const promise = showPrompt({
      title: 'Confirm action',
      description: 'This cannot be undone.',
      type: 'confirm',
    });
    await Promise.resolve();
    const el = document.body.querySelector('sw-ui-alert') as SwUiAlert;
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.title')!.textContent).toBe('Confirm action');
    expect(el.shadowRoot!.querySelector('.body')!.textContent).toContain('This cannot be undone.');

    queryButton(el, 'reject')!.click();
    await promise;
  });

  it('removes the element from the DOM after resolving', async () => {
    const p = showPrompt({ title: 'x', type: 'alert' });
    await Promise.resolve();
    const el = document.body.querySelector('sw-ui-alert') as SwUiAlert;
    await el.updateComplete;
    queryButton(el, 'accept')!.click();
    await p;
    expect(document.body.querySelector('sw-ui-alert')).toBeNull();
  });
});
