
> @sw-internal/e2e-js@0.0.20 dev
> sw-test --mode=playwright --pass-with-no-tests callfabric/badNetwork.spec.ts


Running 1 test using 1 worker

[bad-network-cf-member] [vite] connecting...
[bad-network-cf-member] [vite] connected.
>> Resource VideoRoom created: b97b11e4-3806-4101-9d1a-e532c9ca87ac e2e_3a695426-bd41-45ea-9bf5-665f59260094
[bad-network-cf-member] 2026-03-13T12:29:18.713Z - rootSaga [started]
[bad-network-cf-member] 2026-03-13T12:29:18.714Z - wsClientWorker started
[bad-network-cf-member] 2026-03-13T12:29:18.714Z - sessionSaga [started]
[bad-network-cf-member] 2026-03-13T12:29:18.991Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "a51adda3-4dc8-4965-b5e6-0ac213780703",
  "method": "signalwire.connect",
  "params": {
    "version": {
      "major": 4,
      "minor": 0,
      "revision": 0
    },
    "event_acks": true,
    "agent": "@signalwire/js/browser/3.29.2",
    "authentication": {
      "jwt_token": "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwidHlwIjoiU0FUIiwiY2giOiJwdWMuc2lnbmFsd2lyZS5jb20ifQ..0TJKIFo0C-TBKR31.7S8vn-3Mb-fVOqO8ghY4JcWr8q4s1FWHD_dmkIqFqsA8euIA6niKouw_QoQkoaPtgGBhyKQ6MqJiMWo61Lw5jm-tqXa2Qx7C-S_Oy1AbZDfMwle6UBvEd4bs27Dq5XAqF0wMLxOlOCajxddfnPIYkfbdijlZR2AxRh3uPeMz5mDUyG4xoUCZlOCWmJueju_X_lyq3Jh6lzijl-jJH1-QL5JJCqxkUPr6z5tsV7IsB7zhBtwpdfRxMbr03tLjQBZIY-Npc5swQDgWq4toWRZxgJBr2gueFoF33Zv2klWbmnv5w0eSgrLqb1xrpkQmPgtCWytw8bPFLbTfOGpw-q_rKhDSXy0SZBMDgtwZLmE8W_s8XPBwcIUKO9j2TtOIzA3b5Kaiq04xey2-frfzOwLKKJ1zz5vki4prmmVqg40DLK--Rk5JHujwrdwEJhYx8fNfLZX2UnumW9g2Aul-avrilpg.SvxwI0PMWJv1IN9TNl7UzA"
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:19.158Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "a51adda3-4dc8-4965-b5e6-0ac213780703",
  "result": {
    "identity": "f8d5bfff-ead3-4d31-82ab-3b4092c30d83@71f415da-5230-470d-bd71-84a9d766a9c1.us-west",
    "authorization": {
      "jti": "c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9",
      "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
      "data_zone": "us1",
      "fabric_subscriber": {
        "version": 1,
        "expires_at": 1773412158,
        "subscriber_id": "48fe0d0c-ac31-4222-93c9-39590ce92d78",
        "application_id": null,
        "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
        "space_id": "1dbcd266-717e-4ca6-887f-aba72abff270"
      }
    },
    "protocol": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "ice_servers": [
      {
        "urls": [
          "turn:turn.signalwire.com:443",
          "turn:turn.signalwire.com:443?transport=tcp"
        ],
        "credential": "Ukb6HQgm4vI0C9hnH2ShwZHOrF4=",
        "credentialType": "password",
        "username": "1773415758:cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed"
      }
    ]
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:19.162Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "93596c1f-e8f8-4ffe-b274-da1e59ca5106",
  "method": "signalwire.event",
  "params": {
    "event_type": "signalwire.authorization.state",
    "params": {
      "authorization_state": "uP1c4EIcR98voisDUp0xFjUGa9AgDFQaaPwuUdcSwiROfY1gdQ8sp29915ILkqNlseQOVzIW0RLoWT3m9FVG0OvmWZytPN0UElfQiISBlyNdvVpOpHYTPOJTMyCS7ucQ2hvsSiAcpOz9tFMwcGqhlwqH1q/8hhBgRu3YhyIjG6SH2XDSo727cnaF36gNlfnD3uBBch5njLFI4gtCl4c8+UZqZdW4KwPSBdj4C/b/L/emJkKjc3mheiQhwNh/zrIvTdwiPJUPk7XCMZPbMOglZ6FXA+hDWZBOQImrl/FIbzRsA4eMyfAKSHCUyXsybnCPbiNnlYkZarmTSfd4wXijRdh7o9KBno/qao/moAowMhxg34I0gCXoNAa+3T2sqSeqBgchFAddjdLlUDBVjCHOUv0Z3vq5xglkL5BiXu8lWeD367dG8l9OZKetXXPZwlStmx06RR9wQo+4ogaxUwUxpm6gnM/nbAIxNmeIeSu2YrYbAhXzS2JbB7GChNtGLFX6qdYsmKKMqe5FedL8muW8doOc9IxE/bgiJC3Ka611EgErDtC+eSAz+Re04XrPqFOuIqEqgz6NFFZL6GeslxPea7OVrA4SDrrN:wpgiSa8yapbXROjcZ77SWg=="
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:19.162Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "93596c1f-e8f8-4ffe-b274-da1e59ca5106",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:19.165Z - RTCService.getUserMedia {audio: Object, video: Object}
[bad-network-cf-member] 2026-03-13T12:29:19.209Z - iceGatheringState new
[bad-network-cf-member] 2026-03-13T12:29:19.719Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "00d07d6a-689e-4293-9fb2-e85fc142fa44",
  "method": "webrtc.verto",
  "params": {
    "message": {
      "jsonrpc": "2.0",
      "id": "6825b93d-7ce6-4b89-b61a-10d6be3cc4df",
      "method": "verto.invite",
      "params": {
        "dialogParams": {
          "attach": false,
          "reattaching": false,
          "screenShare": false,
          "additionalDevice": false,
          "pingSupported": true,
          "version": 1000,
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
          "destination_number": "/public/e2e_3a695426-bd41-45ea-9bf5-665f59260094?channel=video",
          "remote_caller_id_name": "Outbound Call",
          "remote_caller_id_number": "",
          "caller_id_name": "",
          "caller_id_number": ""
        },
        "sdp": "v=0\r\no=- 3589109278296595955 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0 1\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS aa0068a6-f0f6-4b72-8b14-fac972bc5422\r\nm=audio 30310 UDP/TLS/RTP/SAVPF 111 63 9 0 8 110 126\r\nc=IN IP4 137.184.96.20\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=candidate:4026497917 1 udp 1677729535 201.17.208.139 21743 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999\r\na=candidate:2707694335 1 udp 33562879 137.184.96.20 30310 typ relay raddr 201.17.208.139 rport 21743 generation 0 network-cost 999\r\na=candidate:1198843993 1 udp 16785407 104.131.13.246 38175 typ relay raddr 201.17.208.139 rport 21760 generation 0 network-cost 999\r\na=candidate:1198843993 1 udp 16785407 104.131.13.246 41984 typ relay raddr 201.17.208.139 rport 21763 generation 0 network-cost 999\r\na=ice-ufrag:7RQW\r\na=ice-pwd:PnRyLGtGKJ1QtyEEEChuq8db\r\na=ice-options:trickle\r\na=fingerprint:sha-256 DC:03:36:A0:7D:32:32:6D:50:21:04:B3:64:4C:A7:18:7D:73:DB:03:1D:74:58:B5:BF:89:D3:47:A0:CE:41:80\r\na=setup:actpass\r\na=mid:0\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=sendrecv\r\na=msid:aa0068a6-f0f6-4b72-8b14-fac972bc5422 eeb9f948-15a4-4a01-ba1a-3e705b1f5385\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:63 red/48000/2\r\na=fmtp:63 111/111\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:245090632 cname:ElANpyvtusrpjr3e\r\na=ssrc:245090632 msid:aa0068a6-f0f6-4b72-8b14-fac972bc5422 eeb9f948-15a4-4a01-ba1a-3e705b1f5385\r\nm=video 37143 UDP/TLS/RTP/SAVPF 96 97 39 40 98 99 100 101 103 104 107\r\nc=IN IP4 137.184.96.20\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=candidate:4026497917 1 udp 1677729535 201.17.208.139 21750 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999\r\na=candidate:2707694335 1 udp 33562879 137.184.96.20 37143 typ relay raddr 201.17.208.139 rport 21750 generation 0 network-cost 999\r\na=candidate:1198843993 1 udp 16785407 104.131.13.246 35192 typ relay raddr 201.17.208.139 rport 21753 generation 0 network-cost 999\r\na=candidate:1198843993 1 udp 16785407 104.131.13.246 33574 typ relay raddr 201.17.208.139 rport 21765 generation 0 network-cost 999\r\na=ice-ufrag:7RQW\r\na=ice-pwd:PnRyLGtGKJ1QtyEEEChuq8db\r\na=ice-options:trickle\r\na=fingerprint:sha-256 DC:03:36:A0:7D:32:32:6D:50:21:04:B3:64:4C:A7:18:7D:73:DB:03:1D:74:58:B5:BF:89:D3:47:A0:CE:41:80\r\na=setup:actpass\r\na=mid:1\r\na=extmap:14 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:13 urn:3gpp:video-orientation\r\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space\r\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\r\na=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\r\na=sendrecv\r\na=msid:aa0068a6-f0f6-4b72-8b14-fac972bc5422 f015c165-10ea-403d-b22a-639fc1574190\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:39 AV1/90000\r\na=rtcp-fb:39 goog-remb\r\na=rtcp-fb:39 transport-cc\r\na=rtcp-fb:39 ccm fir\r\na=rtcp-fb:39 nack\r\na=rtcp-fb:39 nack pli\r\na=fmtp:39 level-idx=5;profile=0;tier=0\r\na=rtpmap:40 rtx/90000\r\na=fmtp:40 apt=39\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 VP9/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 profile-id=2\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:103 red/90000\r\na=rtpmap:104 rtx/90000\r\na=fmtp:104 apt=103\r\na=rtpmap:107 ulpfec/90000\r\na=ssrc-group:FID 2502655737 3055166496\r\na=ssrc:2502655737 cname:ElANpyvtusrpjr3e\r\na=ssrc:2502655737 msid:aa0068a6-f0f6-4b72-8b14-fac972bc5422 f015c165-10ea-403d-b22a-639fc1574190\r\na=ssrc:3055166496 cname:ElANpyvtusrpjr3e\r\na=ssrc:3055166496 msid:aa0068a6-f0f6-4b72-8b14-fac972bc5422 f015c165-10ea-403d-b22a-639fc1574190\r\n"
      }
    },
    "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
    "subscribe": [
      "track",
      "destroy",
      "member.updated.videoMuted",
      "layout.changed",
      "room.subscribed",
      "member.updated.audioMuted",
      "room.joined"
    ]
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:20.097Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "a16eb466-06b0-46a5-b711-46473f1da3c9",
  "method": "signalwire.event",
  "params": {
    "event_type": "signalwire.authorization.state",
    "params": {
      "authorization_state": "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:MAsE7mloiqoL5KQZEuBvFA=="
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:20.098Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "a16eb466-06b0-46a5-b711-46473f1da3c9",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:20.974Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "00d07d6a-689e-4293-9fb2-e85fc142fa44",
  "result": {
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "result": {
      "jsonrpc": "2.0",
      "id": "6825b93d-7ce6-4b89-b61a-10d6be3cc4df",
      "result": {
        "message": "CALL CREATED",
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "memberID": "0851dc8c-4efc-4a22-baaa-26d64167e3ce"
      }
    },
    "code": "200"
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:21.482Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "c2db5872-f9e9-430a-adba-46f1ec2b7d79",
  "method": "signalwire.event",
  "params": {
    "event_type": "webrtc.message",
    "event_channel": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "timestamp": 1773404961.023884,
    "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "params": {
      "jsonrpc": "2.0",
      "id": 18819,
      "method": "verto.answer",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "sdp": "v=0\r\no=FreeSWITCH 1773389215 1773389216 IN IP4 161.35.1.12\r\ns=FreeSWITCH\r\nc=IN IP4 161.35.1.12\r\nt=0 0\r\na=msid-semantic: WMS Zdq5Ahha4z47lv7LrAYlsz4fqNj5PIxO\r\nm=audio 15746 UDP/TLS/RTP/SAVPF 111 110\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 useinbandfec=1; maxaveragebitrate=30000; maxplaybackrate=48000; sprop-maxcapturerate=48000; ptime=20; minptime=10; maxptime=40\r\na=rtpmap:110 telephone-event/48000\r\na=silenceSupp:off - - - -\r\na=ptime:20\r\na=sendrecv\r\na=fingerprint:sha-256 E0:33:E1:AB:C1:11:A7:7F:19:62:D0:FF:07:22:7A:7B:87:76:0E:B4:B7:ED:16:9F:72:0E:F6:A7:6A:5B:BC:87\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:15746 IN IP4 161.35.1.12\r\na=ice-ufrag:SqakFEFkoGU823DR\r\na=ice-pwd:7GHJ5oBtKZceSYbjMn8KPMMj\r\na=candidate:8224023402 1 udp 2130706431 161.35.1.12 15746 typ srflx raddr 172.17.0.2 rport 15746 generation 0\r\na=candidate:2348797394 1 udp 2130706431 172.17.0.2 15746 typ host generation 0\r\na=end-of-candidates\r\na=ssrc:111730392 cname:KFhgoQWV4tl2tHCV\r\na=ssrc:111730392 msid:Zdq5Ahha4z47lv7LrAYlsz4fqNj5PIxO a0\r\na=ssrc:111730392 mslabel:Zdq5Ahha4z47lv7LrAYlsz4fqNj5PIxO\r\na=ssrc:111730392 label:Zdq5Ahha4z47lv7LrAYlsz4fqNj5PIxOa0\r\nm=video 10928 UDP/TLS/RTP/SAVPF 96\r\nb=AS:2580\r\na=rtpmap:96 VP8/90000\r\na=extmap:2/recvonly http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=sendrecv\r\na=fingerprint:sha-256 E0:33:E1:AB:C1:11:A7:7F:19:62:D0:FF:07:22:7A:7B:87:76:0E:B4:B7:ED:16:9F:72:0E:F6:A7:6A:5B:BC:87\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:10928 IN IP4 161.35.1.12\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtcp-fb:96 transport-cc\r\na=ssrc:3520017624 cname:KFhgoQWV4tl2tHCV\r\na=ssrc:3520017624 msid:Zdq5Ahha4z47lv7LrAYlsz4fqNj5PIxO v0\r\na=ssrc:3520017624 mslabel:Zdq5Ahha4z47lv7LrAYlsz4fqNj5PIxO\r\na=ssrc:3520017624 label:Zdq5Ahha4z47lv7LrAYlsz4fqNj5PIxOv0\r\na=ice-ufrag:5ZRK7AXuTvs61ee4\r\na=ice-pwd:iajCJvDDJg9tzNOK4ZUNPSaF\r\na=candidate:4900250355 1 udp 2130706431 161.35.1.12 10928 typ srflx raddr 172.17.0.2 rport 10928 generation 0\r\na=candidate:2699254528 1 udp 2130706431 172.17.0.2 10928 typ host generation 0\r\na=end-of-candidates\r\n"
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:21.483Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "c2db5872-f9e9-430a-adba-46f1ec2b7d79",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:21.483Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "da960756-cc34-47bd-a433-36c80767c8ad",
  "method": "webrtc.verto",
  "params": {
    "message": {
      "jsonrpc": "2.0",
      "id": 18819,
      "result": {
        "method": "verto.answer"
      }
    },
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:22.051Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "da960756-cc34-47bd-a433-36c80767c8ad",
  "result": {
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "result": {},
    "code": "200"
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:22.837Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "b2afe914-e422-4e8e-b528-563a852ae9c4",
  "method": "signalwire.event",
  "params": {
    "event_type": "webrtc.message",
    "event_channel": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "timestamp": 1773404962.640285,
    "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "params": {
      "jsonrpc": "2.0",
      "id": 18820,
      "method": "verto.mediaParams",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "mediaParams": {
          "audio": {
            "autoGainControl": true,
            "echoCancellation": true,
            "noiseSuppression": true
          }
        }
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:22.837Z - Apply audio constraints d48b471d-7dea-4ff3-ab3c-0b49a54356f6 {autoGainControl: true, echoCancellation: true, noiseSuppression: true, deviceId: Object}
[bad-network-cf-member] 2026-03-13T12:29:22.838Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "b2afe914-e422-4e8e-b528-563a852ae9c4",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:23.030Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "0cad34d6-0e43-499f-b994-86ea7420ac2c",
  "method": "signalwire.event",
  "params": {
    "event_type": "webrtc.message",
    "event_channel": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "timestamp": 1773404962.879963,
    "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "params": {
      "jsonrpc": "2.0",
      "id": 18822,
      "method": "verto.mediaParams",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "mediaParams": {
          "video": {
            "frameRate": {
              "min": 10,
              "ideal": 20,
              "max": 20
            },
            "aspectRatio": {
              "exact": 1.777778
            },
            "width": {
              "min": 1280,
              "ideal": 1280
            },
            "height": {
              "min": 720,
              "ideal": 720
            },
            "advanced": [
              {
                "width": {
                  "min": 1280,
                  "ideal": 1280
                },
                "height": {
                  "min": 720,
                  "ideal": 720
                },
                "frameRate": {
                  "min": 10,
                  "ideal": 20,
                  "max": 20
                }
              }
            ],
            "resizeMode": "none"
          }
        }
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.030Z - Apply video constraints d48b471d-7dea-4ff3-ab3c-0b49a54356f6 {aspectRatio: Object, height: Object, width: Object, frameRate: Object, advanced: Array(1)}
[bad-network-cf-member] 2026-03-13T12:29:23.031Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "0cad34d6-0e43-499f-b994-86ea7420ac2c",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:23.095Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "80e1d7f0-3702-46ca-9c5a-e7d829a8d637",
  "method": "signalwire.event",
  "params": {
    "params": {
      "room_session": {
        "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
        "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
        "event_channel": "354629dc-9dcc-485d-897f-3af3bfbe6768",
        "name": "relay/participant/cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed/354629dc-9dcc-485d-897f-3af3bfbe6768",
        "layout_name": "grid-responsive",
        "display_name": "relay/participant/cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed/354629dc-9dcc-485d-897f-3af3bfbe6768",
        "recording": false,
        "streaming": false,
        "prioritize_handraise": false,
        "hide_video_muted": false,
        "locked": false,
        "meta": {},
        "members": [
          {
            "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
            "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
            "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
            "call_id": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
            "name": "whatever",
            "type": "member",
            "handraised": false,
            "visible": false,
            "audio_muted": false,
            "video_muted": false,
            "deaf": false,
            "input_volume": 0,
            "output_volume": 0,
            "input_sensitivity": 200,
            "echo_cancellation": true,
            "auto_gain": true,
            "noise_suppression": true,
            "lowbitrate": false,
            "denoise": false,
            "meta": {},
            "subscriber_id": "48fe0d0c-ac31-4222-93c9-39590ce92d78",
            "address_id": "b7804d51-7f11-47e2-b6a5-dbef00c01d72",
            "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
          }
        ],
        "recordings": [],
        "streams": [],
        "playbacks": []
      },
      "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
      "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
      "call_id": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
      "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
      "capabilities": [
        "self",
        "member",
        "vmuted",
        "layout",
        "digit",
        "screenshare",
        "device",
        "lock",
        "end"
      ],
      "origin_call_id": "139bb555-d6f3-48f4-95aa-d13738ca5d43"
    },
    "event_type": "call.joined",
    "event_channel": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "timestamp": 1773404962762454
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.096Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "80e1d7f0-3702-46ca-9c5a-e7d829a8d637",
  "result": {}
} 

Waiting for MCU video to be visible...
[bad-network-cf-member] 2026-03-13T12:29:23.096Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "a5681a72-827d-4d38-8a6e-2d707a48853e",
  "method": "signalwire.event",
  "params": {
    "params": {
      "member": {
        "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
        "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
        "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
        "call_id": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "name": "whatever",
        "type": "member",
        "handraised": false,
        "visible": false,
        "audio_muted": false,
        "video_muted": false,
        "deaf": false,
        "input_volume": 0,
        "output_volume": 0,
        "input_sensitivity": 11,
        "echo_cancellation": true,
        "auto_gain": true,
        "noise_suppression": true,
        "lowbitrate": false,
        "denoise": false,
        "meta": {},
        "subscriber_id": "48fe0d0c-ac31-4222-93c9-39590ce92d78",
        "address_id": "b7804d51-7f11-47e2-b6a5-dbef00c01d72",
        "updated": [
          "input_sensitivity"
        ],
        "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
      },
      "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
      "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768"
    },
    "event_type": "member.updated",
    "event_channel": [
      "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed"
    ],
    "timestamp": 1773404962780260
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.097Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "a5681a72-827d-4d38-8a6e-2d707a48853e",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:23.097Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "1b90383b-e0c7-4f78-a13a-755908789208",
  "method": "signalwire.event",
  "params": {
    "params": {
      "member": {
        "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
        "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
        "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
        "call_id": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "name": "whatever",
        "type": "member",
        "handraised": false,
        "visible": true,
        "audio_muted": false,
        "video_muted": false,
        "deaf": false,
        "input_volume": 0,
        "output_volume": 0,
        "input_sensitivity": 11,
        "echo_cancellation": true,
        "auto_gain": true,
        "noise_suppression": true,
        "lowbitrate": false,
        "denoise": false,
        "meta": {},
        "subscriber_id": "48fe0d0c-ac31-4222-93c9-39590ce92d78",
        "address_id": "b7804d51-7f11-47e2-b6a5-dbef00c01d72",
        "updated": [
          "visible"
        ],
        "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
      },
      "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
      "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768"
    },
    "event_type": "member.updated",
    "event_channel": [
      "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed"
    ],
    "timestamp": 1773404962799897
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.097Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "1b90383b-e0c7-4f78-a13a-755908789208",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:23.098Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "38e1a150-060a-45bf-ba41-3b7894df7806",
  "method": "signalwire.event",
  "params": {
    "event_type": "layout.changed",
    "event_channel": [
      "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed"
    ],
    "timestamp": 1773404962922718,
    "params": {
      "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
      "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
      "layout": {
        "layers": [
          {
            "layer_index": 0,
            "z_index": 0,
            "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
            "playing_file": false,
            "position": "standard-1",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          },
          {
            "layer_index": 1,
            "z_index": 1,
            "playing_file": false,
            "position": "playback",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          },
          {
            "layer_index": 2,
            "z_index": 2,
            "playing_file": false,
            "position": "full-screen",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          }
        ],
        "id": "grid-responsive",
        "name": "Grid"
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.099Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "38e1a150-060a-45bf-ba41-3b7894df7806",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:23.411Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "9142304b-43aa-41dd-aec0-25ec2ddff941",
  "method": "signalwire.event",
  "params": {
    "event_type": "conversation.message",
    "event_channel": "sw_ics_48fe0d0c-ac31-4222-93c9-39590ce92d78",
    "params": {
      "id": "5c24fb7e-e128-4690-ab1c-06abe710934b",
      "type": "message",
      "subtype": "update",
      "kind": "outbound_call",
      "hidden": true,
      "group_id": "sw_b7804d51-7f11-47e2-b6a5-dbef00c01d72",
      "from_fabric_address_id": "164868fb-5361-4a57-9cbc-bf469c39065b",
      "ts": 1773404963.018339,
      "metadata": {},
      "details": {
        "status": "joined",
        "start_time": 1773404962
      },
      "text": null,
      "conversation_name": "e2e_3a695426-bd41-45ea-9bf5-665f59260094",
      "user_name": "whatever"
    },
    "timestamp": "1773404963.018339",
    "is_author": true
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.412Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "9142304b-43aa-41dd-aec0-25ec2ddff941",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:23.419Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "1eb269c3-94ec-4b57-9def-6dc8ea3e2479",
  "method": "signalwire.event",
  "params": {
    "event_type": "layout.changed",
    "event_channel": [
      "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed"
    ],
    "timestamp": 1773404963223261,
    "params": {
      "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
      "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
      "layout": {
        "layers": [
          {
            "layer_index": 0,
            "z_index": 0,
            "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
            "playing_file": false,
            "position": "standard-1",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          },
          {
            "layer_index": 1,
            "z_index": 1,
            "playing_file": false,
            "position": "playback",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          },
          {
            "layer_index": 2,
            "z_index": 2,
            "playing_file": false,
            "position": "full-screen",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          }
        ],
        "id": "grid-responsive",
        "name": "Grid"
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.420Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "1eb269c3-94ec-4b57-9def-6dc8ea3e2479",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:23.751Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "7d6f7fbd-2aef-4d91-a502-20df1866db0f",
  "method": "signalwire.event",
  "params": {
    "event_type": "layout.changed",
    "event_channel": [
      "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed"
    ],
    "timestamp": 1773404963567788,
    "params": {
      "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
      "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
      "layout": {
        "layers": [
          {
            "layer_index": 0,
            "z_index": 0,
            "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
            "playing_file": false,
            "position": "standard-1",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          },
          {
            "layer_index": 1,
            "z_index": 1,
            "playing_file": false,
            "position": "playback",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          },
          {
            "layer_index": 2,
            "z_index": 2,
            "playing_file": false,
            "position": "full-screen",
            "visible": true,
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100
          }
        ],
        "id": "grid-responsive",
        "name": "Grid"
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.752Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "7d6f7fbd-2aef-4d91-a502-20df1866db0f",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:23.856Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "8e013864-42d3-48ae-99bb-7bdf862cb6c5",
  "method": "signalwire.event",
  "params": {
    "event_type": "member.talking",
    "event_channel": [
      "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed"
    ],
    "timestamp": 1773404963639893,
    "params": {
      "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
      "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
      "member": {
        "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
        "talking": true,
        "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:23.856Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "8e013864-42d3-48ae-99bb-7bdf862cb6c5",
  "result": {}
} 

Simulate network down..
Simulate network up..
[bad-network-cf-member] 2026-03-13T12:29:43.132Z - RECV: 
 {jsonrpc: 2.0, id: 1350f3af-3fce-4db8-9b0e-07b6e16f0da9, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:29:43.132Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "1350f3af-3fce-4db8-9b0e-07b6e16f0da9",
  "result": {
    "timestamp": 1773404968.9105916
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:43.132Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "01367dcb-d64f-4965-a34a-bd8f3bb4cdb8",
  "method": "signalwire.event",
  "params": {
    "event_type": "webrtc.message",
    "event_channel": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "timestamp": 1773404970.144472,
    "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "params": {
      "jsonrpc": "2.0",
      "id": 18829,
      "method": "verto.ping",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "dialogParams": {
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43"
        }
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:43.133Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "01367dcb-d64f-4965-a34a-bd8f3bb4cdb8",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:29:43.133Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "258e6a67-ca69-4331-83c6-19af7a11491b",
  "method": "webrtc.verto",
  "params": {
    "message": {
      "jsonrpc": "2.0",
      "id": "136ca85c-814e-4371-b073-4d8da4faafbc",
      "method": "verto.pong",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "dialogParams": {
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43"
        }
      }
    },
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:43.133Z - Symbol(sw-execute-connection-closed)
[bad-network-cf-member] 2026-03-13T12:29:46.426Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "0388f664-35ae-409d-82ae-94618c7fbb01",
  "method": "signalwire.connect",
  "params": {
    "version": {
      "major": 4,
      "minor": 0,
      "revision": 0
    },
    "event_acks": true,
    "agent": "@signalwire/js/browser/3.29.2",
    "authentication": {
      "jwt_token": "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwidHlwIjoiU0FUIiwiY2giOiJwdWMuc2lnbmFsd2lyZS5jb20ifQ..0TJKIFo0C-TBKR31.7S8vn-3Mb-fVOqO8ghY4JcWr8q4s1FWHD_dmkIqFqsA8euIA6niKouw_QoQkoaPtgGBhyKQ6MqJiMWo61Lw5jm-tqXa2Qx7C-S_Oy1AbZDfMwle6UBvEd4bs27Dq5XAqF0wMLxOlOCajxddfnPIYkfbdijlZR2AxRh3uPeMz5mDUyG4xoUCZlOCWmJueju_X_lyq3Jh6lzijl-jJH1-QL5JJCqxkUPr6z5tsV7IsB7zhBtwpdfRxMbr03tLjQBZIY-Npc5swQDgWq4toWRZxgJBr2gueFoF33Zv2klWbmnv5w0eSgrLqb1xrpkQmPgtCWytw8bPFLbTfOGpw-q_rKhDSXy0SZBMDgtwZLmE8W_s8XPBwcIUKO9j2TtOIzA3b5Kaiq04xey2-frfzOwLKKJ1zz5vki4prmmVqg40DLK--Rk5JHujwrdwEJhYx8fNfLZX2UnumW9g2Aul-avrilpg.SvxwI0PMWJv1IN9TNl7UzA"
    },
    "protocol": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "authorization_state": "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:MAsE7mloiqoL5KQZEuBvFA=="
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:46.601Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "0388f664-35ae-409d-82ae-94618c7fbb01",
  "result": {
    "identity": "43deaaf9-7095-4c17-a2d1-51d97941123b@71f415da-5230-470d-bd71-84a9d766a9c1.us-west",
    "authorization": {
      "jti": "c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9",
      "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
      "data_zone": "us1",
      "fabric_subscriber": {
        "version": 1,
        "expires_at": 1773412158,
        "subscriber_id": "48fe0d0c-ac31-4222-93c9-39590ce92d78",
        "application_id": null,
        "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
        "space_id": "1dbcd266-717e-4ca6-887f-aba72abff270"
      },
      "calling": {
        "video_conf": {
          "type": "video",
          "space_id": "1dbcd266-717e-4ca6-887f-aba72abff270",
          "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
          "project": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
          "scopes": [
            "video"
          ],
          "scope_id": "47590a41-c8cd-4d7e-809c-3f6aaa86fbfa",
          "resource": "e9de3e94-7137-439c-9407-506e3c9cd46b",
          "join_as": "member",
          "user_name": "whatever",
          "join_until": 1773412159,
          "join_from": null,
          "remove_at": null,
          "remove_after_seconds_elapsed": null,
          "end_room_session_on_leave": null,
          "auto_create_room": false,
          "meta": null,
          "audio_allowed": "both",
          "video_allowed": "both",
          "room": {
            "name": "e2e_3a695426-bd41-45ea-9bf5-665f59260094",
            "display_name": "e2e_3a695426-bd41-45ea-9bf5-665f59260094",
            "scopes": [
              "room.member.audio_mute",
              "room.member.audio_unmute",
              "room.member.video_mute",
              "room.member.video_unmute",
              "room.member.deaf",
              "room.member.undeaf",
              "room.member.set_input_volume",
              "room.member.set_output_volume",
              "room.member.set_input_sensitivity",
              "room.member.set_position",
              "room.member.set_meta",
              "room.member.raisehand",
              "room.member.lowerhand",
              "room.member.remove",
              "room.member.promote",
              "room.member.demote",
              "room.hide_video_muted",
              "room.list_available_layouts",
              "room.lock",
              "room.playback",
              "room.playback_seek",
              "room.prioritize_handraise",
              "room.recording",
              "room.set_layout",
              "room.set_position",
              "room.set_meta",
              "room.show_video_muted",
              "room.stream",
              "room.unlock",
              "room.self.audio_mute",
              "room.self.audio_unmute",
              "room.self.video_mute",
              "room.self.video_unmute",
              "room.self.deaf",
              "room.self.undeaf",
              "room.self.set_input_volume",
              "room.self.set_output_volume",
              "room.self.set_input_sensitivity",
              "room.self.set_position",
              "room.self.set_meta",
              "room.self.raisehand",
              "room.self.lowerhand",
              "room.self.screenshare",
              "room.self.additional_source"
            ],
            "join_video_muted": false
          },
          "signature": "a3856322363f88882710e496dfdb513accc2b186fefa9a74629ebbb1afa28f3f",
          "fabric_address_id": "b7804d51-7f11-47e2-b6a5-dbef00c01d72",
          "fabric_subscriber_name": "whatever",
          "from_fabric_address_id": "164868fb-5361-4a57-9cbc-bf469c39065b",
          "fabric_user_type": "subscriber",
          "fabric_source": "fabric_video_conference"
        },
        "version": 1
      },
      "video_conf": {
        "type": "video",
        "space_id": "1dbcd266-717e-4ca6-887f-aba72abff270",
        "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
        "project": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
        "scopes": [
          "video"
        ],
        "scope_id": "47590a41-c8cd-4d7e-809c-3f6aaa86fbfa",
        "resource": "e9de3e94-7137-439c-9407-506e3c9cd46b",
        "join_as": "member",
        "user_name": "whatever",
        "join_until": 1773412159,
        "join_from": null,
        "remove_at": null,
        "remove_after_seconds_elapsed": null,
        "end_room_session_on_leave": null,
        "auto_create_room": false,
        "meta": null,
        "audio_allowed": "both",
        "video_allowed": "both",
        "room": {
          "name": "e2e_3a695426-bd41-45ea-9bf5-665f59260094",
          "display_name": "e2e_3a695426-bd41-45ea-9bf5-665f59260094",
          "scopes": [
            "room.member.audio_mute",
            "room.member.audio_unmute",
            "room.member.video_mute",
            "room.member.video_unmute",
            "room.member.deaf",
            "room.member.undeaf",
            "room.member.set_input_volume",
            "room.member.set_output_volume",
            "room.member.set_input_sensitivity",
            "room.member.set_position",
            "room.member.set_meta",
            "room.member.raisehand",
            "room.member.lowerhand",
            "room.member.remove",
            "room.member.promote",
            "room.member.demote",
            "room.hide_video_muted",
            "room.list_available_layouts",
            "room.lock",
            "room.playback",
            "room.playback_seek",
            "room.prioritize_handraise",
            "room.recording",
            "room.set_layout",
            "room.set_position",
            "room.set_meta",
            "room.show_video_muted",
            "room.stream",
            "room.unlock",
            "room.self.audio_mute",
            "room.self.audio_unmute",
            "room.self.video_mute",
            "room.self.video_unmute",
            "room.self.deaf",
            "room.self.undeaf",
            "room.self.set_input_volume",
            "room.self.set_output_volume",
            "room.self.set_input_sensitivity",
            "room.self.set_position",
            "room.self.set_meta",
            "room.self.raisehand",
            "room.self.lowerhand",
            "room.self.screenshare",
            "room.self.additional_source"
          ],
          "join_video_muted": false
        },
        "signature": "a3856322363f88882710e496dfdb513accc2b186fefa9a74629ebbb1afa28f3f",
        "fabric_address_id": "b7804d51-7f11-47e2-b6a5-dbef00c01d72",
        "fabric_subscriber_name": "whatever",
        "from_fabric_address_id": "164868fb-5361-4a57-9cbc-bf469c39065b",
        "fabric_user_type": "subscriber",
        "fabric_source": "fabric_video_conference"
      }
    },
    "protocol": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "ice_servers": [
      {
        "urls": [
          "turn:turn.signalwire.com:443",
          "turn:turn.signalwire.com:443?transport=tcp"
        ],
        "credential": "Ukb6HQgm4vI0C9hnH2ShwZHOrF4=",
        "credentialType": "password",
        "username": "1773415758:cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed"
      }
    ]
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:46.601Z - [resume] Call d48b471d-7dea-4ff3-ab3c-0b49a54356f6
[bad-network-cf-member] 2026-03-13T12:29:46.602Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "258e6a67-ca69-4331-83c6-19af7a11491b",
  "method": "webrtc.verto",
  "params": {
    "message": {
      "jsonrpc": "2.0",
      "id": "136ca85c-814e-4371-b073-4d8da4faafbc",
      "method": "verto.pong",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "dialogParams": {
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43"
        }
      }
    },
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:47.146Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "258e6a67-ca69-4331-83c6-19af7a11491b",
  "result": {
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "result": {
      "jsonrpc": "2.0",
      "id": "136ca85c-814e-4371-b073-4d8da4faafbc",
      "result": {}
    },
    "code": "200"
  }
} 

[bad-network-cf-member] 2026-03-13T12:29:56.430Z - RECV: 
 {jsonrpc: 2.0, id: 41e6cd6d-0d6b-4707-be29-c67db6a029f6, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:29:56.430Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "41e6cd6d-0d6b-4707-be29-c67db6a029f6",
  "result": {
    "timestamp": 1773404996.3464527
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:06.430Z - RECV: 
 {jsonrpc: 2.0, id: d47565d3-eedb-436c-8009-b20f96768823, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:30:06.430Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "d47565d3-eedb-436c-8009-b20f96768823",
  "result": {
    "timestamp": 1773405006.348441
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:16.361Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "11ea2cbc-6318-45bd-942d-1af98da7b579",
  "method": "signalwire.event",
  "params": {
    "event_type": "webrtc.message",
    "event_channel": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "timestamp": 1773405016.158538,
    "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "params": {
      "jsonrpc": "2.0",
      "id": 18830,
      "method": "verto.ping",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "dialogParams": {
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43"
        }
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:16.361Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "11ea2cbc-6318-45bd-942d-1af98da7b579",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:30:16.361Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "c9a55973-f417-412b-b781-c8c558f3cc0e",
  "method": "webrtc.verto",
  "params": {
    "message": {
      "jsonrpc": "2.0",
      "id": "1726448f-c6b7-468f-85db-f14b016101db",
      "method": "verto.pong",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "dialogParams": {
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43"
        }
      }
    },
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:16.431Z - RECV: 
 {jsonrpc: 2.0, id: 86caa3d7-2be5-48cf-9894-9d05cc8f2b7b, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:30:16.432Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "86caa3d7-2be5-48cf-9894-9d05cc8f2b7b",
  "result": {
    "timestamp": 1773405016.3504436
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:16.909Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "c9a55973-f417-412b-b781-c8c558f3cc0e",
  "result": {
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "result": {
      "jsonrpc": "2.0",
      "id": "1726448f-c6b7-468f-85db-f14b016101db",
      "result": {}
    },
    "code": "200"
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:26.435Z - RECV: 
 {jsonrpc: 2.0, id: e9e7484d-973e-4c88-be4f-b3a73e254299, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:30:26.435Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "e9e7484d-973e-4c88-be4f-b3a73e254299",
  "result": {
    "timestamp": 1773405026.3519945
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:36.436Z - RECV: 
 {jsonrpc: 2.0, id: 0956e0f5-3829-45b0-bdb9-19f2a7c7c566, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:30:36.436Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "0956e0f5-3829-45b0-bdb9-19f2a7c7c566",
  "result": {
    "timestamp": 1773405036.3537648
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:46.438Z - RECV: 
 {jsonrpc: 2.0, id: f4daa4ee-12d8-477d-9749-bee8a9cb5ceb, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:30:46.438Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "f4daa4ee-12d8-477d-9749-bee8a9cb5ceb",
  "result": {
    "timestamp": 1773405046.355616
  }
} 

[bad-network-cf-member] 2026-03-13T12:30:56.441Z - RECV: 
 {jsonrpc: 2.0, id: 0b735b8b-ecee-4d14-8975-52f52b290361, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:30:56.441Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "0b735b8b-ecee-4d14-8975-52f52b290361",
  "result": {
    "timestamp": 1773405056.3574123
  }
} 

[bad-network-cf-member] 2026-03-13T12:31:02.322Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "4a865e41-f5b5-4279-bb8f-860a6834eee2",
  "method": "signalwire.event",
  "params": {
    "event_type": "webrtc.message",
    "event_channel": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "timestamp": 1773405062.170831,
    "project_id": "cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "params": {
      "jsonrpc": "2.0",
      "id": 18831,
      "method": "verto.ping",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "dialogParams": {
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43"
        }
      }
    }
  }
} 

[bad-network-cf-member] 2026-03-13T12:31:02.323Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "4a865e41-f5b5-4279-bb8f-860a6834eee2",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:31:02.323Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "dbfdca35-76f5-49bf-ad18-efaafbff7cfd",
  "method": "webrtc.verto",
  "params": {
    "message": {
      "jsonrpc": "2.0",
      "id": "60c2042f-89bb-48f0-b661-f005cfda62cf",
      "method": "verto.pong",
      "params": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "dialogParams": {
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43"
        }
      }
    },
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
  }
} 

[bad-network-cf-member] 2026-03-13T12:31:02.961Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "dbfdca35-76f5-49bf-ad18-efaafbff7cfd",
  "result": {
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "result": {
      "jsonrpc": "2.0",
      "id": "60c2042f-89bb-48f0-b661-f005cfda62cf",
      "result": {}
    },
    "code": "200"
  }
} 

[bad-network-cf-member] 2026-03-13T12:31:06.440Z - RECV: 
 {jsonrpc: 2.0, id: 96c601dc-d4bd-4ed9-a6fc-84c8b24ed17b, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:31:06.441Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "96c601dc-d4bd-4ed9-a6fc-84c8b24ed17b",
  "result": {
    "timestamp": 1773405066.359222
  }
} 

[bad-network-cf-member] 2026-03-13T12:31:16.442Z - RECV: 
 {jsonrpc: 2.0, id: 0515319c-6a23-48b2-81ac-6106f821c09d, method: signalwire.ping, params: Object} 

[bad-network-cf-member] 2026-03-13T12:31:16.442Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "0515319c-6a23-48b2-81ac-6106f821c09d",
  "result": {
    "timestamp": 1773405076.3611636
  }
} 

Cleaning up resources..
Resource deleted successfully: b97b11e4-3806-4101-9d1a-e532c9ca87ac
Cleaning up pages..
[bad-network-cf-member] Fixture roomObj Proxy(FabricRoomSessionConnection)
[bad-network-cf-member] Fixture has room 354629dc-9dcc-485d-897f-3af3bfbe6768
[bad-network-cf-member] 2026-03-13T12:31:18.076Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "d6a5b8a3-c3de-48d1-bdb6-304e20081b1c",
  "method": "webrtc.verto",
  "params": {
    "message": {
      "jsonrpc": "2.0",
      "id": "42056ab3-4bf3-4bf8-943b-87e422b6fae8",
      "method": "verto.bye",
      "params": {
        "dialogParams": {
          "attach": false,
          "reattaching": false,
          "screenShare": false,
          "additionalDevice": false,
          "pingSupported": true,
          "version": 1000,
          "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
          "destination_number": "/public/e2e_3a695426-bd41-45ea-9bf5-665f59260094?channel=video",
          "remote_caller_id_name": "Outbound Call",
          "remote_caller_id_number": "",
          "caller_id_name": "",
          "caller_id_number": ""
        }
      }
    },
    "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
  }
} 

[bad-network-cf-member] 2026-03-13T12:31:18.486Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "0bfc8250-a3ea-4b40-9a6d-ece037975f86",
  "method": "signalwire.event",
  "params": {
    "params": {
      "room_session": {
        "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
        "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
        "event_channel": "354629dc-9dcc-485d-897f-3af3bfbe6768",
        "name": "relay/participant/cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed/354629dc-9dcc-485d-897f-3af3bfbe6768",
        "layout_name": "grid-responsive",
        "display_name": "relay/participant/cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed/354629dc-9dcc-485d-897f-3af3bfbe6768",
        "recording": false,
        "streaming": false,
        "prioritize_handraise": false,
        "hide_video_muted": false,
        "locked": false,
        "meta": {},
        "members": [
          {
            "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
            "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
            "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
            "call_id": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
            "name": "whatever",
            "type": "member",
            "handraised": false,
            "visible": true,
            "audio_muted": false,
            "video_muted": false,
            "deaf": false,
            "input_volume": 0,
            "output_volume": 0,
            "input_sensitivity": 11,
            "echo_cancellation": true,
            "auto_gain": true,
            "noise_suppression": true,
            "lowbitrate": false,
            "denoise": false,
            "meta": {},
            "subscriber_id": "48fe0d0c-ac31-4222-93c9-39590ce92d78",
            "address_id": "b7804d51-7f11-47e2-b6a5-dbef00c01d72",
            "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east"
          }
        ],
        "recordings": [],
        "streams": [],
        "playbacks": []
      },
      "room_id": "33dd1275-a13e-4483-9082-be3a53bb3b0d",
      "room_session_id": "354629dc-9dcc-485d-897f-3af3bfbe6768",
      "call_id": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
      "member_id": "0851dc8c-4efc-4a22-baaa-26d64167e3ce",
      "origin_call_id": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
      "reason": "Conference ending"
    },
    "event_type": "call.left",
    "event_channel": "signalwire_c7d392bb-aa6b-44d5-82a3-160d4c9dd7f9_925d8a5e-17c0-4b63-b6aa-8909ed4c67e7_cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed",
    "timestamp": 1773405078359008
  }
} 

[bad-network-cf-member] 2026-03-13T12:31:18.487Z - SEND: 
 {
  "jsonrpc": "2.0",
  "id": "0bfc8250-a3ea-4b40-9a6d-ece037975f86",
  "result": {}
} 

[bad-network-cf-member] 2026-03-13T12:31:18.619Z - RECV: 
 {
  "jsonrpc": "2.0",
  "id": "d6a5b8a3-c3de-48d1-bdb6-304e20081b1c",
  "result": {
    "node_id": "4d071fa0-20df-4d8f-be7b-3e4d08efdd80@us-east",
    "result": {
      "jsonrpc": "2.0",
      "id": "42056ab3-4bf3-4bf8-943b-87e422b6fae8",
      "result": {
        "callID": "139bb555-d6f3-48f4-95aa-d13738ca5d43",
        "message": "CALL ENDED",
        "causeCode": 16,
        "cause": "NORMAL_CLEARING"
      }
    },
    "code": "200"
  }
} 

[bad-network-cf-member] Client disconnected
  ✘  1 [callfabricConnection] › tests/callfabric/badNetwork.spec.ts:14:7 › CallFabric BadNetwork › should survive a network switch for member (2.0m)
[31mTesting stopped early after 1 maximum allowed failures.[39m


  1) [callfabricConnection] › tests/callfabric/badNetwork.spec.ts:14:7 › CallFabric BadNetwork › should survive a network switch for member 

    [31mTest timeout of 120000ms exceeded.[39m

    Error: page.evaluate: Test timeout of 120000ms exceeded.

       at ../utils.ts:1701

      1699 |
      1700 | export const expectMediaEvent = (page: Page, event: MediaEventNames) => {
    > 1701 |   return page.evaluate(
           |               ^
      1702 |     ({ event }) => {
      1703 |       return new Promise<void>((resolve) => {
      1704 |         // @ts-expect-error
        at expectMediaEvent (/home/jpsantos/Development/signalwire-js/internal/e2e-js/utils.ts:1701:15)
        at /home/jpsantos/Development/signalwire-js/internal/e2e-js/tests/callfabric/badNetwork.spec.ts:47:57

  1 failed
    [callfabricConnection] › tests/callfabric/badNetwork.spec.ts:14:7 › CallFabric BadNetwork › should survive a network switch for member 
  1 error was not a part of any test, see above for details
Playwright exitCode: 1. Message: 'Command failed: npx playwright test --pass-with-no-tests callfabric/badNetwork.spec.ts'
