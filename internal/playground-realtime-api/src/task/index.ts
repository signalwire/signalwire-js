import { Task } from '@signalwire/realtime-api'

const client = new Task.Client({
  host: process.env.HOST || 'relay.swire.io',
  project: process.env.PROJECT as string,
  token: process.env.TOKEN as string,
  contexts: ['office'],
  debug: {
    logWsTraffic: true,
  },
  // httpOptions: {
  //   proxy: "http://localhost:8888"
  // }
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

  setTimeout(async () => {
    console.log('Disconnect the client..')
    client.disconnect()
  }, 2000)
}, 2000)
