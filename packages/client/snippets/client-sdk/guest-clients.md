====
TITLE: Guest Clients
DESCRIPTION: Create guest clients with limited access to specific addresses
SOURCE: agent_customer.spec.ts
LANGUAGE: typescript
CODE:
```typescript
import { SignalWire } from '@signalwire/client'

// Create a guest client with allowed addresses
const guestClient = await SignalWire({
  // Guest clients typically use a guest token
  token: 'guest-auth-token',
  
  // Restrict access to specific addresses
  allowed_addresses: [
    'address-id-1',
    'address-id-2',
    'address-id-3'
  ]
})

// Guest client can only dial allowed addresses
try {
  const call = await guestClient.dial({
    to: '/public/allowed-room-name',
    rootElement: document.getElementById('rootElement')
  })
  await call.start()
} catch (error) {
  console.error('Access denied:', error)
}

// Example: Customer support scenario
// 1. Agent creates a resource for customer
const agentClient = await SignalWire({ token: 'agent-token' })

// 2. Get resource addresses for customer access
const customerResource = await agentClient.address.getAddress({
  name: 'customer-support-room'
})

const allowedAddresses = customerResource.data.map(addr => addr.id)

// 3. Create guest client for customer
const customerClient = await SignalWire({
  token: 'customer-guest-token',
  allowed_addresses: allowedAddresses
})

// 4. Customer dials into support
const customerCall = await customerClient.dial({
  to: '/public/customer-support-room',
  rootElement: document.getElementById('customerVideo')
})

// 5. Agent dials into same room
const agentCall = await agentClient.dial({
  to: '/public/customer-support-room',
  rootElement: document.getElementById('agentVideo')
})

// Both start their calls to connect
await Promise.all([
  customerCall.start(),
  agentCall.start()
])

// Guest clients have same call controls as regular clients
await customerCall.audioMute()
await customerCall.videoMute()
await customerCall.setRaisedHand()

// Limitations are enforced server-side based on permissions
```
===