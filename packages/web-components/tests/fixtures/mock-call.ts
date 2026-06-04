/**
 * Mock Call fixtures for testing web components
 */
import { BehaviorSubject } from 'rxjs';
import type { Call, LayoutLayer } from '../../src/types/index.js';

/**
 * Creates a mock MediaStream for testing
 */
export function createMockMediaStream(options: {
  hasVideo?: boolean;
  hasAudio?: boolean;
  videoWidth?: number;
  videoHeight?: number;
} = {}): MediaStream {
  const { hasVideo = true, hasAudio = true, videoWidth = 1920, videoHeight = 1080 } = options;

  const tracks: MediaStreamTrack[] = [];

  if (hasVideo) {
    // Create canvas-based video track for testing
    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, videoWidth, videoHeight);
    }
    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      tracks.push(videoTrack);
    }
  }

  if (hasAudio) {
    // Create silent audio track
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const dest = audioContext.createMediaStreamDestination();
    oscillator.connect(dest);
    oscillator.frequency.value = 0; // Silent
    oscillator.start();
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) {
      tracks.push(audioTrack);
    }
  }

  return new MediaStream(tracks);
}

/**
 * Creates a mock layout layer
 */
export function createMockLayoutLayer(options: Partial<LayoutLayer> = {}): LayoutLayer {
  return {
    layer_index: 0,
    z_index: 0,
    member_id: undefined,
    playing_file: false,
    position: 'auto',
    reservation: '',
    visible: true,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    ...options,
  };
}

/**
 * Creates a mock Call object for testing
 */
export function createMockCall(options: {
  selfId?: string;
  initialRemoteStream?: MediaStream | null;
  initialLocalStream?: MediaStream | null;
  initialLayoutLayers?: LayoutLayer[];
} = {}): Call & {
  remoteStream$: BehaviorSubject<MediaStream | null>;
  localStream$: BehaviorSubject<MediaStream | null>;
  layoutLayers$: BehaviorSubject<LayoutLayer[]>;
} {
  const {
    selfId = 'self-user',
    initialRemoteStream = null,
    initialLocalStream = null,
    initialLayoutLayers = [],
  } = options;

  const remoteStream$ = new BehaviorSubject<MediaStream | null>(initialRemoteStream);
  const localStream$ = new BehaviorSubject<MediaStream | null>(initialLocalStream);
  const layoutLayers$ = new BehaviorSubject<LayoutLayer[]>(initialLayoutLayers);

  return {
    self: selfId ? { id: selfId } : undefined,
    remoteStream$,
    localStream$,
    layoutLayers$,
  };
}

/**
 * Creates standard test participants layout
 */
export function createTestParticipantsLayout(selfId: string): LayoutLayer[] {
  return [
    createMockLayoutLayer({
      member_id: selfId,
      x: 75,
      y: 75,
      width: 20,
      height: 20,
      layer_index: 0,
      z_index: 10,
    }),
    createMockLayoutLayer({
      member_id: 'participant-1',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      layer_index: 1,
      z_index: 1,
    }),
    createMockLayoutLayer({
      member_id: 'participant-2',
      x: 50,
      y: 0,
      width: 50,
      height: 50,
      layer_index: 2,
      z_index: 2,
    }),
    createMockLayoutLayer({
      member_id: 'participant-3',
      x: 0,
      y: 50,
      width: 50,
      height: 50,
      layer_index: 3,
      z_index: 3,
    }),
  ];
}
