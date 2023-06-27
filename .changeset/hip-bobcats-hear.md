---
'@signalwire/realtime-api': major
'@signalwire/core': major
---

New interface for PubSub and Chat APIs

The new interface contains a single SW client with Chat and PubSub namespaces
```javascript
import { SignalWire } from '@signalwire/realtime-api'

(async () => {
  const client = await SignalWire({
    host: process.env.HOST,
    project: process.env.PROJECT,
    token: process.env.TOKEN,
  })

  // Attach pubSub listeners
  const unsubHomePubSubListener = await client.pubSub.listen({
      channels: ['home'],
      onMessageReceived: (message) => {
        console.log('Message received under the "home" channel', message)
      },
    })

  // Send a task
  await client.pubSub.publish({
    content: 'Hello There',
    channel: 'home',
    meta: {
      fooId: 'randomValue',
    },
  })
  
  // Attach chat listeners
  const unsubOfficeChatListener = await client.chat.listen({
      channels: ['office'],
      onMessageReceived: (message) => {
        console.log('Message received on "office" channel', message)
      },
      onMemberJoined: (member) => {
        console.log('Member joined on "office" channel', member)
      },
      onMemberUpdated: (member) => {
        console.log('Member updated on "office" channel', member)
      },
      onMemberLeft: (member) => {
        console.log('Member left on "office" channel', member)
      },
    })

  // Publish a chat message on the office channel
  const pubRes = await client.chat.publish({
      content: 'Hello There',
      channel: 'office',
  })

  // Get channel messages
  const messagesResult = await client.chat.getMessages({
      channel: 'office',
  })

  // Get channel members
  const getMembersResult = await client.chat.getMembers({ channel: 'office' })
  
  // Unsubscribe pubSub listener
  await unsubHomePubSubListener()

  // Unsubscribe chat listener
  await unsubOfficeChatListener()

  // Disconnect the client
  client.disconnect()
})();
```