import { SignalWire } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    const unsubHomeOffice = await client.pubSub.listen({
      channels: ['office', 'home'],
      onMessageReceived: (payload) => {
        console.log(
          'Message received under the "office" or "home" channels',
          payload
        )
      },
    })

    const unsubWorkplace = await client.pubSub.listen({
      channels: ['workplace'],
      onMessageReceived: (payload) => {
        console.log('Message received under the "workplace" channels', payload)
      },
    })

    const pubResOffice = await client.pubSub.publish({
      content: 'Hello There',
      channel: 'office',
      meta: {
        fooId: 'randomValue',
      },
    })
    console.log('Publish Result --->', pubResOffice)

    const pubResWorkplace = await client.pubSub.publish({
      content: 'Hello There',
      channel: 'workplace',
      meta: {
        fooId: 'randomValue',
      },
    })
    console.log('Publish Result --->', pubResWorkplace)

    await unsubHomeOffice()

    const pubResHome = await client.pubSub.publish({
      content: 'Hello There',
      channel: 'home',
      meta: {
        fooId: 'randomValue',
      },
    })
    console.log('Publish Result --->', pubResHome)

    await unsubWorkplace()

    console.log('Disconnect the client..')
    client.disconnect()
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
