import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner, CALL_PLAYBACK_PROPS, sleep } from './utils'

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

      tap.plan(7)

      const unsubVoice = await client.voice.listen({
        topics: ['office', 'home'],
        onCallReceived: async (call) => {
          try {
            const resultAnswer = await call.answer()
            tap.ok(resultAnswer.id, 'Inbound - Call answered')
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

      const unsubCall = await call.listen({
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
        onPlaybackEnded: (playback) => {
          tap.hasProps(playback, CALL_PLAYBACK_PROPS, 'Playback ended')
          tap.equal(playback.state, 'finished', 'Playback correct state')
        },
      })

      const play = await call.playAudio({
        url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
      })

      await play.stop()

      await unsubVoice()

      await unsubCall()

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
    name: 'Voice Playback with Call Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
