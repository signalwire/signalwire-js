import { takeUntil } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { getLogger } from '../utils/logger';

import type { Observable } from 'rxjs';

const logger = getLogger();

/**
 * Visibility state of the document tab.
 */
export type VisibilityState = 'visible' | 'hidden';

/**
 * Event emitted when the document visibility changes.
 */
export interface VisibilityChangeEvent {
  readonly from: VisibilityState;
  readonly to: VisibilityState;
  readonly timestamp: number;
}

/**
 * Checks whether the document visibility API is available.
 */
function isVisibilityApiAvailable(): boolean {
  try {
    return (
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function' &&
      typeof document.visibilityState === 'string'
    );
  } catch {
    return false;
  }
}

/**
 * Returns the current document visibility state, defaulting to 'visible'
 * in non-browser environments.
 */
function getCurrentVisibility(): VisibilityState {
  try {
    if (typeof document !== 'undefined' && typeof document.visibilityState === 'string') {
      return document.visibilityState === 'visible' ? 'visible' : 'hidden';
    }
  } catch {
    // Non-browser environment
  }
  return 'visible';
}

/**
 * VisibilityController tracks browser tab visibility state and exposes
 * it as RxJS observables. Safe for use in non-browser environments
 * where the document API is not available.
 *
 * Extends Destroyable for lifecycle management and automatic cleanup.
 */
export class VisibilityController extends Destroyable {
  private readonly _visibility$ =
    this.createBehaviorSubject<VisibilityState>(getCurrentVisibility());

  private readonly _visibilityChange$ = this.createSubject<VisibilityChangeEvent>();

  private readonly _boundHandler: () => void;
  private readonly _hasVisibilityApi: boolean;

  constructor() {
    super();

    this._hasVisibilityApi = isVisibilityApiAvailable();
    this._boundHandler = this._handleVisibilityChange.bind(this);

    if (this._hasVisibilityApi) {
      document.addEventListener('visibilitychange', this._boundHandler);
      logger.debug('VisibilityController: listening for visibilitychange events');
    } else {
      logger.debug(
        'VisibilityController: document visibility API not available, defaulting to visible'
      );
    }
  }

  /**
   * Observable of the current visibility state.
   * Emits 'visible' or 'hidden'. Always starts with the current state.
   */
  public get visibility$(): Observable<VisibilityState> {
    return this._visibility$.pipe(takeUntil(this._destroyed$));
  }

  /**
   * The current visibility state value.
   */
  public get visibility(): VisibilityState {
    return this._visibility$.value;
  }

  /**
   * Observable that emits transition events when visibility changes.
   * Each event includes the previous state, new state, and timestamp.
   */
  public get visibilityChange$(): Observable<VisibilityChangeEvent> {
    return this._visibilityChange$.pipe(takeUntil(this._destroyed$));
  }

  public override destroy(): void {
    if (this._hasVisibilityApi) {
      document.removeEventListener('visibilitychange', this._boundHandler);
      logger.debug('VisibilityController: removed visibilitychange listener');
    }
    super.destroy();
  }
  /**
   * Handle the browser's visibilitychange event.
   */
  private _handleVisibilityChange(): void {
    const newState = getCurrentVisibility();
    const previousState = this._visibility$.value;

    if (newState === previousState) {
      return;
    }

    this._visibility$.next(newState);

    const changeEvent: VisibilityChangeEvent = {
      from: previousState,
      to: newState,
      timestamp: Date.now()
    };

    this._visibilityChange$.next(changeEvent);

    logger.debug('VisibilityController: visibility changed', {
      from: previousState,
      to: newState
    });
  }
}
