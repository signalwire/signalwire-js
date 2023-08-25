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
          // logWsTraffic: true,
        },
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

              client.disconnect()

              resolve(0)
            }
          },
          onDetectStarted: (detect) => {
            tap.hasProps(detect, CALL_DETECT_PROPS, 'Detect started')
            tap.equal(detect.callId, call.id, 'Detect with correct call id')
          },
          // Update runs 4 times since callee send 4 digits
          onDetectUpdated: (detect) => {
            tap.hasProps(detect, CALL_DETECT_PROPS, 'Detect updated')
            tap.equal(detect.callId, call.id, 'Detect with correct call id')
          },
          onDetectEnded: async (detect) => {
            tap.hasProps(detect, CALL_DETECT_PROPS, 'Detect ended')
            tap.equal(detect.callId, call.id, 'Detect with correct call id')
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      // Start a detect
      const detectDigit = await call.detectDigit({
        digits: '1234',
      })
      tap.equal(
        call.id,
        detectDigit.callId,
        'Outbound - Detect returns the same instance'
      )
    } catch (error) {
      console.error('VoiceDetectDialListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Detect with Dial Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
