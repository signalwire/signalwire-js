====
TITLE: Address Management
DESCRIPTION: Query and manage SignalWire addresses (resources) using the Fabric SDK
SOURCE: address.spec.ts
LANGUAGE: typescript
CODE:

```typescript
import { SignalWire } from '@signalwire/client'

// Initialize the client
const client = await SignalWire({
  token: 'your-auth-token',
})

// Query all addresses
const allAddresses = await client.address.getAddresses()
console.log('Total addresses:', allAddresses.data.length)

// Query addresses with filtering and sorting
const filteredAddresses = await client.address.getAddresses({
  type: 'room', // Filter by resource type: 'app' | 'call' | 'room' | 'subscriber'
  sortBy: 'display_name', // Sort by field
  sortOrder: 'asc', // Sort order: 'asc' | 'desc'
})

// Get a specific address by ID
const addressById = await client.address.getAddress({
  id: 'address-id-here',
})

// Get a specific address by name
const addressByName = await client.address.getAddress({
  name: 'my-resource-name',
})

// Access address properties
addressById.data.forEach((address) => {
  console.log('Address:', {
    id: address.id,
    name: address.name,
    displayName: address.display_name,
    type: address.type,
    resourceId: address.resource_id,
  })
})
```

===
