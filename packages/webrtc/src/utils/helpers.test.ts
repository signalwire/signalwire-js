import { getMediaConstraints, getSenderAudioMaxBitrate } from '../utils/helpers'

jest.mock('../utils/deviceHelpers', () => ({
    assureDeviceId: jest.fn().mockImplementation(async(p:any)=> Promise.resolve(p))
}))


describe('Helpers functions', () => {
    describe('getMediaConstraints', () => {

        describe('No remote SDP', () => {
            it('should return audio === false & video === false', async () => {
                const mediaConstraints = await getMediaConstraints({audio: false, video: false})
                expect(mediaConstraints.audio).toStrictEqual(false)
                expect(mediaConstraints.video).toStrictEqual(false)
            })

            it('should return audio === true & video === false', async () => {
                const mediaConstraints = await getMediaConstraints({})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
                expect(mediaConstraints.video).toStrictEqual(false)
            })

            it('should return audio === true & video === false', async () => {
                const mediaConstraints = await getMediaConstraints({audio: true, video: true})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
                expect(mediaConstraints.video).toEqual({})
            })

            it('should return audio === {}', async () => {
                const mediaConstraints = await getMediaConstraints({audio: {}})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
                expect(mediaConstraints.video).toStrictEqual(false)
            })

            it('should return audio === {}', async () => {
                const mediaConstraints = await getMediaConstraints({audio: {}, video: {}})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
                expect(mediaConstraints.video).toEqual({})
            })

            it('should return compatible audio constrains, mono - audio only', async () => {
                const mediaConstraints = await getMediaConstraints({audio: true, video: false, maxOpusPlaybackRate: 8000, useStereo: false})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1, "sampleRate": 8000})
                expect(mediaConstraints.video).toStrictEqual(false)
            })

            it('should return compatible audio constrains, stereo - audio only', async () => {
                const mediaConstraints = await getMediaConstraints({audio: true, video: false, maxOpusPlaybackRate: 8000, useStereo: true})
                expect(mediaConstraints.audio).toEqual({"channelCount": 2, "sampleRate": 8000})
                expect(mediaConstraints.video).toStrictEqual(false)
            })

            it('should return compatible audio constrains, mono - with video', async () => {
                const mediaConstraints = await getMediaConstraints({audio: true, video: true, maxOpusPlaybackRate: 8000, useStereo: false})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1, "sampleRate": 8000})
                expect(mediaConstraints.video).toEqual({})
            })

            it('should return compatible audio constrains, stereo - with video', async () => {
                const mediaConstraints = await getMediaConstraints({audio: true, video: true, maxOpusPlaybackRate: 8000, useStereo: true})
                expect(mediaConstraints.audio).toEqual({"channelCount": 2, "sampleRate": 8000})
                expect(mediaConstraints.video).toEqual({})
            })

        });

        describe('SDP support audio', () => {
            const SDP =
      'v=0\r\no=FreeSWITCH 1707233696 1707233697 IN IP4 190.102.98.211\r\ns=FreeSWITCH\r\nc=IN IP4 190.102.98.211\r\nt=0 0\r\na=msid-semantic: WMS xXtAEH0vyxeST9BACBkvRkF55amZ0EYo\r\nm=audio 19828 RTP/SAVPF 0 8 102\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:102 opus/48000/2\r\na=fmtp:102 useinbandfec=1; maxaveragebitrate=30000; maxplaybackrate=48000; ptime=20; minptime=10; maxptime=40\r\na=fingerprint:sha-256 0F:F7:47:2D:19:38:46:88:E7:42:2A:4B:53:53:F5:19:1B:DC:EF:8E:14:F7:44:79:ED:94:A7:1B:97:92:7F:C5\r\na=setup:actpass\r\na=rtcp-mux\r\na=rtcp:19828 IN IP4 190.102.98.211\r\na=ssrc:4043346828 cname:rhPWOFid3mVMmndP\r\na=ssrc:4043346828 msid:xXtAEH0vyxeST9BACBkvRkF55amZ0EYo a0\r\na=ssrc:4043346828 mslabel:xXtAEH0vyxeST9BACBkvRkF55amZ0EYo\r\na=ssrc:4043346828 label:xXtAEH0vyxeST9BACBkvRkF55amZ0EYoa0\r\na=ice-ufrag:OnbwxGrtGEix86Mq\r\na=ice-pwd:drdSXmVQzHtLVwrAKsW8Yerv\r\na=candidate:1409144412 1 udp 2130706431 190.102.98.211 19828 typ srflx raddr 172.17.0.2 rport 19828 generation 0\r\na=candidate:7363643456 1 udp 2130706431 172.17.0.2 19828 typ host generation 0\r\na=candidate:1409144412 2 udp 2130706430 190.102.98.211 19828 typ srflx raddr 172.17.0.2 rport 19828 generation 0\r\na=candidate:7363643456 2 udp 2130706430 172.17.0.2 19828 typ host generation 0\r\na=silenceSupp:off - - - -\r\na=ptime:20\r\na=sendrecv\r\n'
    
            it('should return audio === true', async () => {
                const mediaConstraints = await getMediaConstraints({remoteSdp: SDP})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
            })

            it('should return audio === {}', async () => {
                const mediaConstraints = await getMediaConstraints({audio: {}, remoteSdp: SDP})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
            })

            it('should return audio === {deviceId: { exact: "abcd" }}', async () => {
                const mediaConstraints = await getMediaConstraints({micId: 'abcd', remoteSdp: SDP})
                expect(mediaConstraints.audio).toEqual({deviceId: { exact: "abcd" }, channelCount: 1})
            })
        })

        describe('SDP dont support audio', () => {
            const SDP =
            'v=0\r\no=FreeSWITCH 1707233696 1707233697 IN IP4 190.102.98.211\r\ns=FreeSWITCH\r\nc=IN IP4 190.102.98.211\r\nt=0 0\r\na=msid-semantic: WMS xXtAEH0vyxeST9BACBkvRkF55amZ0EYo\r\nm=video 19828 RTP/SAVPF 0 8 102\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:102 opus/48000/2\r\na=fmtp:102 useinbandfec=1; maxaveragebitrate=30000; maxplaybackrate=48000; ptime=20; minptime=10; maxptime=40\r\na=fingerprint:sha-256 0F:F7:47:2D:19:38:46:88:E7:42:2A:4B:53:53:F5:19:1B:DC:EF:8E:14:F7:44:79:ED:94:A7:1B:97:92:7F:C5\r\na=setup:actpass\r\na=rtcp-mux\r\na=rtcp:19828 IN IP4 190.102.98.211\r\na=ssrc:4043346828 cname:rhPWOFid3mVMmndP\r\na=ssrc:4043346828 msid:xXtAEH0vyxeST9BACBkvRkF55amZ0EYo a0\r\na=ssrc:4043346828 mslabel:xXtAEH0vyxeST9BACBkvRkF55amZ0EYo\r\na=ssrc:4043346828 label:xXtAEH0vyxeST9BACBkvRkF55amZ0EYoa0\r\na=ice-ufrag:OnbwxGrtGEix86Mq\r\na=ice-pwd:drdSXmVQzHtLVwrAKsW8Yerv\r\na=candidate:1409144412 1 udp 2130706431 190.102.98.211 19828 typ srflx raddr 172.17.0.2 rport 19828 generation 0\r\na=candidate:7363643456 1 udp 2130706431 172.17.0.2 19828 typ host generation 0\r\na=candidate:1409144412 2 udp 2130706430 190.102.98.211 19828 typ srflx raddr 172.17.0.2 rport 19828 generation 0\r\na=candidate:7363643456 2 udp 2130706430 172.17.0.2 19828 typ host generation 0\r\na=silenceSupp:off - - - -\r\na=ptime:20\r\na=sendrecv\r\n'
    
            it('should return audio === true', async () => {
                const mediaConstraints = await getMediaConstraints({remoteSdp: SDP})
                expect(mediaConstraints.audio).toStrictEqual(false)
            })

            it('should return audio === {}', async () => {
                const mediaConstraints = await getMediaConstraints({audio: {}, remoteSdp: SDP})
                expect(mediaConstraints.audio).toStrictEqual(false)
            })

            it('should return audio === {deviceId: { exact: "abcd" }}', async () => {
                const mediaConstraints = await getMediaConstraints({micId: 'abcd', remoteSdp: SDP})
                expect(mediaConstraints.audio).toStrictEqual(false)
            })
        })

        describe('SDP dont support video', () => {
            const SDP =
      'v=0\r\no=FreeSWITCH 1707233696 1707233697 IN IP4 190.102.98.211\r\ns=FreeSWITCH\r\nc=IN IP4 190.102.98.211\r\nt=0 0\r\na=msid-semantic: WMS xXtAEH0vyxeST9BACBkvRkF55amZ0EYo\r\nm=audio 19828 RTP/SAVPF 0 8 102\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:102 opus/48000/2\r\na=fmtp:102 useinbandfec=1; maxaveragebitrate=30000; maxplaybackrate=48000; ptime=20; minptime=10; maxptime=40\r\na=fingerprint:sha-256 0F:F7:47:2D:19:38:46:88:E7:42:2A:4B:53:53:F5:19:1B:DC:EF:8E:14:F7:44:79:ED:94:A7:1B:97:92:7F:C5\r\na=setup:actpass\r\na=rtcp-mux\r\na=rtcp:19828 IN IP4 190.102.98.211\r\na=ssrc:4043346828 cname:rhPWOFid3mVMmndP\r\na=ssrc:4043346828 msid:xXtAEH0vyxeST9BACBkvRkF55amZ0EYo a0\r\na=ssrc:4043346828 mslabel:xXtAEH0vyxeST9BACBkvRkF55amZ0EYo\r\na=ssrc:4043346828 label:xXtAEH0vyxeST9BACBkvRkF55amZ0EYoa0\r\na=ice-ufrag:OnbwxGrtGEix86Mq\r\na=ice-pwd:drdSXmVQzHtLVwrAKsW8Yerv\r\na=candidate:1409144412 1 udp 2130706431 190.102.98.211 19828 typ srflx raddr 172.17.0.2 rport 19828 generation 0\r\na=candidate:7363643456 1 udp 2130706431 172.17.0.2 19828 typ host generation 0\r\na=candidate:1409144412 2 udp 2130706430 190.102.98.211 19828 typ srflx raddr 172.17.0.2 rport 19828 generation 0\r\na=candidate:7363643456 2 udp 2130706430 172.17.0.2 19828 typ host generation 0\r\na=silenceSupp:off - - - -\r\na=ptime:20\r\na=sendrecv\r\n'
    
            it('should return video === false, case 1', async () => {
                const mediaConstraints = await getMediaConstraints({remoteSdp: SDP})
                expect(mediaConstraints.video).toStrictEqual(false)
            })

            it('should return video === false , case 2', async () => {
                const mediaConstraints = await getMediaConstraints({audio: {}, remoteSdp: SDP})
                expect(mediaConstraints.video).toStrictEqual(false)
            })

            it('should return audio === video === false , case 3', async () => {
                const mediaConstraints = await getMediaConstraints({camId: 'abcd', remoteSdp: SDP})
                expect(mediaConstraints.video).toStrictEqual(false)
        })
        })

        describe('SDP support audio & videos', () => {
            const SDP =
      'v=0\r\no=- 8094323291162995063 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0 1\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS 45Xh7kvyxccAi1fP6gpacCd2XY5IPfmp9zkU\r\nm=audio 51609 UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 110 112 113 126\r\nc=IN IP4 172.17.0.5\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=candidate:528442011 1 udp 2122260223 192.168.1.12 52783 typ host generation 0 network-id 1 network-cost 10\r\na=candidate:3788879375 1 tcp 1518280447 192.168.1.12 9 typ host tcptype active generation 0 network-id 1 network-cost 10\r\na=candidate:511643837 1 udp 1686052607 37.118.148.114 52783 typ srflx raddr 192.168.1.12 rport 52783 generation 0 network-id 1 network-cost 10\r\na=candidate:427329035 1 udp 25108479 172.17.0.5 51609 typ relay raddr 172.17.0.6 rport 49152 generation 0 network-id 1 network-cost 10\r\na=ice-ufrag:Yoii\r\na=ice-pwd:uMmennPss4DGhOvNYiKxQT7w\r\na=ice-options:trickle\r\na=fingerprint:sha-256 C4:62:01:34:2C:20:32:37:00:BE:DD:40:E7:03:DA:0E:57:A0:EB:30:DD:BD:98:20:11:3B:1C:00:FD:A6:3D:37\r\na=setup:actpass\r\na=mid:0\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=sendrecv\r\na=msid:45Xh7kvyxccAi1fP6gpacCd2XY5IPfmp9zkU 29e5d7e5-de01-4058-b202-929b7e454469\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:63 red/48000/2\r\na=fmtp:63 111/111\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:335962309 cname:7wjKGH97nM78eMmS\r\na=ssrc:335962309 msid:45Xh7kvyxccAi1fP6gpacCd2XY5IPfmp9zkU 29e5d7e5-de01-4058-b202-929b7e454469\r\nm=video 52560 UDP/TLS/RTP/SAVPF 96 97 102 122 127 121 125 107 108 109 124 120 39 40 45 46 98 99 100 101 123 119 114 115 116\r\nc=IN IP4 172.17.0.5\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=candidate:528442011 1 udp 2122260223 192.168.1.12 52673 typ host generation 0 network-id 1 network-cost 10\r\na=candidate:3788879375 1 tcp 1518280447 192.168.1.12 9 typ host tcptype active generation 0 network-id 1 network-cost 10\r\na=candidate:511643837 1 udp 1686052607 37.118.148.114 52673 typ srflx raddr 192.168.1.12 rport 52673 generation 0 network-id 1 network-cost 10\r\na=candidate:427329035 1 udp 25108479 172.17.0.5 52560 typ relay raddr 172.17.0.6 rport 49154 generation 0 network-id 1 network-cost 10\r\na=ice-ufrag:Yoii\r\na=ice-pwd:uMmennPss4DGhOvNYiKxQT7w\r\na=ice-options:trickle\r\na=fingerprint:sha-256 C4:62:01:34:2C:20:32:37:00:BE:DD:40:E7:03:DA:0E:57:A0:EB:30:DD:BD:98:20:11:3B:1C:00:FD:A6:3D:37\r\na=setup:actpass\r\na=mid:1\r\na=extmap:14 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:13 urn:3gpp:video-orientation\r\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space\r\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\r\na=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\r\na=sendrecv\r\na=msid:45Xh7kvyxccAi1fP6gpacCd2XY5IPfmp9zkU 95f5bd7e-f301-4349-aa8d-c493812cd7b0\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124\r\na=rtpmap:39 H264/90000\r\na=rtcp-fb:39 goog-remb\r\na=rtcp-fb:39 transport-cc\r\na=rtcp-fb:39 ccm fir\r\na=rtcp-fb:39 nack\r\na=rtcp-fb:39 nack pli\r\na=fmtp:39 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f\r\na=rtpmap:40 rtx/90000\r\na=fmtp:40 apt=39\r\na=rtpmap:45 AV1/90000\r\na=rtcp-fb:45 goog-remb\r\na=rtcp-fb:45 transport-cc\r\na=rtcp-fb:45 ccm fir\r\na=rtcp-fb:45 nack\r\na=rtcp-fb:45 nack pli\r\na=rtpmap:46 rtx/90000\r\na=fmtp:46 apt=45\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 VP9/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 profile-id=2\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:123 H264/90000\r\na=rtcp-fb:123 goog-remb\r\na=rtcp-fb:123 transport-cc\r\na=rtcp-fb:123 ccm fir\r\na=rtcp-fb:123 nack\r\na=rtcp-fb:123 nack pli\r\na=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123\r\na=rtpmap:114 red/90000\r\na=rtpmap:115 rtx/90000\r\na=fmtp:115 apt=114\r\na=rtpmap:116 ulpfec/90000\r\na=ssrc-group:FID 3973975883 3471156669\r\na=ssrc:3973975883 cname:7wjKGH97nM78eMmS\r\na=ssrc:3973975883 msid:45Xh7kvyxccAi1fP6gpacCd2XY5IPfmp9zkU 95f5bd7e-f301-4349-aa8d-c493812cd7b0\r\na=ssrc:3471156669 cname:7wjKGH97nM78eMmS\r\na=ssrc:3471156669 msid:45Xh7kvyxccAi1fP6gpacCd2XY5IPfmp9zkU 95f5bd7e-f301-4349-aa8d-c493812cd7b0\r\n'

            it('should return audio === true & video === false', async () => {
                const mediaConstraints = await getMediaConstraints({remoteSdp: SDP})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
                expect(mediaConstraints.video).toStrictEqual(false)
            })

            it('should return audio === true & video === true', async () => {
                const mediaConstraints = await getMediaConstraints({video: true, remoteSdp: SDP})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
                expect(mediaConstraints.video).toEqual({})
            })

            it('should return audio === {} & video === {}', async () => {
                const mediaConstraints = await getMediaConstraints({audio: {}, video: {}, remoteSdp: SDP})
                expect(mediaConstraints.audio).toEqual({"channelCount": 1})
                expect(mediaConstraints.video).toEqual({})
            })

            it('should return audio === {deviceId: { exact: "abcd" }} & video === {deviceId: { exact: "abcd" }}' , async () => {
                const mediaConstraints = await getMediaConstraints({micId: 'abcd', camId: 'abcd', remoteSdp: SDP})
                expect(mediaConstraints.audio).toEqual({deviceId: { exact: "abcd" }, channelCount: 1})
                expect(mediaConstraints.video).toEqual({deviceId: { exact: "abcd" }})
            })
        })
    })

    describe('getSenderAudioMaxBitrate', () => {
        it('should return 20000', () => {
            expect(getSenderAudioMaxBitrate({useStereo: false, maxOpusPlaybackRate: 8000}))
        })
        it('should return 40000', () => {
            expect(getSenderAudioMaxBitrate({useStereo: true, maxOpusPlaybackRate: 8000}))
        })
        it('should return 320000', () => {
            expect(getSenderAudioMaxBitrate({useStereo: false, maxOpusPlaybackRate: 16000}))
        })
        it('should return 640000', () => {
            expect(getSenderAudioMaxBitrate({useStereo: true, maxOpusPlaybackRate: 16000}))
        })
        it('should return 320000', () => {
            expect(getSenderAudioMaxBitrate({useStereo: false, maxOpusPlaybackRate: 32000}))
        })
        it('should return 640000', () => {
            expect(getSenderAudioMaxBitrate({useStereo: true, maxOpusPlaybackRate: 32000}))
        })
        it('should return 640000', () => {
            expect(getSenderAudioMaxBitrate({useStereo: false, maxOpusPlaybackRate: 48000}))
        })
        it('should return 1280000', () => {
            expect(getSenderAudioMaxBitrate({useStereo: true, maxOpusPlaybackRate: 48000}))
        })
    })
})