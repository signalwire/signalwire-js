import { SignalWire } from '@signalwire/realtime-api'
;(async () => {
  const client = await SignalWire({
    host: process.env.HOST || 'relay.swire.io',
    project: process.env.PROJECT as string,
    token: process.env.TOKEN as string,
  })

  const removeOfficeListeners = await client.task.listen({
    topics: ['office', 'home'],
    onTaskReceived: (payload) => {
      console.log('Task received under the "office" or "home" context', payload)
    },
  })

  console.log('Sending a message to office..')
  await client.task.send({
    topic: 'office',
    message: { yo: ['bro', 1, true] },
  })

  console.log('Sending a message to home..')
  await client.task.send({
    topic: 'home',
    message: { yo: ['bro', 2, true] },
  })

  setTimeout(async () => {
    await removeOfficeListeners()
    console.log('Disconnect the client..')
    client.disconnect()
  }, 2000)
})()
