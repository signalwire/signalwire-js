import { SWCloseEvent } from '@signalwire/core'
import tap from 'tap'

async function run() {
  try {
    const evt = new SWCloseEvent('close', {
      reason: 'Client-side closed',
    })

    tap.equal(evt.type, 'close')
    tap.equal(evt.code, 0)
    tap.equal(evt.reason, 'Client-side closed')
    tap.equal(evt.wasClean, false)

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
