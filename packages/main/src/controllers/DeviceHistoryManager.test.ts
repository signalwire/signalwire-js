import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceHistoryManager } from './DeviceHistoryManager';

/**
 * Creates a fake MediaDeviceInfo for testing.
 */
const makeDevice = (
  id: string,
  label: string,
  kind: MediaDeviceKind = 'audioinput',
  groupId = `group-${id}`
): MediaDeviceInfo =>
  ({
    deviceId: id,
    label,
    kind,
    groupId,
    toJSON: () => ({})
  }) as MediaDeviceInfo;

describe('DeviceHistoryManager', () => {
  let manager: DeviceHistoryManager;

  beforeEach(() => {
    manager = new DeviceHistoryManager();
  });

  describe('push()', () => {
    it('should add a device to the history stack', () => {
      const mic = makeDevice('mic-1', 'Built-in Mic');
      manager.push('audioinput', mic);

      const history = manager.getHistory('audioinput');
      expect(history).toHaveLength(1);
      expect(history[0].deviceId).toBe('mic-1');
      expect(history[0].label).toBe('Built-in Mic');
    });

    it('should keep the most recent device at the top', () => {
      const mic1 = makeDevice('mic-1', 'Built-in Mic');
      const mic2 = makeDevice('mic-2', 'AirPods Pro');

      manager.push('audioinput', mic1);
      manager.push('audioinput', mic2);

      const history = manager.getHistory('audioinput');
      expect(history).toHaveLength(2);
      expect(history[0].deviceId).toBe('mic-2');
      expect(history[1].deviceId).toBe('mic-1');
    });

    it('should not duplicate if device is already at the top', () => {
      const mic = makeDevice('mic-1', 'Built-in Mic');

      manager.push('audioinput', mic);
      manager.push('audioinput', mic);

      expect(manager.getHistory('audioinput')).toHaveLength(1);
    });

    it('should deduplicate and move existing entry to top', () => {
      const mic1 = makeDevice('mic-1', 'Built-in Mic');
      const mic2 = makeDevice('mic-2', 'AirPods Pro');
      const mic3 = makeDevice('mic-3', 'USB Mic');

      manager.push('audioinput', mic1);
      manager.push('audioinput', mic2);
      manager.push('audioinput', mic3);

      // Push mic1 again -- should move to top
      manager.push('audioinput', mic1);

      const history = manager.getHistory('audioinput');
      expect(history).toHaveLength(3);
      expect(history[0].deviceId).toBe('mic-1');
      expect(history[1].deviceId).toBe('mic-3');
      expect(history[2].deviceId).toBe('mic-2');
    });

    it('should cap at max 5 entries per kind', () => {
      for (let i = 0; i < 8; i++) {
        manager.push('audioinput', makeDevice(`mic-${i}`, `Mic ${i}`));
      }

      const history = manager.getHistory('audioinput');
      expect(history).toHaveLength(5);
      // Most recent should be at the top
      expect(history[0].deviceId).toBe('mic-7');
    });

    it('should maintain separate stacks per kind', () => {
      const mic = makeDevice('mic-1', 'Built-in Mic', 'audioinput');
      const speaker = makeDevice('speaker-1', 'Built-in Speaker', 'audiooutput');
      const camera = makeDevice('cam-1', 'FaceTime HD', 'videoinput');

      manager.push('audioinput', mic);
      manager.push('audiooutput', speaker);
      manager.push('videoinput', camera);

      expect(manager.getHistory('audioinput')).toHaveLength(1);
      expect(manager.getHistory('audiooutput')).toHaveLength(1);
      expect(manager.getHistory('videoinput')).toHaveLength(1);
      expect(manager.getHistory('audioinput')[0].deviceId).toBe('mic-1');
      expect(manager.getHistory('audiooutput')[0].deviceId).toBe('speaker-1');
      expect(manager.getHistory('videoinput')[0].deviceId).toBe('cam-1');
    });
  });

  describe('pop()', () => {
    it('should return the most recent device and remove it', () => {
      const mic1 = makeDevice('mic-1', 'Built-in Mic');
      const mic2 = makeDevice('mic-2', 'AirPods Pro');

      manager.push('audioinput', mic1);
      manager.push('audioinput', mic2);

      const popped = manager.pop('audioinput');
      expect(popped?.deviceId).toBe('mic-2');
      expect(manager.getHistory('audioinput')).toHaveLength(1);
      expect(manager.getHistory('audioinput')[0].deviceId).toBe('mic-1');
    });

    it('should return undefined when stack is empty', () => {
      expect(manager.pop('audioinput')).toBeUndefined();
    });

    it('should allow sequential pops to walk the stack', () => {
      const mic1 = makeDevice('mic-1', 'Built-in Mic');
      const mic2 = makeDevice('mic-2', 'AirPods Pro');
      const mic3 = makeDevice('mic-3', 'USB Mic');

      manager.push('audioinput', mic1);
      manager.push('audioinput', mic2);
      manager.push('audioinput', mic3);

      expect(manager.pop('audioinput')?.deviceId).toBe('mic-3');
      expect(manager.pop('audioinput')?.deviceId).toBe('mic-2');
      expect(manager.pop('audioinput')?.deviceId).toBe('mic-1');
      expect(manager.pop('audioinput')).toBeUndefined();
    });
  });

  describe('findInHistory()', () => {
    it('should find a device by exact deviceId match', () => {
      const mic1 = makeDevice('mic-1', 'Built-in Mic');
      const mic2 = makeDevice('mic-2', 'AirPods Pro');

      manager.push('audioinput', mic1);
      manager.push('audioinput', mic2);

      const available = [makeDevice('mic-1', 'Built-in Mic')];
      const found = manager.findInHistory('audioinput', available);

      expect(found?.deviceId).toBe('mic-1');
    });

    it('should prefer the most recent match', () => {
      const mic1 = makeDevice('mic-1', 'Built-in Mic');
      const mic2 = makeDevice('mic-2', 'AirPods Pro');

      manager.push('audioinput', mic1);
      manager.push('audioinput', mic2);

      // Both are available
      const available = [makeDevice('mic-1', 'Built-in Mic'), makeDevice('mic-2', 'AirPods Pro')];
      const found = manager.findInHistory('audioinput', available);

      // mic-2 is more recent
      expect(found?.deviceId).toBe('mic-2');
    });

    it('should find a device by groupId + label match when deviceId changes', () => {
      const originalMic = makeDevice('mic-old-id', 'AirPods Pro', 'audioinput', 'group-airpods');
      manager.push('audioinput', originalMic);

      // Same physical device with a new deviceId after browser update
      const newMic = makeDevice('mic-new-id', 'AirPods Pro', 'audioinput', 'group-airpods');
      const available = [newMic];

      const found = manager.findInHistory('audioinput', available);
      expect(found?.deviceId).toBe('mic-new-id');
    });

    it('should return undefined when no match is found', () => {
      const mic = makeDevice('mic-1', 'Built-in Mic');
      manager.push('audioinput', mic);

      const available = [makeDevice('mic-other', 'USB Mic')];
      const found = manager.findInHistory('audioinput', available);

      expect(found).toBeUndefined();
    });

    it('should return undefined when history is empty', () => {
      const available = [makeDevice('mic-1', 'Built-in Mic')];
      expect(manager.findInHistory('audioinput', available)).toBeUndefined();
    });

    it('should return undefined when available devices list is empty', () => {
      const mic = makeDevice('mic-1', 'Built-in Mic');
      manager.push('audioinput', mic);

      expect(manager.findInHistory('audioinput', [])).toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should reset all stacks', () => {
      manager.push('audioinput', makeDevice('mic-1', 'Mic', 'audioinput'));
      manager.push('audiooutput', makeDevice('speaker-1', 'Speaker', 'audiooutput'));
      manager.push('videoinput', makeDevice('cam-1', 'Camera', 'videoinput'));

      manager.clear();

      expect(manager.getHistory('audioinput')).toHaveLength(0);
      expect(manager.getHistory('audiooutput')).toHaveLength(0);
      expect(manager.getHistory('videoinput')).toHaveLength(0);
    });

    it('should allow push after clear', () => {
      manager.push('audioinput', makeDevice('mic-1', 'Mic'));
      manager.clear();
      manager.push('audioinput', makeDevice('mic-2', 'Mic 2'));

      expect(manager.getHistory('audioinput')).toHaveLength(1);
      expect(manager.getHistory('audioinput')[0].deviceId).toBe('mic-2');
    });
  });

  describe('getHistory()', () => {
    it('should return empty array for kind with no history', () => {
      expect(manager.getHistory('audioinput')).toEqual([]);
      expect(manager.getHistory('audiooutput')).toEqual([]);
      expect(manager.getHistory('videoinput')).toEqual([]);
    });

    it('should include all stored fields', () => {
      const mic = makeDevice('mic-1', 'Built-in Mic', 'audioinput', 'group-builtin');
      manager.push('audioinput', mic);

      const entry = manager.getHistory('audioinput')[0];
      expect(entry).toEqual({
        deviceId: 'mic-1',
        label: 'Built-in Mic',
        groupId: 'group-builtin',
        kind: 'audioinput'
      });
    });
  });
});
