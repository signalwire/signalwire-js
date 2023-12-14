# e2e-js

This repo contains end-to-end tests for our browser SDKs including Chat, PubSub, Video, and Call Fabric.

Additionaly, this repo also includes a few V2 client SDK tests.

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
   "ignoreFiles": [],
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

Additional ENV variables for `v2WebrtcFromRest` test: `"VERTO_DOMAIN"`
These env vars are used to "Create a Call" with the Compatibility REST API as documented in:

https://docs.signalwire.com/reference/compatibility-sdks/v3/?shell#api-reference-calls-create-a-call

`VERTO_DOMAIN` is the domain of the called device (`To` field).

### API_HOST

Your SignalWire domain.

### RELAY_PROJECT

Your SignalWire Project ID.

### RELAY_TOKEN

Your SignalWire Personal Token for the related project.

### SAT_REFERENCE

OAuth reference for SAT. This could be an oauth user email or a process/program.

### VERTO_DOMAIN

A SIP domain of your project replacing `sip` with `verto`. Required for v2 client testing.

## Call Fabric resources

The call fabric tests are using the following resources:

- /public/cf-e2e-test-relay (Relay Application with topic/context/reference **cf-e2e-test-relay**)
- /public/cf-e2e-test-tts (SWML Script)
- /public/cf-e2e-test-hangup (SWML Script)
- /public/cf-e2e-test-room (Video Room)

You need to have these resources in your SignalWire space to pass these test successfully.

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
