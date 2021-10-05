import { createClient } from "@signalwire/realtime-api";

async function run() {
  const client = await createClient({
    project: process.env.PROJECT ?? '',
    token: process.env.TOKEN ?? '',
    contexts: ['default'],
    logLevel: 'trace',
  })

  await client.connect()

  client.message.on('receive', (data) => {
    console.log(`RECEIVED MESSAGE >>> `, data)
  })
}

run();