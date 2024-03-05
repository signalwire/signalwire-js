import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  CALL_PROPS,
  CALL_TAP_PROPS,
  TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
} from './utils'

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

      // @FIXME: To run all the assert we need a correct websocket uri for tapAudio
      tap.plan(4)

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
          onTapStarted: (callTap) => {
            tap.hasProps(callTap, CALL_TAP_PROPS, 'voice.dialSip: Tap started')
            tap.equal(
              callTap.callId,
              call.id,
              'voice.dialSip: Tap with correct call id'
            )
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const unsubCall = await call.listen({
        onTapEnded: (callTap) => {
          tap.hasProps(callTap, CALL_TAP_PROPS, 'call.listen: Tap ended')
          tap.equal(
            callTap.callId,
            call.id,
            'call.listen: Tap with correct call id'
          )
        },
      })

      try {
        // Start an audio tap
        const tapAudio = await call
          .tapAudio({
            direction: 'both',
            device: {
              type: 'ws',
              uri: 'wss://example.domain.com/endpoint',
            },
            listen: {
              onStarted(callTap) {
                tap.hasProps(
                  callTap,
                  CALL_TAP_PROPS,
                  'call.tapAudio: Tap started'
                )
              },
            },
          })
          .onStarted()

        const unsubTapAudio = await tapAudio.listen({
          onEnded(callTap) {
            tap.hasProps(callTap, CALL_TAP_PROPS, 'tapAudio.listen: Tap ended')
          },
        })

        // Tap should fail due to wrong WSS
        reject(4)
      } catch (error) {
        tap.ok(error, 'Outbound - Tap error')

        await client.disconnect()

        resolve(0)
      }
    } catch (error) {
      console.error('VoiceTapAllListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Tap with All Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
