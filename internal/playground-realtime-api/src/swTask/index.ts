import { SignalWire } from '@signalwire/realtime-api'
;(async () => {
  const client = await SignalWire({
    host: process.env.HOST || 'relay.swire.io',
    project: process.env.PROJECT as string,
    token: process.env.TOKEN as string,
  })

  const removeOfficeListeners = await client.task.listen({
    topic: ['office'],
    onTaskReceived: (payload) => {
      console.log('Task received under the "office" context', payload)
    },
  })

  await client.task.send({
    topic: 'office',
    message: { yo: ['bro', 1, true] },
  })
  await client.addTopics(['home'])

  await client.task.send({
    topic: 'home',
    message: { yo: ['bro', 2, true] },
  })

  setTimeout(async () => {
    removeOfficeListeners()
    console.log('Disconnect the client..')
    client.disconnect()
  }, 2000)
})()
