import { distinctUntilChanged, map } from 'rxjs';

import { computeCapabilities } from './computeCapabilities';
import { DEFAULT_CALL_CAPABILITIES } from './types';
import { Destroyable } from '../../behaviors/Destroyable';

import type { CallCapabilitiesState, MemberCapabilities, OnOffCapability } from './types';
import type { Observable } from 'rxjs';

/**
 * SelfCapabilities manages the capability state for the self participant.
 *
 * Capabilities are received from the server via `call.joined` events and determine
 * what actions the current participant is allowed to perform.
 *
 * Each capability is exposed as both:
 * - An observable (e.g., `end$`) for reactive state management
 * - A synchronous getter (e.g., `end`) for immediate access
 *
 * Member-level capabilities are accessed via the grouped `self` / `member` accessors:
 * - `capabilities.self.muteAudio` (sync)
 * - `capabilities.self$` (observable)
 *
 * When a new `call.joined` event is received, the capabilities state is
 * completely replaced (not merged).
 */
export class SelfCapabilities extends Destroyable {
  private _state$ = this.createBehaviorSubject<CallCapabilitiesState>(DEFAULT_CALL_CAPABILITIES);

  /**
   * Updates the capabilities state from raw capability strings.
   * This completely replaces the current state.
   *
   * @param capabilities - Raw capability strings from the server
   * @internal
   */
  public updateFromRaw(capabilities: string[]): void {
    const newState = computeCapabilities(capabilities);
    this._state$.next(newState);
  }

  // ============================================
  // Self member capabilities
  // ============================================

  /** Observable for self member capabilities */
  public get self$(): Observable<MemberCapabilities> {
    return this.cachedObservable('self$', () =>
      this._state$.pipe(
        map((state) => state.self),
        distinctUntilChanged()
      )
    );
  }

  /** Current self member capabilities */
  public get self(): MemberCapabilities {
    return this._state$.value.self;
  }

  // ============================================
  // Member capabilities (other participants)
  // ============================================

  /** Observable for other member capabilities */
  public get member$(): Observable<MemberCapabilities> {
    return this.cachedObservable('member$', () =>
      this._state$.pipe(
        map((state) => state.member),
        distinctUntilChanged()
      )
    );
  }

  /** Current other member capabilities */
  public get member(): MemberCapabilities {
    return this._state$.value.member;
  }

  // ============================================
  // Call-level capabilities
  // ============================================

  /** Observable for end call capability */
  public get end$(): Observable<boolean> {
    return this.cachedObservable('end$', () =>
      this._state$.pipe(
        map((state) => state.end),
        distinctUntilChanged()
      )
    );
  }

  /** Current end call capability */
  public get end(): boolean {
    return this._state$.value.end;
  }

  /** Observable for set layout capability */
  public get setLayout$(): Observable<boolean> {
    return this.cachedObservable('setLayout$', () =>
      this._state$.pipe(
        map((state) => state.setLayout),
        distinctUntilChanged()
      )
    );
  }

  /** Current set layout capability */
  public get setLayout(): boolean {
    return this._state$.value.setLayout;
  }

  /** Observable for send digit capability */
  public get sendDigit$(): Observable<boolean> {
    return this.cachedObservable('sendDigit$', () =>
      this._state$.pipe(
        map((state) => state.sendDigit),
        distinctUntilChanged()
      )
    );
  }

  /** Current send digit capability */
  public get sendDigit(): boolean {
    return this._state$.value.sendDigit;
  }

  /** Observable for vmuted hide capability */
  public get vmutedHide$(): Observable<OnOffCapability> {
    return this.cachedObservable('vmutedHide$', () =>
      this._state$.pipe(
        map((state) => state.vmutedHide),
        distinctUntilChanged()
      )
    );
  }

  /** Current vmuted hide capability */
  public get vmutedHide(): OnOffCapability {
    return this._state$.value.vmutedHide;
  }

  /** Observable for lock capability */
  public get lock$(): Observable<OnOffCapability> {
    return this.cachedObservable('lock$', () =>
      this._state$.pipe(
        map((state) => state.lock),
        distinctUntilChanged()
      )
    );
  }

  /** Current lock capability */
  public get lock(): OnOffCapability {
    return this._state$.value.lock;
  }

  /** Observable for device capability */
  public get device$(): Observable<boolean> {
    return this.cachedObservable('device$', () =>
      this._state$.pipe(
        map((state) => state.device),
        distinctUntilChanged()
      )
    );
  }

  /** Current device capability */
  public get device(): boolean {
    return this._state$.value.device;
  }

  /** Observable for screenshare capability */
  public get screenshare$(): Observable<boolean> {
    return this.cachedObservable('screenshare$', () =>
      this._state$.pipe(
        map((state) => state.screenshare),
        distinctUntilChanged()
      )
    );
  }

  /** Current screenshare capability */
  public get screenshare(): boolean {
    return this._state$.value.screenshare;
  }

  // ============================================
  // Full state access
  // ============================================

  /** Observable for the full capabilities state */
  public get state$(): Observable<CallCapabilitiesState> {
    return this._state$.asObservable();
  }

  /** Current full capabilities state */
  public get state(): CallCapabilitiesState {
    return this._state$.value;
  }
}
