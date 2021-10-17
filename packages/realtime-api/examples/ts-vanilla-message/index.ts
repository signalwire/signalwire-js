import { createClient } from '@signalwire/realtime-api'

const run = async () => {
  const client = await createClient({
    project: process.env.PROJECT!,
    token: process.env.TOKEN!,
    contexts: ['default'],
    logLevel: 'debug',
  })

  client.message.on('state', (msg) => {
    console.log(`GLOBAL STATE HANDLER >>>>`)
    console.log(msg.id)
    console.log(msg.to)
    console.log(msg.from)
    console.log(msg.body)
    console.log(msg.media)
    console.log(msg.tags)
    console.log(msg.state)
  })
  await client.connect()

  const message = new client.message.Message({
    to: '<to_ph_number>',
    from: '<from_ph_number>',
    body: 'Hello there',
    context: 'default',
  })

  console.log(message.from, message.to)
  message.on('state', (msg) => {
    console.log("SCOPED STATE EVENT HANDLER >>>>>")
    console.log(msg.id)
    console.log(msg.to)
    console.log(msg.from)
    console.log(msg.body)
    console.log(msg.media)
    console.log(msg.tags)
    console.log(msg.state)
    console.log(msg.context)
  })

  await message.send()
}

run()
  .catch(console.error)
  .finally(() => {
    console.log('done')
  })
