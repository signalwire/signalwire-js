---
'@signalwire/js': minor
'@signalwire/webrtc': patch
'@signalwire/core': patch
---

CF SDK: Allow users to pass the `fromFabricAddressId` while dialing

```ts
const call = await client.dial({
  .....,
  to: .....,
  fromFabricAddressId: 'valid_subscriber_id', // Optional
  ... 
})
```
