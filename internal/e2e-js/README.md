# e2e-js end to end tests

## Initial setup

```
git clone git@github.com:signalwire/signalwire-js.git
cd signalwire-js
npm i
npm run build
```

## Configure a specific environment

Create a new file in `internal/e2e-js/.env.test` with a content like:

```
SW_TEST_CONFIG='{"ignoreFiles":[],"env":{"API_HOST":"xyz.signalwire.com","RELAY_HOST":"relay.signalwire.com","RELAY_PROJECT":"xyz","RELAY_TOKEN":"PTxyz","VOICE_CONTEXT":"office","VOICE_DIAL_FROM_NUMBER":"+1111111111","VOICE_DIAL_TO_NUMBER":"+111111111","VOICE_CONNECT_TO_NUMBER":"+111111111111","VOICE_CONNECT_CONTEXT":"office","MESSAGING_FROM_NUMBER":"+10000000000","MESSAGING_TO_NUMBER":"+10000000001","MESSAGING_CONTEXT":"messaging-e2e","PLAYBACK_URL":"http://xyz.test.mp4","STREAMING_URL":"rtmp://a.rtmp.youtube.com/live2/xyz","STREAM_CHECK_URL":"https://youtube.com/channel/streams","PVC_STREAMING_URL":"rtmp://a.rtmp.youtube.com/live2"}}'
```

### API_HOST

Your SignalWire domain.

### RELAY_PROJECT

Your SignalWire Project ID.

### RELAY_TOKEN

Your SignalWire Personal Token for the related project.

## Launch all tests

```
npm run -w=@sw-internal/e2e-js dev
```

## Launch a specific test

Add a `testMatch` element inside the `projects` field of `PlaywrightTestConfig` in `playwright.config.ts` like:

```
testMatch: ['roomSessionPromoteMeta.spec.ts'],
```

Then you can use the usual command:

```
npm run -w=@sw-internal/e2e-js dev
```

but only the one matching will be launched.
