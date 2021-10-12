import { createClient } from '@signalwire/realtime-api'

async function run() {
  const client = await createClient({
    project: process.env.PROJECT!,
    token: process.env.TOKEN!,
    // contexts: ['default'],
    logLevel: 'debug'
  })

  await client.connect()

  const result = await client.message.sendSMS({
    context: 'default',
    body: 'Hello From Client',
    to: '+12066779446',
    from: '+12082663675',
    tags: ['my-tag', 'whatever'],
  })

  console.log(result)
}

run();