import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner, CALL_PROPS, CALL_PLAYBACK_PROPS } from './utils'

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

      const unsubVoiceOffice = await client.voice.listen({
        topics: ['office'],
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

      const unsubVoiceHome = await client.voice.listen({
        topics: ['home'],
        // This should never run since VOICE_DIAL_TO_NUMBER is listening only for "office" topic
        onCallReceived: async (call) => {
          tap.notOk(call, 'Inbound - Home topic received a call')
        },
      })

      const call = await client.voice.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
        listen: {
          onStateChanged: async (call) => {
            if (call.state === 'ended') {
              await unsubVoiceOffice()

              await unsubVoiceHome()

              await unsubPlay?.()

              await client.disconnect()

              resolve(0)
            }
          },
          onPlaybackStarted: (playback) => {
            tap.hasProps(
              playback,
              CALL_PLAYBACK_PROPS,
              'voice.dialPhone: Playback started'
            )
            tap.equal(
              playback.state,
              'playing',
              'voice.dialPhone: Playback correct state'
            )
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const unsubCall = await call.listen({
        onPlaybackStarted: (playback) => {
          tap.hasProps(
            playback,
            CALL_PLAYBACK_PROPS,
            'call.listen: Playback started'
          )
          tap.equal(
            playback.state,
            'playing',
            'call.listen: Playback correct state'
          )
        },
        onPlaybackEnded: (playback) => {
          // NotOk since we unsubscribe this listener before the playback stops
          tap.notOk(playback.id, 'call.listen: Playback ended')
        },
      })

      // Play an audio
      const play = await call.playAudio({
        url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
        listen: {
          onStarted: async (playback) => {
            tap.hasProps(
              playback,
              CALL_PLAYBACK_PROPS,
              'call.playAudio: Playback started'
            )
            tap.equal(
              playback.state,
              'playing',
              'call.playAudio: Playback correct state'
            )

            await unsubCall()

            await play.stop()
          },
        },
      })

      const unsubPlay = await play.listen({
        onStarted: (playback) => {
          // NotOk since the listener is attached after the call.play has resolved
          tap.notOk(playback.id, 'play.listen: Playback stared')
        },
        onEnded: async (playback) => {
          tap.hasProps(
            playback,
            CALL_PLAYBACK_PROPS,
            'play.listen: Playback ended'
          )
          tap.equal(playback.id, play.id, 'play.listen: Playback correct id')
          tap.equal(
            playback.state,
            'finished',
            'play.listen: Playback correct state'
          )

          await call.hangup()
        },
      })
    } catch (error) {
      console.error('VoicePlaybackAllListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Playback with all Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
