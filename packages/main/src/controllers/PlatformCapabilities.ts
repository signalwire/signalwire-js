/**
 * PlatformCapabilities - Detects browser/platform WebRTC capabilities.
 *
 * Probes the runtime environment at construction time and exposes a
 * read-only {@link PlatformCapabilities} object. Works with the
 * {@link WebRTCApiProvider} pattern so custom WebRTC implementations
 * (Citrix HDX, React Native, etc.) are supported.
 *
 * @example
 * ```typescript
 * const caps = detectPlatformCapabilities(webRTCApiProvider);
 * if (!caps.screenShare) hideScreenShareButton();
 * ```
 */

import type { PlatformCapabilities } from '../core/types/resilience.types';
import type { WebRTCApiProvider } from '../dependencies/interfaces';

/**
 * Detects the list of supported codecs for a given media kind
 * by calling RTCRtpSender.getCapabilities when available.
 *
 * @param kind - 'audio' or 'video'
 * @returns Array of unique codec names (e.g., ['VP8', 'VP9', 'H264'])
 */
function detectCodecs(kind: 'audio' | 'video'): string[] {
  if (typeof RTCRtpSender === 'undefined' || typeof RTCRtpSender.getCapabilities !== 'function') {
    return [];
  }

  const capabilities = RTCRtpSender.getCapabilities(kind);
  if (!capabilities) {
    return [];
  }

  const seen = new Set<string>();
  const codecs: string[] = [];
  for (const codec of capabilities.codecs) {
    const name = extractCodecName(codec.mimeType);
    if (name && !seen.has(name)) {
      seen.add(name);
      codecs.push(name);
    }
  }
  return codecs;
}

/**
 * Extracts the codec name from a MIME type string (e.g., 'video/VP8' -> 'VP8').
 */
function extractCodecName(mimeType: string): string {
  const slashIndex = mimeType.indexOf('/');
  return slashIndex >= 0 ? mimeType.substring(slashIndex + 1) : mimeType;
}

/**
 * Checks whether insertable streams / encoded transforms are available.
 *
 * Tests for both the newer RTCRtpScriptTransform (Safari 15.4+, Chrome 128+)
 * and the older MediaStreamTrackProcessor (Chrome 94+).
 */
function detectInsertableStreams(): boolean {
  if (typeof globalThis === 'undefined') {
    return false;
  }
  return 'RTCRtpScriptTransform' in globalThis || 'MediaStreamTrackProcessor' in globalThis;
}

/**
 * Checks whether setSinkId (audio output device selection) is available.
 */
function detectAudioOutputSelection(): boolean {
  if (typeof HTMLMediaElement === 'undefined') {
    return false;
  }
  return 'setSinkId' in HTMLMediaElement.prototype;
}

/**
 * Checks whether simulcast is supported by checking for RTCRtpSender.setParameters
 * and the presence of encoding parameters support.
 */
function detectSimulcast(): boolean {
  if (typeof RTCRtpSender === 'undefined') {
    return false;
  }
  return typeof RTCRtpSender.prototype.setParameters === 'function';
}

/**
 * Detects platform WebRTC capabilities at call time.
 *
 * If a {@link WebRTCApiProvider} is supplied, its mediaDevices are used
 * for `getUserMedia` / `getDisplayMedia` detection. Otherwise the
 * standard `navigator.mediaDevices` is probed.
 *
 * @param provider - Optional custom WebRTC API provider
 * @returns A frozen {@link PlatformCapabilities} object
 */
export function detectPlatformCapabilities(provider?: WebRTCApiProvider): PlatformCapabilities {
  const mediaDevices = provider?.mediaDevices ?? getNavigatorMediaDevices();

  const hasGetUserMedia = typeof mediaDevices?.getUserMedia === 'function';
  const hasGetDisplayMedia = typeof mediaDevices?.getDisplayMedia === 'function';

  const hasWebRTC = provider
    ? typeof provider.RTCPeerConnection === 'function'
    : typeof globalThis !== 'undefined' && 'RTCPeerConnection' in globalThis;

  const capabilities: PlatformCapabilities = {
    webrtc: hasWebRTC,
    getUserMedia: hasGetUserMedia,
    getDisplayMedia: hasGetDisplayMedia,
    screenShare: hasGetDisplayMedia,
    screenShareAudio: detectScreenShareAudio(),
    simulcast: detectSimulcast(),
    insertableStreams: detectInsertableStreams(),
    audioOutputSelection: detectAudioOutputSelection(),
    videoCodecs: detectCodecs('video'),
    audioCodecs: detectCodecs('audio')
  };

  return Object.freeze(capabilities);
}

/**
 * Detects whether screen share with system audio is supported.
 *
 * This is primarily a Chromium feature. We detect it by checking
 * whether getDisplayMedia exists and the browser is Chromium-based.
 */
function detectScreenShareAudio(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const mediaDevices = getNavigatorMediaDevices();
  if (!mediaDevices || typeof mediaDevices.getDisplayMedia !== 'function') {
    return false;
  }

  // All Chromium-based browsers support system audio in screen share.
  // Modern Chromium Edge uses "Edg/" (not "Edge/"), and old EdgeHTML Edge
  // (which used "Edge/") is effectively dead. Chrome/ is sufficient.
  const ua = navigator.userAgent;
  return ua.includes('Chrome/');
}

/**
 * Safely retrieves navigator.mediaDevices, returning null if unavailable.
 */
function getNavigatorMediaDevices(): MediaDevices | null {
  if (typeof navigator !== 'undefined') {
    return navigator.mediaDevices;
  }
  return null;
}
