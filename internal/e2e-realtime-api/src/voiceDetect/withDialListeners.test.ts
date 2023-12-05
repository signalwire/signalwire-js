import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  CALL_PROPS,
  CALL_DETECT_PROPS,
  createTestRunner,
  TestHandler,
  makeSipDomainAppAddress,
} from '../utils'

const handler: TestHandler = ({ domainApp }) => {
  if (!domainApp) {
    throw new Error('Missing domainApp')
  }

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
        topics: [domainApp.call_relay_context, 'home'],
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

      const call = await client.voice.dialSip({
        to: makeSipDomainAppAddress({
          name: 'to',
          domain: domainApp.domain,
        }),
        from: makeSipDomainAppAddress({
          name: 'from',
          domain: domainApp.domain,
        }),
        timeout: 30,
        listen: {
          async onStateChanged(call) {
            if (call.state === 'ended') {
              await unsubVoice()

              await client.disconnect()

              resolve(0)
            }
          },
          onDetectStarted: (detect) => {
            tap.hasProps(detect, CALL_DETECT_PROPS, 'Detect started')
            tap.equal(detect.callId, call.id, 'Detect with correct call id')

            // Resolve the detect start promise
            waitForDetectStartResolve!()
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
      const detectDigit = await call
        .detectDigit({
          digits: '1234',
        })
        .onEnded()
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
    useDomainApp: true,
  })

  await runner.run()
}

main()
