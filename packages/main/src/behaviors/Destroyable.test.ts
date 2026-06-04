import { describe, it, expect, vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';

import { Destroyable } from './Destroyable';

/**
 * Concrete subclass exposing Destroyable's protected methods for testing.
 */
class TestDestroyable extends Destroyable {
  public exposedCreateBehaviorSubject<T>(initial: T): BehaviorSubject<T> {
    return this.createBehaviorSubject(initial);
  }

  public exposedCreateSubject<T>() {
    return this.createSubject<T>();
  }

  public override destroy(): void {
    super.destroy();
  }
}

describe('Destroyable', () => {
  it('should complete all subjects on destroy', () => {
    const instance = new TestDestroyable();
    const subject1 = instance.exposedCreateBehaviorSubject<number>(0);
    const subject2 = instance.exposedCreateSubject<string>();

    const completedSpy1 = vi.fn();
    const completedSpy2 = vi.fn();
    subject1.subscribe({ complete: completedSpy1 });
    subject2.subscribe({ complete: completedSpy2 });

    instance.destroy();

    expect(completedSpy1).toHaveBeenCalled();
    expect(completedSpy2).toHaveBeenCalled();
  });

  it('should emit destroyed$ on destroy', () => {
    const instance = new TestDestroyable();

    const destroyedSpy = vi.fn();
    instance.destroyed$.subscribe({ next: destroyedSpy });

    instance.destroy();

    expect(destroyedSpy).toHaveBeenCalledOnce();
  });

  it('should unsubscribe all tracked subscriptions on destroy', () => {
    const instance = new TestDestroyable();
    const subject = instance.exposedCreateBehaviorSubject<number>(0);

    const nextSpy = vi.fn();
    subject.subscribe(nextSpy);
    nextSpy.mockClear(); // clear initial BehaviorSubject emission

    subject.next(1);
    expect(nextSpy).toHaveBeenCalledWith(1);

    instance.destroy();

    // After destroy, subjects are completed — no more emissions
    expect(subject.isStopped).toBe(true);
  });
});
