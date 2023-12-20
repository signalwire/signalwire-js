# e2e-realtime-api

This project contains end-to-end tests for our Node SDKs including Chat, PubSub, Messaging, Task, Video, and Voice.

For the Video SDK test, this project uses the `playwright` library and for all the other SDKs, this project relies on the `tap` library.

## Initial setup

```bash
git clone git@github.com:signalwire/signalwire-js.git
cd signalwire-js
npm i
npm run build
```

## Configure a specific environment

Create a new file in `internal/e2e-realtime-api/.env.test` with a content like:

```bash
SW_TEST_CONFIG='{
   "ignoreFiles": [],
   "ignoreDirectories": [],
   "env": {
      "API_HOST": "xxx.signalwire.com",
      "RELAY_HOST": "yyy.signalwire.com",
      "RELAY_PROJECT": "xyz",
      "RELAY_TOKEN": "PTxyz",
      "MESSAGING_FROM_NUMBER": "+1111",
      "MESSAGING_TO_NUMBER": "+1111",
      "MESSAGING_CONTEXT": "someContext",
      "DAPP_DOMAIN": "zzz.signalwire.com",
      "PLAYBACK_URL": "http://xyz.test.mp4"
   }
}'
```

### API_HOST

Your SignalWire domain.

### RELAY_PROJECT

Your SignalWire Project ID.

### RELAY_TOKEN

Your SignalWire Personal Token for the related project.

### MESSAGING_FROM_NUMBER

A valid number purchased from the SignalWire space responsible for sending messages.

### MESSAGING_TO_NUMBER

A valid number purchased from the SignalWire space intended to receive messages.

### MESSAGING_CONTEXT

Messaging context or topic. It should be configured under the *MESSAGING_TO_NUMBER* settings.

### DAPP_DOMAIN

SIP application domain

## Launch all tests

```bash
npm run -w=@sw-internal/e2e-realtime-api dev
```

## Launch only Video tests

```bash
npm run -w=@sw-internal/e2e-realtime-api dev:playwright
```

## Launch only Node tests

```bash
npm run -w=@sw-internal/e2e-realtime-api dev:rtonly
```

## Ignore a specific test

You can skip either a single test file or a whole directory by updating your environment like this:

```bash
SW_TEST_CONFIG='{"ignoreFiles":["voiceCollect/withAllListeners.test.ts"],"ignoreDirectories":["voiceDetect"],....}
```

The changes above will exclude a specific test *withAllListeners* file located inside the *voiceCollect* directory, and it will also skip the entire *voiceDetect* directory.
