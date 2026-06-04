import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectPlatformCapabilities } from './PlatformCapabilities';

import type { WebRTCApiProvider, WebRTCMediaDevices } from '../dependencies/interfaces';

describe('detectPlatformCapabilities', () => {
  let originalRTCPeerConnection: typeof globalThis.RTCPeerConnection;
  let originalRTCRtpSender: typeof globalThis.RTCRtpSender;
  let originalHTMLMediaElement: typeof globalThis.HTMLMediaElement;
  let originalNavigator: typeof globalThis.navigator;

  beforeEach(() => {
    originalRTCPeerConnection = globalThis.RTCPeerConnection;
    originalRTCRtpSender = globalThis.RTCRtpSender;
    originalHTMLMediaElement = globalThis.HTMLMediaElement;
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
    globalThis.RTCPeerConnection = originalRTCPeerConnection;
    globalThis.RTCRtpSender = originalRTCRtpSender;
    globalThis.HTMLMediaElement = originalHTMLMediaElement;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
    vi.restoreAllMocks();
  });

  describe('with default globals (no provider)', () => {
    it('should detect webrtc as true when RTCPeerConnection exists', () => {
      globalThis.RTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;
      const caps = detectPlatformCapabilities();
      expect(caps.webrtc).toBe(true);
    });

    it('should detect webrtc as false when RTCPeerConnection is missing', () => {
      // @ts-expect-error - intentionally removing for test
      delete globalThis.RTCPeerConnection;
      const caps = detectPlatformCapabilities();
      expect(caps.webrtc).toBe(false);
    });

    it('should detect getUserMedia availability from navigator', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            enumerateDevices: vi.fn()
          },
          userAgent: ''
        },
        writable: true,
        configurable: true
      });
      const caps = detectPlatformCapabilities();
      expect(caps.getUserMedia).toBe(true);
    });

    it('should detect getDisplayMedia and screenShare availability', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            getDisplayMedia: vi.fn(),
            enumerateDevices: vi.fn()
          },
          userAgent: ''
        },
        writable: true,
        configurable: true
      });
      const caps = detectPlatformCapabilities();
      expect(caps.getDisplayMedia).toBe(true);
      expect(caps.screenShare).toBe(true);
    });

    it('should detect screenShare as false when getDisplayMedia is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            enumerateDevices: vi.fn()
          },
          userAgent: ''
        },
        writable: true,
        configurable: true
      });
      const caps = detectPlatformCapabilities();
      expect(caps.screenShare).toBe(false);
      expect(caps.getDisplayMedia).toBe(false);
    });
  });

  describe('with WebRTCApiProvider', () => {
    it('should detect webrtc from provider RTCPeerConnection', () => {
      const provider: WebRTCApiProvider = {
        RTCPeerConnection: vi.fn() as unknown as typeof RTCPeerConnection,
        mediaDevices: {
          getUserMedia: vi.fn(),
          enumerateDevices: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
      };
      const caps = detectPlatformCapabilities(provider);
      expect(caps.webrtc).toBe(true);
    });

    it('should detect getUserMedia from provider mediaDevices', () => {
      const provider: WebRTCApiProvider = {
        RTCPeerConnection: vi.fn() as unknown as typeof RTCPeerConnection,
        mediaDevices: {
          getUserMedia: vi.fn(),
          enumerateDevices: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
      };
      const caps = detectPlatformCapabilities(provider);
      expect(caps.getUserMedia).toBe(true);
    });

    it('should detect getDisplayMedia from provider mediaDevices', () => {
      const provider: WebRTCApiProvider = {
        RTCPeerConnection: vi.fn() as unknown as typeof RTCPeerConnection,
        mediaDevices: {
          getUserMedia: vi.fn(),
          getDisplayMedia: vi.fn(),
          enumerateDevices: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
      };
      const caps = detectPlatformCapabilities(provider);
      expect(caps.getDisplayMedia).toBe(true);
      expect(caps.screenShare).toBe(true);
    });

    it('should detect getDisplayMedia as false when provider does not supply it', () => {
      const mediaDevices: WebRTCMediaDevices = {
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };
      const provider: WebRTCApiProvider = {
        RTCPeerConnection: vi.fn() as unknown as typeof RTCPeerConnection,
        mediaDevices
      };
      const caps = detectPlatformCapabilities(provider);
      expect(caps.getDisplayMedia).toBe(false);
      expect(caps.screenShare).toBe(false);
    });
  });

  describe('audio output selection (setSinkId)', () => {
    it('should detect audioOutputSelection when setSinkId exists on HTMLMediaElement', () => {
      // Ensure HTMLMediaElement prototype has setSinkId
      if (typeof globalThis.HTMLMediaElement !== 'undefined') {
        Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'setSinkId', {
          value: vi.fn(),
          configurable: true
        });
      } else {
        globalThis.HTMLMediaElement =
          class HTMLMediaElement {} as unknown as typeof globalThis.HTMLMediaElement;
        Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'setSinkId', {
          value: vi.fn(),
          configurable: true
        });
      }

      const caps = detectPlatformCapabilities();
      expect(caps.audioOutputSelection).toBe(true);
    });

    it('should detect audioOutputSelection as false when setSinkId is missing', () => {
      if (typeof globalThis.HTMLMediaElement !== 'undefined') {
        const descriptor = Object.getOwnPropertyDescriptor(
          globalThis.HTMLMediaElement.prototype,
          'setSinkId'
        );
        if (descriptor) {
          delete (globalThis.HTMLMediaElement.prototype as Record<string, unknown>)['setSinkId'];
        }
      }
      const caps = detectPlatformCapabilities();
      expect(caps.audioOutputSelection).toBe(false);
    });
  });

  describe('insertable streams', () => {
    it('should detect insertableStreams when RTCRtpScriptTransform exists', () => {
      (globalThis as Record<string, unknown>)['RTCRtpScriptTransform'] = class {};
      const caps = detectPlatformCapabilities();
      expect(caps.insertableStreams).toBe(true);
      delete (globalThis as Record<string, unknown>)['RTCRtpScriptTransform'];
    });

    it('should detect insertableStreams when MediaStreamTrackProcessor exists', () => {
      (globalThis as Record<string, unknown>)['MediaStreamTrackProcessor'] = class {};
      const caps = detectPlatformCapabilities();
      expect(caps.insertableStreams).toBe(true);
      delete (globalThis as Record<string, unknown>)['MediaStreamTrackProcessor'];
    });

    it('should detect insertableStreams as false when neither API exists', () => {
      delete (globalThis as Record<string, unknown>)['RTCRtpScriptTransform'];
      delete (globalThis as Record<string, unknown>)['MediaStreamTrackProcessor'];
      const caps = detectPlatformCapabilities();
      expect(caps.insertableStreams).toBe(false);
    });
  });

  describe('simulcast', () => {
    it('should detect simulcast when RTCRtpSender.setParameters exists', () => {
      globalThis.RTCRtpSender = {
        prototype: {
          setParameters: vi.fn()
        },
        getCapabilities: vi.fn()
      } as unknown as typeof RTCRtpSender;

      const caps = detectPlatformCapabilities();
      expect(caps.simulcast).toBe(true);
    });

    it('should detect simulcast as false when RTCRtpSender is missing', () => {
      // @ts-expect-error - intentionally removing for test
      delete globalThis.RTCRtpSender;
      const caps = detectPlatformCapabilities();
      expect(caps.simulcast).toBe(false);
    });
  });

  describe('codec detection', () => {
    it('should detect video codecs when RTCRtpSender.getCapabilities is available', () => {
      globalThis.RTCRtpSender = {
        prototype: { setParameters: vi.fn() },
        getCapabilities: vi.fn((kind: string) => {
          if (kind === 'video') {
            return {
              codecs: [
                { mimeType: 'video/VP8', clockRate: 90000 },
                { mimeType: 'video/VP9', clockRate: 90000 },
                { mimeType: 'video/H264', clockRate: 90000 },
                { mimeType: 'video/VP8', clockRate: 90000 } // duplicate
              ],
              headerExtensions: []
            };
          }
          return { codecs: [], headerExtensions: [] };
        })
      } as unknown as typeof RTCRtpSender;

      const caps = detectPlatformCapabilities();
      expect(caps.videoCodecs).toEqual(['VP8', 'VP9', 'H264']);
    });

    it('should detect audio codecs when RTCRtpSender.getCapabilities is available', () => {
      globalThis.RTCRtpSender = {
        prototype: { setParameters: vi.fn() },
        getCapabilities: vi.fn((kind: string) => {
          if (kind === 'audio') {
            return {
              codecs: [
                { mimeType: 'audio/opus', clockRate: 48000 },
                { mimeType: 'audio/PCMU', clockRate: 8000 }
              ],
              headerExtensions: []
            };
          }
          return { codecs: [], headerExtensions: [] };
        })
      } as unknown as typeof RTCRtpSender;

      const caps = detectPlatformCapabilities();
      expect(caps.audioCodecs).toEqual(['opus', 'PCMU']);
    });

    it('should return empty codec arrays when getCapabilities is not available', () => {
      // @ts-expect-error - intentionally removing for test
      delete globalThis.RTCRtpSender;
      const caps = detectPlatformCapabilities();
      expect(caps.videoCodecs).toEqual([]);
      expect(caps.audioCodecs).toEqual([]);
    });

    it('should return empty codec arrays when getCapabilities returns null', () => {
      globalThis.RTCRtpSender = {
        prototype: { setParameters: vi.fn() },
        getCapabilities: vi.fn(() => null)
      } as unknown as typeof RTCRtpSender;

      const caps = detectPlatformCapabilities();
      expect(caps.videoCodecs).toEqual([]);
      expect(caps.audioCodecs).toEqual([]);
    });

    it('should deduplicate codecs by name', () => {
      globalThis.RTCRtpSender = {
        prototype: { setParameters: vi.fn() },
        getCapabilities: vi.fn((kind: string) => {
          if (kind === 'video') {
            return {
              codecs: [
                { mimeType: 'video/VP8', clockRate: 90000 },
                { mimeType: 'video/VP8', clockRate: 90000 },
                { mimeType: 'video/VP8', clockRate: 90000 }
              ],
              headerExtensions: []
            };
          }
          return { codecs: [], headerExtensions: [] };
        })
      } as unknown as typeof RTCRtpSender;

      const caps = detectPlatformCapabilities();
      expect(caps.videoCodecs).toEqual(['VP8']);
    });
  });

  describe('screenShareAudio', () => {
    it('should detect screenShareAudio on Chrome with getDisplayMedia', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            getDisplayMedia: vi.fn(),
            enumerateDevices: vi.fn()
          },
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        writable: true,
        configurable: true
      });
      const caps = detectPlatformCapabilities();
      expect(caps.screenShareAudio).toBe(true);
    });

    it('should not detect screenShareAudio on Firefox', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            getDisplayMedia: vi.fn(),
            enumerateDevices: vi.fn()
          },
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        },
        writable: true,
        configurable: true
      });
      const caps = detectPlatformCapabilities();
      expect(caps.screenShareAudio).toBe(false);
    });

    it('should not detect screenShareAudio when getDisplayMedia is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
            enumerateDevices: vi.fn()
          },
          userAgent: 'Mozilla/5.0 Chrome/120.0.0.0'
        },
        writable: true,
        configurable: true
      });
      const caps = detectPlatformCapabilities();
      expect(caps.screenShareAudio).toBe(false);
    });
  });

  describe('result immutability', () => {
    it('should return a frozen object', () => {
      const caps = detectPlatformCapabilities();
      expect(Object.isFrozen(caps)).toBe(true);
    });

    it('should not allow property modification', () => {
      const caps = detectPlatformCapabilities();
      expect(() => {
        (caps as { webrtc: boolean }).webrtc = true;
      }).toThrow();
    });
  });
});
