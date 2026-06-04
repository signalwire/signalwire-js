import { describe, it, expect } from 'vitest';

import { enableStereoOpus, reorderCodecs, setCodecPreferences } from './SDPHelper';
import { DEFAULT_STEREO_MAX_AVERAGE_BITRATE } from '../core/constants';

// =============================================================================
// Test SDP templates
// =============================================================================

const AUDIO_VIDEO_SDP = [
  'v=0',
  'o=- 0 0 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111 0 8',
  'a=rtpmap:111 opus/48000/2',
  'a=rtpmap:0 PCMU/8000',
  'a=rtpmap:8 PCMA/8000',
  'a=fmtp:111 minptime=10;useinbandfec=1',
  'a=sendrecv',
  'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98',
  'a=rtpmap:96 VP8/90000',
  'a=rtpmap:97 VP9/90000',
  'a=rtpmap:98 H264/90000',
  'a=sendrecv'
].join('\r\n');

const AUDIO_ONLY_SDP = [
  'v=0',
  'o=- 0 0 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111 0',
  'a=rtpmap:111 opus/48000/2',
  'a=rtpmap:0 PCMU/8000',
  'a=fmtp:111 minptime=10;useinbandfec=1',
  'a=sendrecv'
].join('\r\n');

const NO_OPUS_SDP = [
  'v=0',
  'o=- 0 0 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 0 8',
  'a=rtpmap:0 PCMU/8000',
  'a=rtpmap:8 PCMA/8000',
  'a=sendrecv'
].join('\r\n');

const OPUS_NO_FMTP_SDP = [
  'v=0',
  'o=- 0 0 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'a=rtpmap:111 opus/48000/2',
  'a=sendrecv'
].join('\r\n');

// =============================================================================
// enableStereoOpus
// =============================================================================

describe('enableStereoOpus', () => {
  it('should add stereo parameters to Opus fmtp line', () => {
    const result = enableStereoOpus(AUDIO_VIDEO_SDP);
    expect(result).toContain('stereo=1');
    expect(result).toContain('sprop-stereo=1');
    expect(result).toContain(`maxaveragebitrate=${DEFAULT_STEREO_MAX_AVERAGE_BITRATE}`);
  });

  it('should preserve existing fmtp parameters', () => {
    const result = enableStereoOpus(AUDIO_VIDEO_SDP);
    expect(result).toContain('minptime=10');
    expect(result).toContain('useinbandfec=1');
  });

  it('should use custom maxBitrate when provided', () => {
    const result = enableStereoOpus(AUDIO_VIDEO_SDP, 256000);
    expect(result).toContain('maxaveragebitrate=256000');
    expect(result).not.toContain(`maxaveragebitrate=${DEFAULT_STEREO_MAX_AVERAGE_BITRATE}`);
  });

  it('should return empty string for empty SDP', () => {
    expect(enableStereoOpus('')).toBe('');
  });

  it('should return SDP unchanged when no Opus codec is present', () => {
    const result = enableStereoOpus(NO_OPUS_SDP);
    expect(result).toBe(NO_OPUS_SDP);
  });

  it('should add fmtp line when Opus has no fmtp', () => {
    const result = enableStereoOpus(OPUS_NO_FMTP_SDP);
    expect(result).toContain('a=fmtp:111 stereo=1;sprop-stereo=1');
    expect(result).toContain(`maxaveragebitrate=${DEFAULT_STEREO_MAX_AVERAGE_BITRATE}`);
  });

  it('should not duplicate stereo params if already present', () => {
    const sdpWithStereo = AUDIO_VIDEO_SDP.replace(
      'a=fmtp:111 minptime=10;useinbandfec=1',
      'a=fmtp:111 minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=510000'
    );
    const result = enableStereoOpus(sdpWithStereo);
    const stereoMatches = result.match(/stereo=1/g);
    // One 'stereo=1' and one 'sprop-stereo=1' (which also contains 'stereo=1')
    expect(stereoMatches).not.toBeNull();
    // Ensure we don't have duplicate 'stereo=1' entries (excluding sprop-stereo)
    const pureStereoCounts = result.match(/[^-]stereo=1/g);
    expect(pureStereoCounts?.length).toBeLessThanOrEqual(2);
  });

  it('should handle audio-only SDP', () => {
    const result = enableStereoOpus(AUDIO_ONLY_SDP);
    expect(result).toContain('stereo=1');
    expect(result).toContain('sprop-stereo=1');
  });
});

// =============================================================================
// reorderCodecs
// =============================================================================

