/**
 * Video element utilities for creating and managing video elements
 * with proper configuration for WebRTC streams.
 */

import { VIDEO_READY_TIMEOUT_MS } from '../constants.js';

/**
 * Creates a video element configured for WebRTC streams.
 * The video is muted, autoplays, and plays inline (mobile Safari support).
 * Prevents pause events which can occur on camera switches or PiP mode.
 *
 * @returns A configured HTMLVideoElement
 */
export function createVideoElement(): HTMLVideoElement {
  const video = document.createElement('video');
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;

  // Prevent pause (Safari/Firefox pause on PiP, camera switch)
  video.addEventListener('pause', () => {
    video.play().catch((error) => {
      console.error('Video Element Paused', error);
    });
  });

  return video;
}

/**
 * Waits for a video element to be ready for playback.
 * Resolves when the video has metadata or when it can play.
 *
 * @param element - The video element to wait for
 * @returns A promise that resolves when the video is ready
 */
export function waitForVideoReady(element: HTMLVideoElement): Promise<void> {
  return new Promise<void>((resolve) => {
    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
      resolve();
      return;
    }

    let resolved = false;

    const done = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      element.removeEventListener('canplay', done);
      element.removeEventListener('resize', done);
      resolve();
    };

    // Timeout fallback for audio-only streams where resize/canplay may never fire
    const timeoutId = setTimeout(done, VIDEO_READY_TIMEOUT_MS);
    element.addEventListener('canplay', done);
    element.addEventListener('resize', done);
  });
}

/**
 * Attaches a MediaStream to a video element.
 *
 * @param element - The video element to attach the stream to
 * @param stream - The MediaStream to attach, or null to detach
 */
export function attachMediaStream(element: HTMLVideoElement, stream: MediaStream | null): void {
  element.srcObject = stream;
}

/**
 * Detaches any MediaStream from a video element.
 *
 * @param element - The video element to detach the stream from
 */
export function detachMediaStream(element: HTMLVideoElement): void {
  if (element.srcObject) {
    element.srcObject = null;
  }
}
