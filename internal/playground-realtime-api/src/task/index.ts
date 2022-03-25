import { Task } from '@signalwire/realtime-api'

const client = new Task.Client({
  host: process.env.HOST || 'relay.swire.io',
  project: process.env.PROJECT as string,
  token: process.env.TOKEN as string,

  contexts: ['office'],

  debug: {
    logWsTraffic: true,
  },
})

client.on('task.received', (payload) => {
  console.log('Task Received', payload)
})

setTimeout(async () => {
  console.log('Sending to the client..')
  await Task.send({
    host: process.env.HOST || 'relay.swire.io',
    project: process.env.PROJECT as string,
    token: process.env.TOKEN as string,
    context: 'office',
    message: { yo: ['bro', 1, true] },
  })
}, 2000)
