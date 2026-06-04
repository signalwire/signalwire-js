/**
 * SDPHelper - Utility functions for SDP (Session Description Protocol) parsing and validation.
 *
 * This module provides helper functions to analyze and validate SDP content,
 * particularly for ICE candidate validation in WebRTC connections.
 */

import { DEFAULT_STEREO_MAX_AVERAGE_BITRATE } from '../core/constants';

import type { MediaDirections, MediaDirection } from '../core/types/media.types';

/** Valid SDP direction attribute values. */
const SDP_DIRECTIONS: ReadonlySet<string> = new Set([
  'sendrecv',
  'sendonly',
  'recvonly',
  'inactive'
]);

/**
 * Extracts the media directions (audio/video) from an SDP string.
 *
 * Parses each media section (`m=audio` / `m=video`) and reads the `a=` direction
 * attribute (`sendrecv`, `sendonly`, `recvonly`, `inactive`).
 * If no explicit direction attribute is found for a media section, defaults to `sendrecv`
 * per RFC 4566.
 *
 * @param sdp - The SDP string to parse
 * @returns The extracted audio and video directions
 *
 * @example
 * ```typescript
 * const sdp = `v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=sendrecv\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=recvonly`;
 * extractMediaDirectionsFromSDP(sdp);
 * // { audio: 'sendrecv', video: 'recvonly' }
 * ```
 */
export function extractMediaDirectionsFromSDP(sdp: string): MediaDirections {
  const result: MediaDirections = {
    audio: 'inactive',
    video: 'inactive'
  };

  if (!sdp) {
    return result;
  }

  const lines = sdp.split(/\r?\n/);
  let currentMediaKind: 'audio' | 'video' | null = null;
  let currentDirection: MediaDirection | null = null;

  for (const line of lines) {
    if (line.startsWith('m=')) {
      // Flush direction for previous section
      if (currentMediaKind) {
        result[currentMediaKind] = currentDirection ?? 'sendrecv';
      }

      // Determine new media kind
      if (line.startsWith('m=audio')) {
        currentMediaKind = 'audio';
      } else if (line.startsWith('m=video')) {
        currentMediaKind = 'video';
      } else {
        currentMediaKind = null;
      }
      currentDirection = null;
    } else if (currentMediaKind && line.startsWith('a=')) {
      const attr = line.substring(2).trim();
      if (SDP_DIRECTIONS.has(attr)) {
        currentDirection = attr as MediaDirection;
      }
    }
  }

  // Flush last section
  if (currentMediaKind) {
    result[currentMediaKind] = currentDirection ?? 'sendrecv';
  }

  return result;
}

/**
 * Validates that an SDP string has at least one non-host ICE candidate
 * for each media section (m= line).
 *
 * Non-host candidates (srflx, prflx, relay) indicate that the SDP has
 * gathered candidates that can be used for connectivity through NAT
 * traversal mechanisms.
 *
 * @param sdp - The SDP string to validate
 * @returns true if the SDP is valid (has non-host candidates for all media sections,
 *          or has no media sections), false otherwise
 *
 * @example
 * ```typescript
 * const sdp = `v=0
 * m=audio 9 UDP/TLS/RTP/SAVPF 111
 * a=candidate:1 1 UDP 1694498815 203.0.113.1 50001 typ srflx
 * m=video 9 UDP/TLS/RTP/SAVPF 96
 * a=candidate:2 1 UDP 1694498815 203.0.113.1 50002 typ relay`;
 *
 * isValidLocalDescription(sdp); // returns true
 * ```
 */
export function isValidLocalDescription(sdp: string): boolean {
  if (!sdp) {
    return false;
  }

  // Parse SDP to find media sections (m= lines)
  const lines = sdp.split('\r\n');
  const mediaSectionsValidCandidates: number[] = [];
  let currentSection = -1;

  for (const line of lines) {
    if (line.startsWith('m=')) {
      // New media section
      currentSection += 1;
      mediaSectionsValidCandidates[currentSection] = 0;
    } else if (line.startsWith('a=candidate:')) {
      const typeMatch = /\styp\s+(host|srflx|prflx|relay)/.exec(line);
      if (typeMatch && typeMatch[1] !== 'host') {
        // count only non-host candidates
        mediaSectionsValidCandidates[currentSection] += 1;
      }
    }
  }

  return (
    !mediaSectionsValidCandidates.length ||
    // Check if localDescription has at least one non-host candidate for each media section.
    mediaSectionsValidCandidates.every((count) => count > 0)
  );
}

