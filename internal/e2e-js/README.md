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
SW_TEST_CONFIG='{"ignoreFiles":[],"env":{"API_HOST":"xyz.signalwire.com","RELAY_HOST":"relay.signalwire.com","RELAY_PROJECT":"xyz","RELAY_TOKEN":"PTxyz","VOICE_CONTEXT":"office","VOICE_DIAL_FROM_NUMBER":"+1111111111","VOICE_DIAL_TO_NUMBER":"+111111111","VOICE_CONNECT_TO_NUMBER":"+111111111111","VOICE_CONNECT_CONTEXT":"office","MESSAGING_FROM_NUMBER":"+10000000000","MESSAGING_TO_NUMBER":"+10000000001","MESSAGING_CONTEXT":"messaging-e2e","PLAYBACK_URL":"http://xyz.test.mp4","RTMP_SERVER":"rtmp://a.rtmp.youtube.com/live2/","RTMP_STREAM_NAME":"someName","STREAM_CHECK_URL":"https://rtmp.example.com/stats","PVC_RTMP_SERVER":"rtmp://rtmp.example.com/live/", "PVC_STREAM_NAME": "pvc-e2e-stream"}}'
```

Additional ENV variables for `v2WebrtcFromRest` test:
```
       "SPACE": "",
       "TODOMAIN": "",
       "LAMLURL": "",
       "FROMNUMBER": "",
```
These env vars are used to "Create a Call" with the Compatibility REST API as documented in:

https://docs.signalwire.com/reference/compatibility-sdks/v3/?shell#api-reference-calls-create-a-call

`SPACE` is the customer's SW domain.

`TODOMAIN` is the domain of the called device (`To` field).

`LAMLURL` is the `Url` of the Laml bin to be executed at answer.

`FROMNUMBER` is the `From` number used as caller identity.

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

```
npm run -w=@sw-internal/e2e-js dev -- <file1> <file2> <file3>
```

> Example

```
npm run -w=@sw-internal/e2e-js dev -- roomSession.spec.ts
```

Only `roomSession.spec.ts` will run.

## Ignore a specific test

Add the test you want to ignore within the `playwright.config.ts` > `testIgnore` array.
