import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisibilityController } from './VisibilityController';
import type { VisibilityState, VisibilityChangeEvent } from './VisibilityController';

describe('VisibilityController', () => {
  let controller: VisibilityController;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Ensure document.visibilityState starts as 'visible'
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true
    });

    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    controller = new VisibilityController();
  });

  afterEach(() => {
    controller.destroy();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('initialization', () => {
    it('should register a visibilitychange listener on document', () => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should start with current visibility state', () => {
      expect(controller.visibility).toBe('visible');
    });

    it('should start with hidden when document is hidden', () => {
      controller.destroy();

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true
      });

      const hiddenController = new VisibilityController();
      expect(hiddenController.visibility).toBe('hidden');
      hiddenController.destroy();
    });
  });

  describe('visibility$ observable', () => {
    it('should emit current state on subscribe', () => {
      const states: VisibilityState[] = [];
      controller.visibility$.subscribe((state) => states.push(state));

      expect(states).toHaveLength(1);
      expect(states[0]).toBe('visible');
    });

    it('should emit new state when visibility changes', () => {
      const states: VisibilityState[] = [];
      controller.visibility$.subscribe((state) => states.push(state));

      // Simulate visibility change to hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(states).toHaveLength(2);
      expect(states[1]).toBe('hidden');
    });

    it('should emit on multiple visibility changes', () => {
      const states: VisibilityState[] = [];
      controller.visibility$.subscribe((state) => states.push(state));

      // visible -> hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // hidden -> visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(states).toEqual(['visible', 'hidden', 'visible']);
    });

    it('should not emit duplicate states', () => {
      const states: VisibilityState[] = [];
      controller.visibility$.subscribe((state) => states.push(state));

      // Dispatch event without changing visibilityState (stays visible)
      document.dispatchEvent(new Event('visibilitychange'));

      expect(states).toHaveLength(1);
      expect(states[0]).toBe('visible');
    });
  });

  describe('visibilityChange$ observable', () => {
    it('should not emit on initial subscribe (no replay)', () => {
      const changes: VisibilityChangeEvent[] = [];
      controller.visibilityChange$.subscribe((event) => changes.push(event));

      expect(changes).toHaveLength(0);
    });

    it('should emit transition events on visibility change', () => {
      const changes: VisibilityChangeEvent[] = [];
      controller.visibilityChange$.subscribe((event) => changes.push(event));

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(changes).toHaveLength(1);
      expect(changes[0].from).toBe('visible');
      expect(changes[0].to).toBe('hidden');
      expect(typeof changes[0].timestamp).toBe('number');
      expect(changes[0].timestamp).toBeGreaterThan(0);
    });

    it('should emit correct transition details for multiple changes', () => {
      const changes: VisibilityChangeEvent[] = [];
      controller.visibilityChange$.subscribe((event) => changes.push(event));

      // visible -> hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // hidden -> visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(changes).toHaveLength(2);
      expect(changes[0].from).toBe('visible');
      expect(changes[0].to).toBe('hidden');
      expect(changes[1].from).toBe('hidden');
      expect(changes[1].to).toBe('visible');
    });
  });

  describe('destroy()', () => {
    it('should remove the visibilitychange listener', () => {
      controller.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should stop emitting on visibility$ after destroy', () => {
      const states: VisibilityState[] = [];
      controller.visibility$.subscribe((state) => states.push(state));

      controller.destroy();

      // Try to trigger a visibility change after destroy
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should only have the initial 'visible' emission
      expect(states).toHaveLength(1);
    });

    it('should complete visibilityChange$ on destroy', () => {
      let completed = false;
      controller.visibilityChange$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      controller.destroy();
      expect(completed).toBe(true);
    });
  });

  describe('non-browser environment safety', () => {
    it('should handle missing document gracefully', () => {
      controller.destroy();

      const originalDocument = globalThis.document;
      // @ts-expect-error - intentionally setting to undefined for non-browser test
      globalThis.document = undefined;

      const nbController = new VisibilityController();
      expect(nbController.visibility).toBe('visible');

      nbController.destroy();
      globalThis.document = originalDocument;
    });
  });
});
