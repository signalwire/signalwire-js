---
'@signalwire/core': patch
'@signalwire/js': patch
---

Allow user to pass filters to `getAddress` function


```js
const addressData = await client.getAddresses({
  type:  'room',
  displayName: 'domain app',
})
```