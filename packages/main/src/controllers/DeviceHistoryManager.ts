/**
 * DeviceHistoryManager - Maintains a per-kind stack of recently used devices.
 *
 * When a device disappears during a call, the SDK uses this history to fall
 * back to the previously used device rather than picking an arbitrary default.
 * This handles the common scenario of AirPods disconnecting and the user
 * expecting to return to their built-in microphone.
 *
 * This is a pure data structure -- it does not extend Destroyable since it
 * holds no subscriptions or subjects.
 *
 * @see Section 5.2 of the Implementation Guide
 */

/** Maximum number of entries retained per device kind. */
const MAX_HISTORY_SIZE = 5;

/** Device kinds tracked by the history manager. */
type DeviceKind = 'audioinput' | 'audiooutput' | 'videoinput';

/**
 * Serializable subset of MediaDeviceInfo stored in the history stack.
 *
 * The browser's MediaDeviceInfo is not serializable, so we store only the
 * fields needed for matching.
 */
interface HistoryEntry {
  readonly deviceId: string;
  readonly label: string;
  readonly groupId: string;
  readonly kind: DeviceKind;
}

/**
 * Converts a MediaDeviceInfo to a serializable HistoryEntry.
 */
const toHistoryEntry = (device: MediaDeviceInfo, kind: DeviceKind): HistoryEntry => ({
  deviceId: device.deviceId,
  label: device.label,
  groupId: device.groupId,
  kind
});

export class DeviceHistoryManager {
  private readonly _stacks: Record<DeviceKind, HistoryEntry[]> = {
    audioinput: [],
    audiooutput: [],
    videoinput: []
  };

  /**
   * Push a device onto the history stack for the given kind.
   *
   * If the device is already at the top of the stack, this is a no-op.
   * Duplicate entries deeper in the stack are removed to keep the stack clean.
   * The stack is capped at {@link MAX_HISTORY_SIZE} entries.
   *
   * @param kind - The device kind (audioinput, audiooutput, videoinput)
   * @param device - The MediaDeviceInfo to record
   */
  public push(kind: DeviceKind, device: MediaDeviceInfo): void {
    const entry = toHistoryEntry(device, kind);
    const current = this._stacks[kind];

    // Skip if the device is already at the top
    if (current.length > 0 && current[0].deviceId === entry.deviceId) {
      return;
    }

    // Remove any existing entry for this device (dedup)
    const filtered = current.filter((e) => e.deviceId !== entry.deviceId);

    // Prepend the new entry and cap at MAX_HISTORY_SIZE
    this._stacks[kind] = [entry, ...filtered].slice(0, MAX_HISTORY_SIZE);
  }

  /**
   * Pop the most recent device from the history stack for the given kind.
   *
   * @param kind - The device kind
   * @returns The most recent HistoryEntry, or undefined if the stack is empty
   */
  public pop(kind: DeviceKind): HistoryEntry | undefined {
    const current = this._stacks[kind];

    if (current.length === 0) {
      return undefined;
    }

    const [top, ...rest] = current;
    this._stacks[kind] = rest;
    return top;
  }

  /**
   * Find the most recent device in the history that is still present in the
   * available device list.
   *
   * Searches the history stack from most recent to oldest. A device is
   * considered a match if its deviceId or (groupId + label) match an
   * available device.
   *
   * @param kind - The device kind
   * @param availableDevices - The current list of available devices
   * @returns The matching MediaDeviceInfo from availableDevices, or undefined
   */
  public findInHistory(
    kind: DeviceKind,
    availableDevices: readonly MediaDeviceInfo[]
  ): MediaDeviceInfo | undefined {
    const history = this._stacks[kind];

    for (const entry of history) {
      // Exact deviceId match
      const exactMatch = availableDevices.find((d) => d.deviceId === entry.deviceId);
      if (exactMatch) {
        return exactMatch;
      }

      // groupId + label match (same physical device, ID may have changed)
      const groupMatch = availableDevices.find(
        (d) => d.groupId === entry.groupId && d.label === entry.label
      );
      if (groupMatch) {
        return groupMatch;
      }
    }

    return undefined;
  }

  /**
   * Return a read-only snapshot of the history stack for a given kind.
   *
   * @param kind - The device kind
   * @returns A read-only array of HistoryEntry objects, most recent first
   */
  public getHistory(kind: DeviceKind): readonly HistoryEntry[] {
    return this._stacks[kind];
  }

  /**
   * Clear all history stacks.
   */
  public clear(): void {
    this._stacks.audioinput = [];
    this._stacks.audiooutput = [];
    this._stacks.videoinput = [];
  }
}
