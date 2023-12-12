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
        topics: [domainApp.call_relay_context],
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
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const unsubCall = await call.listen({
        onStateChanged: async (call) => {
          if (call.state === 'ended') {
            await unsubVoice()

            await unsubCall?.()

            await client.disconnect()

            resolve(0)
          }
        },
        onPlaybackStarted: (playback) => {
          tap.hasProps(playback, CALL_PLAYBACK_PROPS, 'Playback started')
          tap.equal(playback.state, 'playing', 'Playback correct state')
        },
        onPlaybackUpdated: (playback) => {
          tap.notOk(playback.id, 'Playback updated')
        },
        onPlaybackFailed: (playback) => {
          tap.notOk(playback.id, 'Playback failed')
        },
        onPlaybackEnded: async (playback) => {
          tap.hasProps(playback, CALL_PLAYBACK_PROPS, 'Playback ended')
          tap.equal(playback.state, 'finished', 'Playback correct state')

          await call.hangup()
        },
      })

      const play = call.playAudio({
        url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
      })

      if ((await play.state) === 'playing') {
        await play.stop()
      }
    } catch (error) {
      console.error('VoicePlaybackCallListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Playback with Call Listeners E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
