import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner, CALL_PLAYBACK_PROPS, CALL_PROPS } from './utils'

const handler = async () => {
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

      tap.plan(11)

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
          } catch (error) {
            console.error('Error answering inbound call', error)
          }
        },
      })

      const call = await client.voice.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const play = await call.playTTS({
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

      const unsubPlay = await play.listen({
        onStarted: (playback) => {
          tap.notOk(playback.id, 'Playback stared')
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
      })

      await play.stop()

      await unsubVoice()

      await unsubPlay()

      await call.hangup()

      client.disconnect()

      resolve(0)
    } catch (error) {
      console.error('Outbound - voicePlayback error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Playback with Play Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()