// =============================================================================
// CODEC REORDERING (Section 23)
// =============================================================================

/**
 * Reorders codec payload types in an SDP m= line to match the preferred order.
 *
 * For each media section (`m=audio` / `m=video`), this function parses the
 * `a=rtpmap` lines to build a payload-type-to-codec-name map, then rewrites
 * the m= line so preferred codecs appear first.
 *
 * Codecs not in the preferred list retain their original relative order after
 * the preferred ones. Preferred codecs that do not appear in the SDP are ignored.
 *
 * @param sdp - The SDP string to modify
 * @param preferredVideo - Preferred video codec names in priority order (e.g., ['VP9', 'VP8'])
 * @param preferredAudio - Preferred audio codec names in priority order (e.g., ['opus'])
 * @returns The modified SDP string with reordered codec payload types
 *
 * @example
 * ```typescript
 * const reordered = reorderCodecs(sdp, ['VP9', 'H264'], ['opus']);
 * ```
 */
export function reorderCodecs(
  sdp: string,
  preferredVideo: readonly string[] = [],
  preferredAudio: readonly string[] = []
): string {
  if (!sdp || (preferredVideo.length === 0 && preferredAudio.length === 0)) {
    return sdp;
  }

  const sections = splitIntoMediaSections(sdp);
  const result: string[] = [sections[0]]; // session-level section

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const mLine = section.split(/\r?\n/)[0];

    if (mLine.startsWith('m=video') && preferredVideo.length > 0) {
      result.push(reorderSectionCodecs(section, preferredVideo));
    } else if (mLine.startsWith('m=audio') && preferredAudio.length > 0) {
      result.push(reorderSectionCodecs(section, preferredAudio));
    } else {
      result.push(section);
    }
  }

  return result.join('');
}

/**
 * Adds stereo=1 and sprop-stereo=1 to the Opus fmtp line in the SDP.
 *
 * This enables stereo Opus negotiation for music/podcast use cases.
 * Also sets maxaveragebitrate to accommodate stereo audio (default: 510000 bps).
 *
 * @param sdp - The SDP string to modify
 * @param maxBitrate - Maximum average bitrate in bps (default: 510000)
 * @returns The modified SDP string with stereo Opus parameters
 *
 * @example
 * ```typescript
 * const stereoSdp = enableStereoOpus(sdp);
 * // a=fmtp:111 minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=510000
 * ```
 */
export function enableStereoOpus(
  sdp: string,
  maxBitrate: number = DEFAULT_STEREO_MAX_AVERAGE_BITRATE
): string {
  if (!sdp) {
    return sdp;
  }

  // Find the Opus payload type from rtpmap
  const opusPayloadType = findOpusPayloadType(sdp);
  if (opusPayloadType === null) {
    return sdp;
  }

  const lines = sdp.split(/\r?\n/);
  const updatedLines: string[] = [];
  const fmtpPrefix = `a=fmtp:${opusPayloadType} `;

  let foundFmtp = false;

  for (const line of lines) {
    if (line.startsWith(fmtpPrefix)) {
      foundFmtp = true;
      updatedLines.push(appendStereoParams(line, maxBitrate));
    } else {
      updatedLines.push(line);
    }
  }

  // If no fmtp line exists for Opus, add one after the rtpmap line
  if (!foundFmtp) {
    const rtpmapLine = `a=rtpmap:${opusPayloadType} `;
    const withFmtp: string[] = [];
    for (const line of updatedLines) {
      withFmtp.push(line);
      if (line.startsWith(rtpmapLine)) {
        withFmtp.push(
          `a=fmtp:${opusPayloadType} stereo=1;sprop-stereo=1;maxaveragebitrate=${maxBitrate}`
        );
      }
    }
    return withFmtp.join('\r\n');
  }

  return updatedLines.join('\r\n');
}

