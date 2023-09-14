---
'@signalwire/realtime-api': major
'@signalwire/core': major
---

New interface for the Messaging API

The new interface contains a single SW client with Messaging namespace
```javascript
  const client = await SignalWire({
    host: process.env.HOST || 'relay.swire.io',
    project: process.env.PROJECT as string,
    token: process.env.TOKEN as string,
  })

  const unsubOfficeListener = await client.messaging.listen({
    topics: ['office'],
    onMessageReceived: (payload) => {
      console.log('Message received under "office" context', payload)
    },
    onMessageUpdated: (payload) => {
      console.log('Message updated under "office" context', payload)
    },
  })

  try {
    const response = await client.messaging.send({
      from: process.env.FROM_NUMBER_MSG as string,
      to: process.env.TO_NUMBER_MSG as string,
      body: 'Hello World!',
      context: 'office',
    })

    await client.messaging.send({
      from: process.env.FROM_NUMBER_MSG as string,
      to: process.env.TO_NUMBER_MSG as string,
      body: 'Hello John Doe!',
    })
  } catch (error) {
    console.log('>> send error', error)
  }
```
