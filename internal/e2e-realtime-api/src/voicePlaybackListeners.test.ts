import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  createTestRunner,
  CALL_PLAYBACK_PROPS,
  CALL_PROPS,
  TestHandler,
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
          // logWsTraffic: true,
        },
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
          onStateChanged: async (call) => {
            if (call.state === 'ended') {
              await unsubVoice()

              await unsubPlay?.()

              await client.disconnect()

              resolve(0)
            }
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const play = await call
        .playTTS({
          text: 'This is a custom text to speech for test.',
          listen: {
            onStarted: (playback) => {
              tap.hasProps(playback, CALL_PLAYBACK_PROPS, 'Playback started')
              tap.equal(playback.state, 'playing', 'Playback correct state')
            },
            onUpdated: (playback) => {
              tap.notOk(playback.id, 'Playback updated')
            },
            onFailed: (playback) => {
              tap.notOk(playback.id, 'Playback failed')
            },
            onEnded: (playback) => {
              tap.hasProps(playback, CALL_PLAYBACK_PROPS, 'Playback ended')
              tap.equal(playback.id, play.id, 'Playback correct id')
              tap.equal(playback.state, 'finished', 'Playback correct state')
            },
          },
        })
        .onStarted()

      const unsubPlay = await play.listen({
        onStarted: (playback) => {
          // NotOk since this listener is being attached after the call.play promise has resolved
          tap.notOk(playback.id, 'Playback stared')
        },
        onUpdated: (playback) => {
          tap.notOk(playback.id, 'Playback updated')
        },
        onFailed: (playback) => {
          tap.notOk(playback.id, 'Playback failed')
        },
        onEnded: async (playback) => {
          tap.hasProps(playback, CALL_PLAYBACK_PROPS, 'Playback ended')
          tap.equal(playback.id, play.id, 'Playback correct id')
          tap.equal(playback.state, 'finished', 'Playback correct state')

          await call.hangup()
        },
      })

      await play.stop()
    } catch (error) {
      console.error('VoicePlaybackListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Playback Listeners E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
