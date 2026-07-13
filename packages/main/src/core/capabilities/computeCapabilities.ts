import { DEFAULT_CALL_CAPABILITIES, DEFAULT_MEMBER_CAPABILITIES, DEFAULT_ON_OFF } from './types';

import type { CallCapabilitiesState, MemberCapabilities, OnOffCapability } from './types';

type MemberType = 'self' | 'member';

/**
 * Computes an on/off capability state from filtered flags
 *
 * Logic:
 * - `on` is true if any flag does NOT end with `.off`
 * - `off` is true if any flag does NOT end with `.on`
 *
 * This means parent permissions (without .on/.off suffix) grant both on and off
 */
function computeOnOffCapability(filteredFlags: string[]): OnOffCapability {
  if (filteredFlags.length === 0) {
    return DEFAULT_ON_OFF;
  }

  return {
    on: filteredFlags.some((flag) => !flag.endsWith('.off')),
    off: filteredFlags.some((flag) => !flag.endsWith('.on'))
  };
}

/**
 * Filters flags for a specific member capability with on/off support
 *
 * Matches:
 * - The member type itself (e.g., "self" grants all self capabilities)
 * - The parent capability (e.g., "self.mute" grants all mute capabilities)
 * - The specific capability and its on/off variants (e.g., "self.mute.audio*")
 */
function filterMemberOnOffFlags(
  flags: string[],
  memberType: MemberType,
  parent: string,
  capability: string
): string[] {
  return flags.filter(
    (flag) =>
      flag === memberType ||
      flag === `${memberType}.${parent}` ||
      flag.startsWith(`${memberType}.${parent}.${capability}`)
  );
}

/**
 * Checks if a boolean capability is granted
 *
 * Matches:
 * - The member type itself (e.g., "self" grants all self capabilities)
 * - The parent capability if provided (e.g., "self.microphone" grants volume and sensitivity)
 * - The specific capability (e.g., "self.microphone.volume.set")
 */
function hasBooleanCapability(
  flags: string[],
  memberType: MemberType,
  parent: string | null,
  capability: string
): boolean {
  return flags.some(
    (flag) =>
      flag === memberType ||
      (parent !== null && flag === `${memberType}.${parent}`) ||
      flag.startsWith(`${memberType}.${parent ? `${parent}.` : ''}${capability}`)
  );
}

/**
 * Computes member-level capabilities (self or member) from raw flags
 */
function computeMemberCapabilities(flags: string[], memberType: MemberType): MemberCapabilities {
  // Filter only flags relevant to this member type
  const memberFlags = flags.filter((flag) => flag.startsWith(memberType) || flag === memberType);

  if (memberFlags.length === 0) {
    return DEFAULT_MEMBER_CAPABILITIES;
  }

  return {
    muteAudio: computeOnOffCapability(filterMemberOnOffFlags(flags, memberType, 'mute', 'audio')),
    muteVideo: computeOnOffCapability(filterMemberOnOffFlags(flags, memberType, 'mute', 'video')),
    deaf: computeOnOffCapability(
      flags.filter((flag) => flag === memberType || flag.startsWith(`${memberType}.deaf`))
    ),
    raisehand: computeOnOffCapability(
      flags.filter((flag) => flag === memberType || flag.startsWith(`${memberType}.raisehand`))
    ),
    microphoneVolume: hasBooleanCapability(flags, memberType, 'microphone', 'volume'),
    microphoneSensitivity: hasBooleanCapability(flags, memberType, 'microphone', 'sensitivity'),
    speakerVolume: hasBooleanCapability(flags, memberType, 'speaker', 'volume'),
    position: hasBooleanCapability(flags, memberType, null, 'position'),
    meta: hasBooleanCapability(flags, memberType, null, 'meta'),
    remove: hasBooleanCapability(flags, memberType, null, 'remove'),
    audioFlags: hasBooleanCapability(flags, memberType, null, 'audioflags'),
    denoise: hasBooleanCapability(flags, memberType, null, 'denoise'),
    lowbitrate: hasBooleanCapability(flags, memberType, null, 'lowbitrate')
  };
}

/**
 * Computes all call capabilities from raw capability strings
 *
 * This is a pure function that transforms the raw capability strings
 * from the `call.joined` event into a structured capabilities state.
 *
 * @param capabilities - Raw capability strings from the server
 * @returns Computed capabilities state
 */
export function computeCapabilities(capabilities: string[]): CallCapabilitiesState {
  if (capabilities.length === 0) {
    return DEFAULT_CALL_CAPABILITIES;
  }

  return {
    self: computeMemberCapabilities(capabilities, 'self'),
    member: computeMemberCapabilities(capabilities, 'member'),
    end: capabilities.some((cap) => cap === 'end'),
    setLayout: capabilities.some((cap) => cap.startsWith('layout')),
    sendDigit: capabilities.some((cap) => cap.startsWith('digit')),
    vmutedHide: computeOnOffCapability(capabilities.filter((flag) => flag.startsWith('vmuted'))),
    lock: computeOnOffCapability(capabilities.filter((flag) => flag.startsWith('lock'))),
    device: capabilities.some((cap) => cap === 'device'),
    screenshare: capabilities.some((cap) => cap === 'screenshare')
  };
}
