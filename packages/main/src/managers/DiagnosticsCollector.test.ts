import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiagnosticsCollector } from './DiagnosticsCollector';
import type {
  DiagnosticEvent,
  CallDiagnosticSummary,
  SessionDiagnostics
} from './DiagnosticsCollector';

describe('DiagnosticsCollector', () => {
  let collector: DiagnosticsCollector;

  beforeEach(() => {
    collector = new DiagnosticsCollector({
      sdkVersion: '4.0.0-test'
    });
  });

  afterEach(() => {
    collector.destroy();
  });

  describe('record()', () => {
    it('should record events that appear in export', () => {
      collector.record('connection', 'ws_connected', { url: 'wss://test.example.com' });
      collector.record('call', 'call_started', { callId: 'abc-123' });

      const result = collector.export();

      expect(result.events).toHaveLength(2);
      expect(result.events[0].category).toBe('connection');
      expect(result.events[0].event).toBe('ws_connected');
      expect(result.events[0].details).toEqual({ url: 'wss://test.example.com' });
      expect(result.events[1].category).toBe('call');
      expect(result.events[1].event).toBe('call_started');
    });

    it('should include timestamp on recorded events', () => {
      const before = Date.now();
      collector.record('error', 'something_failed');
      const after = Date.now();

      const result = collector.export();
      expect(result.events[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(result.events[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should record events without details when not provided', () => {
      collector.record('recovery', 'ice_restart_started');

      const result = collector.export();
      expect(result.events[0].details).toBeUndefined();
    });

    it('should emit recorded events on eventRecorded$ observable', () => {
      const recorded: DiagnosticEvent[] = [];
      collector.eventRecorded$.subscribe((event) => recorded.push(event));

      collector.record('connection', 'ws_connected');
      collector.record('error', 'timeout');

      expect(recorded).toHaveLength(2);
      expect(recorded[0].event).toBe('ws_connected');
      expect(recorded[1].event).toBe('timeout');
    });
  });

  describe('ring buffer', () => {
    it('should cap events at max entries', () => {
      const smallCollector = new DiagnosticsCollector({
        sdkVersion: '4.0.0-test',
        maxEvents: 5
      });

      for (let i = 0; i < 10; i++) {
        smallCollector.record('connection', `event_${i}`);
      }

      const result = smallCollector.export();
      expect(result.events).toHaveLength(5);
      // Should retain the most recent entries
      expect(result.events[0].event).toBe('event_5');
      expect(result.events[4].event).toBe('event_9');

      smallCollector.destroy();
    });

    it('should use default max of 1000 when not specified', () => {
      for (let i = 0; i < 1005; i++) {
        collector.record('connection', `event_${i}`);
      }

      const result = collector.export();
      expect(result.events).toHaveLength(1000);
      expect(result.events[0].event).toBe('event_5');
      expect(result.events[999].event).toBe('event_1004');
    });

    it('should cap device changes in their own buffer', () => {
      const smallCollector = new DiagnosticsCollector({
        sdkVersion: '4.0.0-test',
        maxEvents: 3
      });

      for (let i = 0; i < 5; i++) {
        smallCollector.recordDeviceChange(`device_change_${i}`);
      }

      const result = smallCollector.export();
      expect(result.deviceChanges).toHaveLength(3);
      expect(result.deviceChanges[0].event).toBe('device_change_2');
      expect(result.deviceChanges[2].event).toBe('device_change_4');

      smallCollector.destroy();
    });
  });

  describe('recordCallSummary()', () => {
    it('should add call summaries to export', () => {
      const summary: CallDiagnosticSummary = {
        callId: 'call-001',
        direction: 'outbound',
        destination: '/public/test-room',
        startTime: 1000,
        endTime: 61000,
        duration: 60000,
        finalStatus: 'disconnected',
        avgQualityScore: 4.2,
        minQualityScore: 3.1,
        recoveryAttempts: 1,
        iceCandidateTypes: ['host', 'srflx']
      };

      collector.recordCallSummary(summary);

      const result = collector.export();
      expect(result.calls).toHaveLength(1);
      expect(result.calls[0]).toEqual(summary);
    });

    it('should also record a call_summary event in the events buffer', () => {
      const summary: CallDiagnosticSummary = {
        callId: 'call-002',
        direction: 'inbound',
        startTime: 2000,
        duration: 30000,
        finalStatus: 'connected',
        recoveryAttempts: 0,
        iceCandidateTypes: ['relay']
      };

      collector.recordCallSummary(summary);

      const result = collector.export();
      expect(result.events).toHaveLength(1);
      expect(result.events[0].category).toBe('call');
      expect(result.events[0].event).toBe('call_summary');
      expect(result.events[0].details).toEqual({
        callId: 'call-002',
        direction: 'inbound',
        duration: 30000,
        finalStatus: 'connected'
      });
    });

    it('should accumulate multiple call summaries', () => {
      const makeSummary = (id: string): CallDiagnosticSummary => ({
        callId: id,
        direction: 'outbound',
        startTime: Date.now(),
        duration: 5000,
        finalStatus: 'disconnected',
        recoveryAttempts: 0,
        iceCandidateTypes: []
      });

      collector.recordCallSummary(makeSummary('call-a'));
      collector.recordCallSummary(makeSummary('call-b'));
      collector.recordCallSummary(makeSummary('call-c'));

      const result = collector.export();
      expect(result.calls).toHaveLength(3);
      expect(result.calls.map((c) => c.callId)).toEqual(['call-a', 'call-b', 'call-c']);
    });
  });

  describe('recordDeviceChange()', () => {
    it('should record device changes in the deviceChanges buffer', () => {
      collector.recordDeviceChange('microphone_disconnected', {
        deviceId: 'mic-123',
        label: 'Built-in Microphone'
      });

      const result = collector.export();
      expect(result.deviceChanges).toHaveLength(1);
      expect(result.deviceChanges[0].category).toBe('device');
      expect(result.deviceChanges[0].event).toBe('microphone_disconnected');
      expect(result.deviceChanges[0].details).toEqual({
        deviceId: 'mic-123',
        label: 'Built-in Microphone'
      });
    });

    it('should also add device changes to the main events buffer', () => {
      collector.recordDeviceChange('camera_connected');

      const result = collector.export();
      expect(result.events).toHaveLength(1);
      expect(result.events[0].category).toBe('device');
      expect(result.events[0].event).toBe('camera_connected');
    });

    it('should emit on eventRecorded$ for device changes', () => {
      const recorded: DiagnosticEvent[] = [];
      collector.eventRecorded$.subscribe((event) => recorded.push(event));

      collector.recordDeviceChange('speaker_switched');

      expect(recorded).toHaveLength(1);
      expect(recorded[0].event).toBe('speaker_switched');
    });
  });

  describe('clear()', () => {
    it('should reset all buffers', () => {
      collector.record('connection', 'ws_connected');
      collector.record('error', 'timeout');
      collector.recordDeviceChange('mic_disconnected');
      collector.recordCallSummary({
        callId: 'call-x',
        direction: 'outbound',
        startTime: 1000,
        duration: 5000,
        finalStatus: 'disconnected',
        recoveryAttempts: 0,
        iceCandidateTypes: []
      });

      collector.clear();

      const result = collector.export();
      expect(result.events).toHaveLength(0);
      expect(result.calls).toHaveLength(0);
      expect(result.deviceChanges).toHaveLength(0);
    });

    it('should allow recording again after clear', () => {
      collector.record('connection', 'first');
      collector.clear();
      collector.record('connection', 'second');

      const result = collector.export();
      expect(result.events).toHaveLength(1);
      expect(result.events[0].event).toBe('second');
    });
  });

  describe('export()', () => {
    it('should return correct structure with all fields', () => {
      collector.record('connection', 'ws_connected');
      collector.recordDeviceChange('mic_connected');
      collector.recordCallSummary({
        callId: 'call-z',
        direction: 'inbound',
        startTime: 1000,
        duration: 10000,
        finalStatus: 'connected',
        recoveryAttempts: 0,
        iceCandidateTypes: ['host']
      });

      const result = collector.export();

      expect(result.sdkVersion).toBe('4.0.0-test');
      expect(typeof result.userAgent).toBe('string');
      expect(typeof result.exportedAt).toBe('number');
      expect(result.exportedAt).toBeGreaterThan(0);
      expect(Array.isArray(result.events)).toBe(true);
      expect(Array.isArray(result.calls)).toBe(true);
      expect(Array.isArray(result.deviceChanges)).toBe(true);
    });

    it('should include sdkVersion from constructor', () => {
      const customCollector = new DiagnosticsCollector({
        sdkVersion: '4.1.0-beta.2'
      });

      const result = customCollector.export();
      expect(result.sdkVersion).toBe('4.1.0-beta.2');

      customCollector.destroy();
    });

    it('should return a snapshot (not a live reference)', () => {
      collector.record('connection', 'event_1');
      const firstExport = collector.export();

      collector.record('connection', 'event_2');
      const secondExport = collector.export();

      expect(firstExport.events).toHaveLength(1);
      expect(secondExport.events).toHaveLength(2);
    });

    it('should return empty arrays when nothing has been recorded', () => {
      const result = collector.export();
      expect(result.events).toHaveLength(0);
      expect(result.calls).toHaveLength(0);
      expect(result.deviceChanges).toHaveLength(0);
    });

    it('should be JSON-serializable', () => {
      collector.record('connection', 'ws_connected', { url: 'wss://example.com' });
      collector.recordDeviceChange('mic_added', { deviceId: 'mic-1' });
      collector.recordCallSummary({
        callId: 'call-json',
        direction: 'outbound',
        destination: '/public/test',
        startTime: 1000,
        endTime: 11000,
        duration: 10000,
        finalStatus: 'disconnected',
        avgQualityScore: 4.0,
        minQualityScore: 3.5,
        recoveryAttempts: 2,
        iceCandidateTypes: ['host', 'relay']
      });

      const result = collector.export();
      const serialized = JSON.stringify(result);
      const parsed = JSON.parse(serialized) as SessionDiagnostics;

      expect(parsed.sdkVersion).toBe('4.0.0-test');
      // 3 events: connection + device change + call_summary (auto-recorded by recordCallSummary)
      expect(parsed.events).toHaveLength(3);
      expect(parsed.calls).toHaveLength(1);
      expect(parsed.deviceChanges).toHaveLength(1);
    });
  });

  describe('non-browser environment', () => {
    it('should handle missing navigator gracefully', () => {
      const originalNavigator = globalThis.navigator;
      // @ts-expect-error - intentionally setting to undefined to test non-browser env
      globalThis.navigator = undefined;

      const nbCollector = new DiagnosticsCollector({
        sdkVersion: '4.0.0-test'
      });

      const result = nbCollector.export();
      expect(result.userAgent).toBe('unknown');

      nbCollector.destroy();
      globalThis.navigator = originalNavigator;
    });
  });

  describe('destroy()', () => {
    it('should complete the eventRecorded$ observable on destroy', () => {
      let completed = false;
      collector.eventRecorded$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      collector.destroy();
      expect(completed).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Issue 17: _calls array should be capped at maxEvents
  // -----------------------------------------------------------------------

  describe('calls ring buffer (Issue 17)', () => {
    it('should cap call summaries at maxEvents', () => {
      const smallCollector = new DiagnosticsCollector({
        sdkVersion: '4.0.0-test',
        maxEvents: 3
      });

      for (let i = 0; i < 5; i++) {
        smallCollector.recordCallSummary({
          callId: `call-${i}`,
          direction: 'outbound',
          startTime: 1000 + i,
          duration: 5000,
          finalStatus: 'disconnected',
          recoveryAttempts: 0,
          iceCandidateTypes: []
        });
      }

      const result = smallCollector.export();
      expect(result.calls).toHaveLength(3);
      // Should retain the most recent entries
      expect(result.calls[0].callId).toBe('call-2');
      expect(result.calls[2].callId).toBe('call-4');

      smallCollector.destroy();
    });
  });
});
