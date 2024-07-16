# e2e-js

This project contains end-to-end tests for our browser SDKs including Chat, PubSub, Video, and Call Fabric.

Additionaly, this project also includes a few V2 client SDK tests.

## Initial setup

```bash
git clone git@github.com:signalwire/signalwire-js.git
cd signalwire-js
npm i
npm run build
```

## Configure a specific environment

Create a new file in `internal/e2e-js/.env.test` with a content like:

```bash
SW_TEST_CONFIG='{
   "ignoreTests": [],
   "env": {
      "API_HOST": "xyz.signalwire.com",
      "RELAY_HOST": "relay.signalwire.com",
      "RELAY_PROJECT": "xyz",
      "RELAY_TOKEN": "PTxyz",
      "PLAYBACK_URL": "http://xyz.test.mp4",
      "STREAMING_URL": "rtmp://a.rtmp.youtube.com/live2/111",
      "STREAM_CHECK_URL": "https://rtmp.example.com/stats",
      "RTMP_SERVER": "rtmp://a.rtmp.youtube.com/live2/",
      "RTMP_STREAM_NAME": "someName",
      "SAT_REFERENCE": "oauthReference",
      "VERTO_DOMAIN": "dev-1111.verto.example.com"
   }
}'
```

### API_HOST

Your SignalWire domain.

### RELAY_PROJECT

Your SignalWire Project ID.

### RELAY_TOKEN

Your SignalWire Personal Token for the related project.

### SAT_REFERENCE

OAuth reference for SAT. This could be an oauth user email or a process/program identifier.

### VERTO_DOMAIN

A SIP domain of your project replacing `sip` with `verto`. Required for v2 client testing.

For eg:

If your SIP domain is dev-1234.sip.signalwire.com, use dev-1234.verto.signalwire.com

## Call Fabric resources

The call fabric tests are using the following resources:

- /public/cf-e2e-test-relay (Relay Application with topic/context/reference **cf-e2e-test-relay**)
- /public/cf-e2e-test-tts (SWML Script - see below)
- /public/cf-e2e-test-hangup (SWML Script - see below)
- /public/cf-e2e-test-room (Video Room)

You need to have these resources in your SignalWire space to pass these Call Fabric tests successfully.

## Launch all tests

```bash
npm run -w=@sw-internal/e2e-js dev
```

## Launch a specific test

```bash
npm run -w=@sw-internal/e2e-js dev -- <file1> <file2> <file3>
```

> Example

```bash
npm run -w=@sw-internal/e2e-js dev -- roomSession.spec.ts
```

Only `roomSession.spec.ts` will run.

## Ignore a specific test

Add the test you want to ignore within the `playwright.config.ts` > `testIgnore` array.

## SWML Scripts

/public/cf-e2e-test-tts

```json
{
   "sections": {
      "main": [
         "answer",
         {
            "play": {
               "volume": 10,
               "urls": [
                  "say:Hi",
                  "say:Welcome to SignalWire",
                  "say:Thank you for calling us. All our lines are currently busy, but your call is important to us. Please hang up, and we'll return your call as soon as our representative is available."
               ]
            }
         }
      ]
   }
}
```

/public/cf-e2e-test-hangup

```json
{
  "version": "1.0.0",
  "sections": {
    "main": [
      "answer",
      {
        "hangup": {
          "reason": "busy"
        }
      }
    ]
  }
}

```