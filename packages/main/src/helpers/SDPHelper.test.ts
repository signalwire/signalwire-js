import { describe, it, expect } from 'vitest';

import {
  extractMediaDirectionsFromSDP,
  isValidLocalDescription,
  reorderCodecs,
  setCodecPreferences,
  enableStereoOpus
} from './SDPHelper';

describe('extractMediaDirectionsFromSDP', () => {
  it('should return inactive for both when SDP is empty', () => {
    expect(extractMediaDirectionsFromSDP('')).toEqual({
      audio: 'inactive',
      video: 'inactive'
    });
  });

  it('should extract sendrecv for audio and video', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=sendrecv',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=sendrecv'
    ].join('\r\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'sendrecv',
      video: 'sendrecv'
    });
  });

  it('should extract mixed directions', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=sendonly',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=recvonly'
    ].join('\r\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'sendonly',
      video: 'recvonly'
    });
  });

  it('should default to sendrecv when no direction attribute is present', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=rtpmap:111 opus/48000/2',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=rtpmap:96 VP8/90000'
    ].join('\r\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'sendrecv',
      video: 'sendrecv'
    });
  });

  it('should handle audio-only SDP', () => {
    const sdp = ['v=0', 'm=audio 9 UDP/TLS/RTP/SAVPF 111', 'a=sendrecv'].join('\r\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'sendrecv',
      video: 'inactive'
    });
  });

  it('should handle video-only SDP', () => {
    const sdp = ['v=0', 'm=video 9 UDP/TLS/RTP/SAVPF 96', 'a=recvonly'].join('\r\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'inactive',
      video: 'recvonly'
    });
  });

  it('should handle inactive direction', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=inactive',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=inactive'
    ].join('\r\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'inactive',
      video: 'inactive'
    });
  });

  it('should ignore non-audio/video media sections', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=sendrecv',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
      'a=sendrecv',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=recvonly'
    ].join('\r\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'sendrecv',
      video: 'recvonly'
    });
  });

  it('should use the last direction attribute in a section', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=sendonly',
      'a=rtpmap:111 opus/48000/2',
      'a=recvonly'
    ].join('\r\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'recvonly',
      video: 'inactive'
    });
  });

  it('should handle SDP with LF line endings', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=sendrecv',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=sendonly'
    ].join('\n');

    expect(extractMediaDirectionsFromSDP(sdp)).toEqual({
      audio: 'sendrecv',
      video: 'sendonly'
    });
  });
});

describe('isValidLocalDescription', () => {
  it('should return false for empty SDP', () => {
    expect(isValidLocalDescription('')).toBe(false);
  });

  it('should return true for SDP with no media sections', () => {
    expect(isValidLocalDescription('v=0\r\no=- 0 0 IN IP4 127.0.0.1')).toBe(true);
  });
});

describe('reorderCodecs', () => {
  const sampleSdp = [
    'v=0\r\n',
    'm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104\r\n',
    'a=rtpmap:111 opus/48000/2\r\n',
    'a=rtpmap:103 ISAC/16000\r\n',
    'a=rtpmap:104 ISAC/32000\r\n',
    'a=sendrecv\r\n',
    'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98\r\n',
    'a=rtpmap:96 VP8/90000\r\n',
    'a=rtpmap:97 VP9/90000\r\n',
    'a=rtpmap:98 H264/90000\r\n',
    'a=sendrecv\r\n'
  ].join('');

  it('should return SDP unchanged when no preferences are set', () => {
    expect(reorderCodecs(sampleSdp, [], [])).toBe(sampleSdp);
  });

  it('should reorder video codecs based on preference', () => {
    const result = reorderCodecs(sampleSdp, ['VP9', 'H264'], []);
    // VP9 (97) should come before VP8 (96) now
    const videoMLine = result.split('m=video')[1].split('\r\n')[0];
    const pts = videoMLine.trim().split(' ').slice(3);
    expect(pts.indexOf('97')).toBeLessThan(pts.indexOf('96'));
  });

  it('should reorder audio codecs based on preference', () => {
    const result = reorderCodecs(sampleSdp, [], ['ISAC']);
    // ISAC payload types (103, 104) should come before opus (111)
    const audioMLine = result.split('m=audio')[1].split('\r\n')[0];
    const pts = audioMLine.trim().split(' ').slice(3);
    expect(pts.indexOf('103')).toBeLessThan(pts.indexOf('111'));
  });

  it('should return empty SDP unchanged', () => {
    expect(reorderCodecs('', ['VP9'], [])).toBe('');
  });
});

describe('setCodecPreferences', () => {
  it('should apply both audio and video codec preferences', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111 103',
      'a=rtpmap:111 opus/48000/2',
      'a=rtpmap:103 ISAC/16000',
      'm=video 9 UDP/TLS/RTP/SAVPF 96 97',
      'a=rtpmap:96 VP8/90000',
      'a=rtpmap:97 VP9/90000'
    ].join('\r\n');

    const result = setCodecPreferences(sdp, ['ISAC'], ['VP9']);
    const lines = result.split('\r\n');
    // Find the m=video line and check codec order
    const videoMLine = lines.find((l) => l.startsWith('m=video'));
    expect(videoMLine).toBeDefined();
    const videoPts = videoMLine!.split(' ').slice(3);
    expect(videoPts[0]).toBe('97'); // VP9 first
    expect(videoPts[1]).toBe('96'); // VP8 second
    // Find the m=audio line and check codec order
    const audioMLine = lines.find((l) => l.startsWith('m=audio'));
    expect(audioMLine).toBeDefined();
    const audioPts = audioMLine!.split(' ').slice(3);
    expect(audioPts[0]).toBe('103'); // ISAC first
    expect(audioPts[1]).toBe('111'); // opus second
  });
});

describe('enableStereoOpus', () => {
  it('should add stereo params to existing Opus fmtp line', () => {
    const sdp = [
      'v=0\r\n',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',
      'a=rtpmap:111 opus/48000/2\r\n',
      'a=fmtp:111 minptime=10;useinbandfec=1\r\n'
    ].join('');

    const result = enableStereoOpus(sdp);
    expect(result).toContain('stereo=1');
    expect(result).toContain('sprop-stereo=1');
    expect(result).toContain('maxaveragebitrate=');
  });

  it('should add fmtp line if none exists for Opus', () => {
    const sdp = [
      'v=0\r\n',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',
      'a=rtpmap:111 opus/48000/2\r\n'
    ].join('');

    const result = enableStereoOpus(sdp);
    expect(result).toContain('a=fmtp:111 stereo=1;sprop-stereo=1;maxaveragebitrate=');
  });

  it('should not duplicate stereo params if already present', () => {
    const sdp = [
      'v=0\r\n',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',
      'a=rtpmap:111 opus/48000/2\r\n',
      'a=fmtp:111 minptime=10;stereo=1;sprop-stereo=1\r\n'
    ].join('');

    const result = enableStereoOpus(sdp);
    // Count occurrences of stereo=1
    const stereoMatches = result.match(/stereo=1/g);
    expect(stereoMatches?.length).toBe(2); // stereo=1 and sprop-stereo=1 both contain stereo=1
  });

  it('should return empty SDP unchanged', () => {
    expect(enableStereoOpus('')).toBe('');
  });

  it('should return SDP unchanged when no Opus codec present', () => {
    const sdp = [
      'v=0\r\n',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',
      'a=rtpmap:111 PCMU/8000\r\n'
    ].join('');

    expect(enableStereoOpus(sdp)).toBe(sdp);
  });
});
