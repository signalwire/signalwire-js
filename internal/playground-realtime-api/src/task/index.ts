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

  const removeWorkplaceListeners = await client.task.listen({
    topics: ['workplace', 'home'],
    onTaskReceived: (payload) => {
      console.log(
        'Task received under the "workplace" or "home" context',
        payload
      )
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

  await removeOfficeListeners()

  console.log('Sending a message to workplace..')
  await client.task.send({
    topic: 'workplace',
    message: { yo: ['bro', 3, true] },
  })

  await removeWorkplaceListeners()

  setTimeout(async () => {
    console.log('Disconnect the client..')
    await client.disconnect()
  }, 2000)
})()
