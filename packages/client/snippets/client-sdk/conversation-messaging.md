====
TITLE: Conversation and Messaging
DESCRIPTION: Real-time messaging and conversation management with the Fabric SDK
SOURCE: conversation.spec.ts
LANGUAGE: typescript
CODE:
```typescript
import { SignalWire } from '@signalwire/client'

// Initialize the client
const client = await SignalWire({
  token: 'your-auth-token',
})

// Subscribe to conversation events
const { cancel } = await client.conversation.subscribe({
  onMessageReceived: (message) => {
    console.log('New message:', {
      id: message.id,
      conversation: message.conversation,
      userId: message.user_id,
      text: message.text,
      createdAt: message.ts
    })
  }
})

// Send a message to an address
const sendResult = await client.conversation.sendMessage({
  addressId: 'target-address-id',
  text: 'Hello from Fabric SDK!'
})
console.log('Message sent:', sendResult)

// Get all conversations
const conversations = await client.conversation.getConversations()
conversations.data.forEach(convo => {
  console.log('Conversation:', convo.id, convo.name)
})

// Join a conversation by address ID
const conversationObj = await client.conversation.join({
  addressId: 'conversation-address-id'
})

// Get messages from a specific conversation
const messages = await conversationObj.getMessages({
  pageSize: 20  // Optional: limit number of messages
})

messages.data.forEach(msg => {
  console.log(`[${msg.ts}] ${msg.user_id}: ${msg.text}`)
})

// Unsubscribe when done
cancel()
```
===