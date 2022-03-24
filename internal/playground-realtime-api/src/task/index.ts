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

client.on('task.inbound', (payload) => {
  console.log('Task Received', payload)
})

setTimeout(() => {
  console.log('Sending job...')

  // const job = new Task.Job({
  //   host: process.env.HOST || 'relay.swire.io',
  //   project: process.env.PROJECT as string,
  //   token: process.env.TOKEN as string,
  // })
  const job = new Task.Job(
    process.env.PROJECT as string,
    process.env.TOKEN as string
  )
  job.host = process.env.HOST || 'relay.swire.io'

  job.deliver('office', { yo: ['bro', 1, true] }).catch(console.log)
}, 2000)
