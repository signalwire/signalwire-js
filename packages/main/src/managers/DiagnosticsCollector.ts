import { Destroyable } from '../behaviors/Destroyable';
import { getLogger } from '../utils/logger';

import type { Observable } from 'rxjs';

const logger = getLogger();

/** Default maximum number of diagnostic events to retain in the ring buffer. */
const DEFAULT_MAX_EVENTS = 1000;

/**
 * Categories for diagnostic events, covering the main areas of SDK operation.
 */
export type DiagnosticCategory = 'connection' | 'call' | 'device' | 'recovery' | 'error';

/**
 * A single diagnostic event recorded during a session.
 */
export interface DiagnosticEvent {
  readonly timestamp: number;
  readonly category: DiagnosticCategory;
  readonly event: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Summary of a single call for diagnostic export.
 */
export interface CallDiagnosticSummary {
  readonly callId: string;
  readonly direction: 'inbound' | 'outbound';
  readonly destination?: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly duration: number;
  readonly finalStatus: string;
  readonly avgQualityScore?: number;
  readonly minQualityScore?: number;
  readonly recoveryAttempts: number;
  readonly iceCandidateTypes: string[];
}

/**
 * Structured diagnostic bundle exported for support/debugging.
 */
export interface SessionDiagnostics {
  readonly sdkVersion: string;
  readonly userAgent: string;
  readonly exportedAt: number;
  readonly events: readonly DiagnosticEvent[];
  readonly calls: readonly CallDiagnosticSummary[];
  readonly deviceChanges: readonly DiagnosticEvent[];
}

/**
 * Options for constructing a DiagnosticsCollector.
 */
export interface DiagnosticsCollectorOptions {
  /** SDK version string to include in exports. */
  readonly sdkVersion: string;
  /** Maximum number of events to retain in the ring buffer. Defaults to 1000. */
  readonly maxEvents?: number;
  /** Optional callback to retrieve the current device list. */
  readonly getDevices?: () => MediaDeviceInfo[];
}

/**
 * Returns the user agent string, safely handling non-browser environments.
 */
function getUserAgent(): string {
  try {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return navigator.userAgent;
    }
  } catch {
    // Non-browser environment
  }
  return 'unknown';
}

/**
 * DiagnosticsCollector maintains a ring buffer of diagnostic events
 * for structured export. It records connection, call, device, recovery,
 * and error events during a session, and can serialize them into a
 * plain object for support tickets or debugging.
 *
 * Extends Destroyable for lifecycle management.
 */
export class DiagnosticsCollector extends Destroyable {
  private _events: DiagnosticEvent[] = [];
  private _calls: CallDiagnosticSummary[] = [];
  private _deviceChanges: DiagnosticEvent[] = [];
  private readonly _sdkVersion: string;
  private readonly _maxEvents: number;

  private readonly _eventRecorded$ = this.createSubject<DiagnosticEvent>();

  constructor(options: DiagnosticsCollectorOptions) {
    super();
    this._sdkVersion = options.sdkVersion;
    this._maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;

    logger.debug('DiagnosticsCollector initialized', {
      sdkVersion: this._sdkVersion,
      maxEvents: this._maxEvents
    });
  }

  /**
   * Observable that emits each time a diagnostic event is recorded.
   */
  public get eventRecorded$(): Observable<DiagnosticEvent> {
    return this._eventRecorded$.asObservable();
  }

  /**
   * Record a diagnostic event into the ring buffer.
   *
   * @param category - The event category (connection, call, device, recovery, error).
   * @param event - A short description of the event.
   * @param details - Optional additional details as a key-value map.
   */
  public record(
    category: DiagnosticCategory,
    event: string,
    details?: Record<string, unknown>
  ): void {
    const entry: DiagnosticEvent = {
      timestamp: Date.now(),
      category,
      event,
      ...(details !== undefined ? { details } : {})
    };

    this._events = this._appendToBuffer(this._events, entry);
    this._eventRecorded$.next(entry);
  }

  /**
   * Shorthand to record a device change event.
   *
   * @param event - Description of the device change.
   * @param details - Optional additional details.
   */
  public recordDeviceChange(event: string, details?: Record<string, unknown>): void {
    const entry: DiagnosticEvent = {
      timestamp: Date.now(),
      category: 'device',
      event,
      ...(details !== undefined ? { details } : {})
    };

    this._deviceChanges = this._appendToBuffer(this._deviceChanges, entry);
    this._events = this._appendToBuffer(this._events, entry);
    this._eventRecorded$.next(entry);
  }

  /**
   * Record a call summary for diagnostic export.
   *
   * @param summary - The call diagnostic summary to add.
   */
  public recordCallSummary(summary: CallDiagnosticSummary): void {
    this._calls = this._appendCallToBuffer(this._calls, summary);

    this.record('call', 'call_summary', {
      callId: summary.callId,
      direction: summary.direction,
      duration: summary.duration,
      finalStatus: summary.finalStatus
    });
  }

  /**
   * Export the current diagnostic buffer as a structured plain object.
   * This can be JSON.stringify'd and attached to support tickets.
   */
  public export(): SessionDiagnostics {
    return {
      sdkVersion: this._sdkVersion,
      userAgent: getUserAgent(),
      exportedAt: Date.now(),
      events: [...this._events],
      calls: [...this._calls],
      deviceChanges: [...this._deviceChanges]
    };
  }

  /**
   * Clear all diagnostic buffers, resetting to empty state.
   */
  public clear(): void {
    this._events = [];
    this._calls = [];
    this._deviceChanges = [];
    logger.debug('DiagnosticsCollector buffers cleared');
  }

  public override destroy(): void {
    logger.debug('DiagnosticsCollector destroyed');
    super.destroy();
  }
  /**
   * Append an entry to a buffer array, enforcing the max size via ring buffer semantics.
   * Returns a new array (immutable pattern).
   */
  private _appendToBuffer(buffer: DiagnosticEvent[], entry: DiagnosticEvent): DiagnosticEvent[] {
    const updated = [...buffer, entry];
    if (updated.length > this._maxEvents) {
      return updated.slice(updated.length - this._maxEvents);
    }
    return updated;
  }

  /**
   * Append a call summary to the calls buffer, enforcing max size.
   * Returns a new array (immutable pattern).
   */
  private _appendCallToBuffer(
    buffer: CallDiagnosticSummary[],
    entry: CallDiagnosticSummary
  ): CallDiagnosticSummary[] {
    const updated = [...buffer, entry];
    if (updated.length > this._maxEvents) {
      return updated.slice(updated.length - this._maxEvents);
    }
    return updated;
  }
}
