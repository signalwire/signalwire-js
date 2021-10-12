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

  client.message.on('state', (data) => {
    console.log(`MESSAGE STATE EVENT >>> `, data)
  })
}

run();