import { getValueFrom } from './getValueFrom';

describe('getValueFrom', () => {
  describe('Happy Path - Single level access', () => {
    it('should retrieve a string value from a single-level property', () => {
      const obj = { name: 'John' };
      expect(getValueFrom(obj, 'name')).toBe('John');
    });

    it('should retrieve a number value from a single-level property', () => {
      const obj = { age: 30 };
      expect(getValueFrom<number>(obj, 'age')).toBe(30);
    });

    it('should retrieve a boolean value from a single-level property', () => {
      const obj = { active: true };
      expect(getValueFrom<boolean>(obj, 'active')).toBe(true);
    });

    it('should retrieve null value from a single-level property', () => {
      const obj = { value: null };
      expect(getValueFrom(obj, 'value')).toBeNull();
    });
  });

  describe('Happy Path - Nested access', () => {
    it('should retrieve a value from a nested property', () => {
      const obj = { user: { name: 'John' } };
      expect(getValueFrom(obj, 'user.name')).toBe('John');
    });

    it('should retrieve a value from a deeply nested property', () => {
      const obj = { level1: { level2: { level3: { value: 'deep' } } } };
      expect(getValueFrom(obj, 'level1.level2.level3.value')).toBe('deep');
    });

    it('should retrieve an array from a nested property', () => {
      const obj = { data: { items: [1, 2, 3] } };
      expect(getValueFrom(obj, 'data.items')).toEqual([1, 2, 3]);
    });

    it('should retrieve an object from a nested property', () => {
      const obj = {
        jsonrpc: '2.0',
        id: 'accd705c-1a31-4c1b-b8f9-3a8794d397b6',
        method: 'signalwire.event',
        params: {
          event_type: 'webrtc.message',
          event_channel:
            'signalwire_e08867fb-830b-4dee-906f-c2ce333bed92_531b6a5d-dc24-4a47-9eca-24c0b5ffc3cd_f15c5e3a-e5d6-4607-9a3d-c5af0aa9236a',
          timestamp: 1763689665.934609,
          project_id: 'f15c5e3a-e5d6-4607-9a3d-c5af0aa9236a',
          node_id: '8b08c8b9-4552-4e11-abd1-0078db49c848@us-east',
          params: {
            jsonrpc: '2.0',
            id: 10410,
            method: 'verto.answer',
            params: {
              callID: 'f6e84087-05a3-4a7a-b54c-140820e625af',
              sdp: 'v=0\r\no=FreeSWITCH 1763677839 1763677840 IN IP4 161.35.1.12\r\ns=FreeSWITCH\r\nc=IN IP4 161.35.1.12\r\nt=0 0\r\na=msid-semantic: WMS 6pkxn2844sEwyO7joTte3FPC2lMRtTuW\r\nm=audio 11826 UDP/TLS/RTP/SAVPF 111 110\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 useinbandfec=1; maxaveragebitrate=30000; maxplaybackrate=48000; sprop-maxcapturerate=48000; ptime=20; minptime=10; maxptime=40\r\na=rtpmap:110 telephone-event/48000\r\na=silenceSupp:off - - - -\r\na=ptime:20\r\na=sendrecv\r\na=fingerprint:sha-256 96:15:B1:FD:F5:90:34:AF:0E:7C:F8:80:B8:DF:FF:A6:C8:7B:85:36:D6:12:40:8A:74:61:63:20:F5:80:88:30\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:11826 IN IP4 161.35.1.12\r\na=ice-ufrag:hBPTbvaghopn4oh1\r\na=ice-pwd:OyHNuKyP7VT8iA0e3bDpyPqE\r\na=candidate:1898119558 1 udp 2130706431 161.35.1.12 11826 typ srflx raddr 172.17.0.2 rport 11826 generation 0\r\na=candidate:3575024633 1 udp 2130706431 172.17.0.2 11826 typ host generation 0\r\na=end-of-candidates\r\na=ssrc:1096515385 cname:tzbbTKQ8uZs2bKMW\r\na=ssrc:1096515385 msid:6pkxn2844sEwyO7joTte3FPC2lMRtTuW a0\r\na=ssrc:1096515385 mslabel:6pkxn2844sEwyO7joTte3FPC2lMRtTuW\r\na=ssrc:1096515385 label:6pkxn2844sEwyO7joTte3FPC2lMRtTuWa0\r\nm=video 15240 UDP/TLS/RTP/SAVPF 96\r\nb=AS:2580\r\na=rtpmap:96 VP8/90000\r\na=extmap:2/sendonly http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:3/sendonly http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=sendonly\r\na=fingerprint:sha-256 96:15:B1:FD:F5:90:34:AF:0E:7C:F8:80:B8:DF:FF:A6:C8:7B:85:36:D6:12:40:8A:74:61:63:20:F5:80:88:30\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:15240 IN IP4 161.35.1.12\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtcp-fb:96 transport-cc\r\na=ssrc:214692968 cname:tzbbTKQ8uZs2bKMW\r\na=ssrc:214692968 msid:6pkxn2844sEwyO7joTte3FPC2lMRtTuW v0\r\na=ssrc:214692968 mslabel:6pkxn2844sEwyO7joTte3FPC2lMRtTuW\r\na=ssrc:214692968 label:6pkxn2844sEwyO7joTte3FPC2lMRtTuWv0\r\na=ice-ufrag:3D0lkwZnrmSXzqsx\r\na=ice-pwd:kVxUsfszlhHsGQf2SUwDVtcE\r\na=candidate:4717164636 1 udp 2130706431 161.35.1.12 15240 typ srflx raddr 172.17.0.2 rport 15240 generation 0\r\na=candidate:5799448082 1 udp 2130706431 172.17.0.2 15240 typ host generation 0\r\na=end-of-candidates\r\n'
            }
          }
        }
      };
      expect(getValueFrom(obj, 'params.params.params')).toEqual({
        callID: 'f6e84087-05a3-4a7a-b54c-140820e625af',
        sdp: 'v=0\r\no=FreeSWITCH 1763677839 1763677840 IN IP4 161.35.1.12\r\ns=FreeSWITCH\r\nc=IN IP4 161.35.1.12\r\nt=0 0\r\na=msid-semantic: WMS 6pkxn2844sEwyO7joTte3FPC2lMRtTuW\r\nm=audio 11826 UDP/TLS/RTP/SAVPF 111 110\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 useinbandfec=1; maxaveragebitrate=30000; maxplaybackrate=48000; sprop-maxcapturerate=48000; ptime=20; minptime=10; maxptime=40\r\na=rtpmap:110 telephone-event/48000\r\na=silenceSupp:off - - - -\r\na=ptime:20\r\na=sendrecv\r\na=fingerprint:sha-256 96:15:B1:FD:F5:90:34:AF:0E:7C:F8:80:B8:DF:FF:A6:C8:7B:85:36:D6:12:40:8A:74:61:63:20:F5:80:88:30\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:11826 IN IP4 161.35.1.12\r\na=ice-ufrag:hBPTbvaghopn4oh1\r\na=ice-pwd:OyHNuKyP7VT8iA0e3bDpyPqE\r\na=candidate:1898119558 1 udp 2130706431 161.35.1.12 11826 typ srflx raddr 172.17.0.2 rport 11826 generation 0\r\na=candidate:3575024633 1 udp 2130706431 172.17.0.2 11826 typ host generation 0\r\na=end-of-candidates\r\na=ssrc:1096515385 cname:tzbbTKQ8uZs2bKMW\r\na=ssrc:1096515385 msid:6pkxn2844sEwyO7joTte3FPC2lMRtTuW a0\r\na=ssrc:1096515385 mslabel:6pkxn2844sEwyO7joTte3FPC2lMRtTuW\r\na=ssrc:1096515385 label:6pkxn2844sEwyO7joTte3FPC2lMRtTuWa0\r\nm=video 15240 UDP/TLS/RTP/SAVPF 96\r\nb=AS:2580\r\na=rtpmap:96 VP8/90000\r\na=extmap:2/sendonly http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:3/sendonly http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=sendonly\r\na=fingerprint:sha-256 96:15:B1:FD:F5:90:34:AF:0E:7C:F8:80:B8:DF:FF:A6:C8:7B:85:36:D6:12:40:8A:74:61:63:20:F5:80:88:30\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:15240 IN IP4 161.35.1.12\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtcp-fb:96 transport-cc\r\na=ssrc:214692968 cname:tzbbTKQ8uZs2bKMW\r\na=ssrc:214692968 msid:6pkxn2844sEwyO7joTte3FPC2lMRtTuW v0\r\na=ssrc:214692968 mslabel:6pkxn2844sEwyO7joTte3FPC2lMRtTuW\r\na=ssrc:214692968 label:6pkxn2844sEwyO7joTte3FPC2lMRtTuWv0\r\na=ice-ufrag:3D0lkwZnrmSXzqsx\r\na=ice-pwd:kVxUsfszlhHsGQf2SUwDVtcE\r\na=candidate:4717164636 1 udp 2130706431 161.35.1.12 15240 typ srflx raddr 172.17.0.2 rport 15240 generation 0\r\na=candidate:5799448082 1 udp 2130706431 172.17.0.2 15240 typ host generation 0\r\na=end-of-candidates\r\n'
      });
    });
  });

  describe('Default Value', () => {
    it('should return default value when property does not exist', () => {
      const obj = { name: 'John' };
      expect(getValueFrom(obj, 'missing', 'default')).toBe('default');
    });

    it('should return default value when nested property does not exist', () => {
      const obj = { user: { name: 'John' } };
      expect(getValueFrom(obj, 'user.missing.property', 'default')).toBe('default');
    });

    it('should return default value when intermediate property is missing', () => {
      const obj = { user: { name: 'John' } };
      expect(getValueFrom(obj, 'missing.property', 'default')).toBe('default');
    });

    it('should return default value with number type', () => {
      const obj = { name: 'John' };
      expect(getValueFrom<number>(obj, 'missing', 0)).toBe(0);
    });

    it('should return null when value is null (not use default)', () => {
      const obj = { value: null };
      // null is a valid value, so it's returned instead of defaultValue
      expect(getValueFrom(obj, 'value', 'default')).toBeNull();
    });

    it('should return default value when value is undefined', () => {
      const obj = { value: undefined };
      expect(getValueFrom(obj, 'value', 'default')).toBe('default');
    });
  });

  describe('Edge Cases - Object handling', () => {
    it('should return undefined when object is null', () => {
      expect(getValueFrom(null, 'property')).toBeUndefined();
    });

    it('should return undefined when object is undefined', () => {
      expect(getValueFrom(undefined, 'property')).toBeUndefined();
    });

    it('should return default when object is null', () => {
      expect(getValueFrom(null, 'property', 'default')).toBe('default');
    });

    it('should return default when object is undefined', () => {
      expect(getValueFrom(undefined, 'property', 'default')).toBe('default');
    });

    it('should handle empty object', () => {
      const obj = {};
      expect(getValueFrom(obj, 'missing', 'default')).toBe('default');
    });

    it('should handle non-object types', () => {
      expect(getValueFrom('string', 'property', 'default')).toBe('default');
      expect(getValueFrom(123, 'property', 'default')).toBe('default');
      expect(getValueFrom(true, 'property', 'default')).toBe('default');
    });
  });

  describe('Edge Cases - Path handling', () => {
    it('should return default value for empty path', () => {
      const obj = { name: 'John' };
      // Empty path splits to [''], which is not a valid key
      expect(getValueFrom(obj, '', 'default')).toBe('default');
    });

    it('should handle intermediate null value in path', () => {
      const obj = { user: null };
      expect(getValueFrom(obj, 'user.name', 'default')).toBe('default');
    });

    it('should handle intermediate undefined value in path', () => {
      const obj = { user: undefined };
      expect(getValueFrom(obj, 'user.name', 'default')).toBe('default');
    });
  });

  describe('Falsy values', () => {
    it('should return 0 when property value is 0', () => {
      const obj = { count: 0 };
      expect(getValueFrom<number>(obj, 'count')).toBe(0);
    });

    it('should return empty string when property value is empty string', () => {
      const obj = { text: '' };
      expect(getValueFrom(obj, 'text')).toBe('');
    });

    it('should return false when property value is false', () => {
      const obj = { flag: false };
      expect(getValueFrom<boolean>(obj, 'flag')).toBe(false);
    });

    it('should NOT use default value for falsy values like 0', () => {
      const obj = { count: 0 };
      expect(getValueFrom<number>(obj, 'count', 100)).toBe(0);
    });

    it('should NOT use default value for falsy values like empty string', () => {
      const obj = { text: '' };
      expect(getValueFrom(obj, 'text', 'default')).toBe('');
    });

    it('should NOT use default value for falsy values like false', () => {
      const obj = { flag: false };
      expect(getValueFrom<boolean>(obj, 'flag', true)).toBe(false);
    });
  });
});
