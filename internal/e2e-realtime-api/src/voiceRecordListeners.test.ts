import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner, CALL_RECORD_PROPS, CALL_PROPS } from './utils'

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

              await unsubRecord()

              client.disconnect()

              resolve(0)
            }
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const record = await call.recordAudio({
        listen: {
          onStarted: (recording) => {
            tap.hasProps(recording, CALL_RECORD_PROPS, 'Recording started')
            tap.equal(recording.state, 'recording', 'Recording correct state')
          },
          onFailed: (recording) => {
            tap.notOk(recording.id, 'Recording failed')
          },
          onEnded: async (recording) => {
            tap.hasProps(recording, CALL_RECORD_PROPS, 'Recording ended')
            tap.equal(recording.id, record.id, 'Recording correct id')
            tap.equal(recording.state, 'finished', 'Recording correct state')
          },
        },
      })

      const unsubRecord = await record.listen({
        onStarted: (recording) => {
          // NotOk since this listener is being attached after the call.record promise has resolved
          tap.notOk(recording.id, 'Recording started')
        },
        onFailed: (recording) => {
          tap.notOk(recording.id, 'Recording failed')
        },
        onEnded: async (recording) => {
          tap.hasProps(recording, CALL_RECORD_PROPS, 'Recording ended')
          tap.equal(recording.id, record.id, 'Recording correct id')
          tap.equal(recording.state, 'finished', 'Recording correct state')

          await call.hangup()
        },
      })

      await record.stop()
    } catch (error) {
      console.error('VoiceRecordListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Record Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