describe('reorderCodecs', () => {
  it('should reorder video codecs to match preferred order', () => {
    const result = reorderCodecs(AUDIO_VIDEO_SDP, ['VP9', 'H264'], []);
    // VP9 (97) should come before VP8 (96) and H264 (98) should come before VP8
    const videoMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=video'));
    expect(videoMLine).toBeDefined();

    const pts = videoMLine!.split(' ').slice(3);
    const vp9Index = pts.indexOf('97');
    const h264Index = pts.indexOf('98');
    const vp8Index = pts.indexOf('96');

    expect(vp9Index).toBeLessThan(h264Index);
    expect(h264Index).toBeLessThan(vp8Index);
  });

  it('should reorder audio codecs to match preferred order', () => {
    const result = reorderCodecs(AUDIO_VIDEO_SDP, [], ['PCMA', 'opus']);
    const audioMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=audio'));
    expect(audioMLine).toBeDefined();

    const pts = audioMLine!.split(' ').slice(3);
    const pcmaIndex = pts.indexOf('8');
    const opusIndex = pts.indexOf('111');
    const pcmuIndex = pts.indexOf('0');

    expect(pcmaIndex).toBeLessThan(opusIndex);
    expect(opusIndex).toBeLessThan(pcmuIndex);
  });

  it('should handle empty preferred lists', () => {
    const result = reorderCodecs(AUDIO_VIDEO_SDP, [], []);
    expect(result).toBe(AUDIO_VIDEO_SDP);
  });

  it('should return empty string for empty SDP', () => {
    expect(reorderCodecs('', ['VP9'], [])).toBe('');
  });

  it('should ignore preferred codecs not in the SDP', () => {
    const result = reorderCodecs(AUDIO_VIDEO_SDP, ['AV1', 'VP9'], []);
    const videoMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=video'));
    expect(videoMLine).toBeDefined();
    // VP9 should be first since AV1 is not in the SDP
    const pts = videoMLine!.split(' ').slice(3);
    expect(pts[0]).toBe('97'); // VP9
  });

  it('should not change the SDP when preferred codec is already first', () => {
    const result = reorderCodecs(AUDIO_VIDEO_SDP, ['VP8'], []);
    const videoMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=video'));
    const pts = videoMLine!.split(' ').slice(3);
    expect(pts[0]).toBe('96'); // VP8 was already first
  });

  it('should preserve non-audio/video sections', () => {
    const sdpWithData = [
      ...AUDIO_VIDEO_SDP.split('\r\n'),
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
      'a=sctp-port:5000'
    ].join('\r\n');

    const result = reorderCodecs(sdpWithData, ['VP9'], []);
    expect(result).toContain('m=application 9 UDP/DTLS/SCTP webrtc-datachannel');
  });

  it('should be case-insensitive for codec name matching', () => {
    const result = reorderCodecs(AUDIO_VIDEO_SDP, ['vp9'], []);
    const videoMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=video'));
    const pts = videoMLine!.split(' ').slice(3);
    expect(pts[0]).toBe('97'); // VP9
  });
});

// =============================================================================
// setCodecPreferences
// =============================================================================

describe('setCodecPreferences', () => {
  it('should apply both audio and video codec reordering', () => {
    const result = setCodecPreferences(AUDIO_VIDEO_SDP, ['PCMA'], ['H264']);

    const audioMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=audio'));
    const audioPTs = audioMLine!.split(' ').slice(3);
    expect(audioPTs[0]).toBe('8'); // PCMA

    const videoMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=video'));
    const videoPTs = videoMLine!.split(' ').slice(3);
    expect(videoPTs[0]).toBe('98'); // H264
  });

  it('should work with empty codec lists', () => {
    const result = setCodecPreferences(AUDIO_VIDEO_SDP, [], []);
    expect(result).toBe(AUDIO_VIDEO_SDP);
  });

  it('should work with only audio preferences', () => {
    const result = setCodecPreferences(AUDIO_VIDEO_SDP, ['PCMU'], []);
    const audioMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=audio'));
    const audioPTs = audioMLine!.split(' ').slice(3);
    expect(audioPTs[0]).toBe('0'); // PCMU
  });

  it('should work with only video preferences', () => {
    const result = setCodecPreferences(AUDIO_VIDEO_SDP, [], ['VP9']);
    const videoMLine = result.split(/\r?\n/).find((l) => l.startsWith('m=video'));
    const videoPTs = videoMLine!.split(' ').slice(3);
    expect(videoPTs[0]).toBe('97'); // VP9
  });
});
