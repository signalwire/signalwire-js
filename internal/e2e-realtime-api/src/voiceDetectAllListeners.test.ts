import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import { CALL_PROPS, CALL_DETECT_PROPS, createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    try {
      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        debug: {
          logWsTraffic: true,
        },
      })

      let waitForDetectStartResolve: () => void
      const waitForDetectStart = new Promise<void>((resolve) => {
        waitForDetectStartResolve = resolve
      })

      const unsubVoice = await client.voice.listen({
        topics: ['office', 'home'],
        onCallReceived: async (call) => {
          try {
            const resultAnswer = await call.answer()
            tap.hasProps(call, CALL_PROPS, 'Inbound - Call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Inbound - Call answered gets the same instance'
            )

            // Wait until the caller starts the detect
            await waitForDetectStart

            // Send digits 1234 to the caller
            const sendDigits = await call.sendDigits('1w2w3w4w#')
            tap.equal(
              call.id,
              sendDigits.id,
              'Inbound - sendDigit returns the same instance'
            )

            await call.hangup()
          } catch (error) {
            console.error('Error answering inbound call', error)
          }
        },
      })

      const call = await client.voice.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
        listen: {
          async onStateChanged(call) {
            if (call.state === 'ended') {
              await unsubVoice()

              await unsubDetect()

              client.disconnect()

              resolve(0)
            }
          },
          onDetectStarted: (detect) => {
            tap.hasProps(
              detect,
              CALL_DETECT_PROPS,
              'voice.dialPhone: Detect started'
            )
            tap.equal(
              detect.callId,
              call.id,
              'voice.dialPhone: Detect with correct call id'
            )
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const unsubCall = await call.listen({
        onDetectStarted: (detect) => {
          tap.hasProps(
            detect,
            CALL_DETECT_PROPS,
            'voice.dialPhone: Detect started'
          )
          tap.equal(
            detect.callId,
            call.id,
            'voice.dialPhone: Detect with correct call id'
          )
        },
        onDetectEnded: (detect) => {
          // NotOk since the we unsubscribe this listener before detect ends
          tap.notOk(detect, 'call.listen: Detect ended')
        },
      })

      // Start a detect
      const detectDigit = await call.detectDigit({
        digits: '1234',
        listen: {
          onStarted: (detect) => {
            tap.hasProps(
              detect,
              CALL_DETECT_PROPS,
              'call.detectDigit: Detect started'
            )
            tap.equal(
              detect.callId,
              call.id,
              'call.detectDigit: Detect with correct call id'
            )
          },
          // Update runs 4 times since callee send 4 digits
          onUpdated: (detect) => {
            tap.hasProps(
              detect,
              CALL_DETECT_PROPS,
              'call.detectDigit: Detect updated'
            )
            tap.equal(
              detect.callId,
              call.id,
              'call.detectDigit: Detect with correct call id'
            )
          },
        },
      })
      tap.equal(
        call.id,
        detectDigit.callId,
        'Outbound - Detect returns the same instance'
      )

      // Resolve the detect start promise
      waitForDetectStartResolve!()

      const unsubDetect = await detectDigit.listen({
        onStarted: (detect) => {
          // NotOk since the listener is attached after the call.detectDigit has resolved
          tap.notOk(detect, 'detectDigit.listen: Detect stared')
        },
        onEnded: async (detect) => {
          tap.hasProps(
            detect,
            CALL_DETECT_PROPS,
            'detectDigit.listen: Detect ended'
          )
          tap.equal(
            detect.callId,
            call.id,
            'detectDigit.listen: Detect with correct call id'
          )
        },
      })

      await unsubCall()

      const recDigits = await detectDigit.ended()
      tap.equal(recDigits.type, 'digit', 'Outbound - Received the digit')
    } catch (error) {
      console.error('VoiceDetectAllListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Detect with All Listeners E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