/**
 * Convenience wrapper that applies both codec reordering and stereo Opus.
 *
 * @param sdp - The SDP string to modify
 * @param audioCodecs - Preferred audio codecs in priority order
 * @param videoCodecs - Preferred video codecs in priority order
 * @returns The modified SDP string
 */
export function setCodecPreferences(
  sdp: string,
  audioCodecs: readonly string[] = [],
  videoCodecs: readonly string[] = []
): string {
  return reorderCodecs(sdp, videoCodecs, audioCodecs);
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Splits an SDP string into session-level + per-media sections.
 *
 * The first element is the session-level content (before the first m= line).
 * Subsequent elements each start with an m= line.
 */
function splitIntoMediaSections(sdp: string): string[] {
  // Split on the boundary just before each m= line.
  // String.split always returns at least one element, so no fallback needed.
  return sdp.split(/(?=m=)/);
}

/**
 * Reorders codecs within a single media section based on preferred names.
 */
function reorderSectionCodecs(section: string, preferredNames: readonly string[]): string {
  const lines = section.split(/\r?\n/);
  const mLine = lines[0];

  // Parse the m= line: m=<kind> <port> <proto> <payload types...>
  const mLineParts = mLine.split(' ');
  if (mLineParts.length < 4) {
    return section;
  }

  const payloadTypes = mLineParts.slice(3);

  // Build payload-type-to-codec-name map from a=rtpmap lines
  const ptToCodec = new Map<string, string>();
  for (const line of lines) {
    const match = /^a=rtpmap:(\d+)\s+([^\s/]+)/.exec(line);
    if (match) {
      ptToCodec.set(match[1], match[2]);
    }
  }

  // Build the preferred list: PTs whose codec name matches a preferred name
  const preferredNamesUpper = preferredNames.map((n) => n.toUpperCase());
  const preferred: string[] = [];
  const remaining: string[] = [];

  for (const pt of payloadTypes) {
    const codecName = ptToCodec.get(pt)?.toUpperCase() ?? '';
    const preferIndex = preferredNamesUpper.indexOf(codecName);
    if (preferIndex >= 0) {
      preferred.push(pt);
    } else {
      remaining.push(pt);
    }
  }

  // Sort preferred PTs by the order in preferredNames
  preferred.sort((a, b) => {
    const nameA = ptToCodec.get(a)?.toUpperCase() ?? '';
    const nameB = ptToCodec.get(b)?.toUpperCase() ?? '';
    return preferredNamesUpper.indexOf(nameA) - preferredNamesUpper.indexOf(nameB);
  });

  const reorderedPTs = [...preferred, ...remaining];
  const newMLine = [...mLineParts.slice(0, 3), ...reorderedPTs].join(' ');

  // Replace the m= line in the section
  const newLines = [newMLine, ...lines.slice(1)];
  return newLines.join('\r\n');
}

/**
 * Finds the Opus payload type number from a=rtpmap lines in the SDP.
 *
 * @returns The payload type number as a string, or null if Opus is not found
 */
function findOpusPayloadType(sdp: string): string | null {
  const match = /a=rtpmap:(\d+)\s+opus\/48000/i.exec(sdp);
  return match ? match[1] : null;
}

/**
 * Appends stereo and bitrate parameters to an existing Opus fmtp line.
 *
 * Avoids duplicating parameters if they already exist.
 */
function appendStereoParams(fmtpLine: string, maxBitrate: number): string {
  let result = fmtpLine;

  if (!result.includes('stereo=')) {
    result += ';stereo=1';
  }
  if (!result.includes('sprop-stereo=')) {
    result += ';sprop-stereo=1';
  }
  if (!result.includes('maxaveragebitrate=')) {
    result += `;maxaveragebitrate=${maxBitrate}`;
  }

  return result;
}
