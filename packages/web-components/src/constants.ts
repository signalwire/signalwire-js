/**
 * Constants for the web-components package
 */

/**
 * Timeout in milliseconds for waiting for a video element to become ready.
 * Audio-only streams attached to video elements may never fire `resize` or `canplay`,
 * so this timeout ensures the component doesn't block indefinitely.
 */
export const VIDEO_READY_TIMEOUT_MS = 2000;
