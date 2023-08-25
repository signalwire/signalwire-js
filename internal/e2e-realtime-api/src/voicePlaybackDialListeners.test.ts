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
        listen: {
          onStateChanged: async (call) => {
            if (call.state === 'ended') {
              await unsubVoice()

              client.disconnect()

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
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const play = await call.playAudio({
        url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
      })

      await play.stop()
    } catch (error) {
      console.error('VoicePlaybackDialListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Playback with Dial Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
