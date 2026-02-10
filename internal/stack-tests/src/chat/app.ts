import { SignalWire } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    tap.ok(client.chat, 'client.chat is defined')
    tap.ok(client.chat.listen, 'client.chat.listen is defined')
    tap.ok(client.chat.publish, 'client.chat.publish is defined')
    tap.ok(client.chat.getMessages, 'client.chat.getMessages is defined')
    tap.ok(client.chat.getMembers, 'client.chat.getMembers is defined')
    tap.ok(client.chat.getMemberState, 'client.chat.getMemberState is defined')
    tap.ok(client.chat.setMemberState, 'client.chat.setMemberState is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
