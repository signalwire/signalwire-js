import { Chat } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const chat = new Chat.Client({
      // @ts-expect-error
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    tap.ok(chat.on, 'chat.on is defined')
    tap.ok(chat.once, 'chat.once is defined')
    tap.ok(chat.off, 'chat.off is defined')
    tap.ok(chat.subscribe, 'chat.subscribe is defined')
    tap.ok(chat.removeAllListeners, 'chat.removeAllListeners is defined')
    tap.ok(chat.getMemberState, 'chat.getMemberState is defined')
    tap.ok(chat.getMembers, 'chat.getMembers is defined')
    tap.ok(chat.getMessages, 'chat.getMessages is defined')
    tap.ok(chat.setMemberState, 'chat.setMemberState is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
