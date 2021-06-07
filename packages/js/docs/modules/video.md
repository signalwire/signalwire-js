[@signalwire/web](../README.md) / Video

# Namespace: Video

## Table of contents

### Classes

- [Client](../classes/video.client.md)

### Functions

- [createClient](video.md#createclient)
- [createRoomObject](video.md#createroomobject)
- [joinRoom](video.md#joinroom)

## Functions

### createClient

▸ `Const` **createClient**(`userOptions`: *UserOptions*<{}, string\>): *Promise*<[*Client*](../classes/video.client.md)<``"session.unknown"`` \| ``"session.reconnecting"`` \| ``"session.connected"`` \| ``"session.disconnected"``\>\>

## Intro
With VideoSDK.createClient you can establish a WebSocket connection
with SignalWire and interact with the client.

## Examples
Create a client using the JWT

**`example`**
With autoConnect true the client is ready to be used.
```js
try {
  const client = await VideoSDK.createClient({
    token: '<YourJWT>',
  })

// Your client is already connected..
} catch (error) {
  console.error('Auth Error', error)
}
```

**`example`**
With autoConnect false you can attach additional handlers.
```js
try {
  const client = await VideoSDK.createClient({
    token: '<YourJWT>',
    autoConnect: false,
  })

  client.on('socket.closed', () => {
    // The WebSocket connection is closed
  })

  await client.connect()
  // Your client is ready now..
} catch (error) {
  console.error('Error', error)
}
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `userOptions` | *UserOptions*<{}, string\> |

**Returns:** *Promise*<[*Client*](../classes/video.client.md)<``"session.unknown"`` \| ``"session.reconnecting"`` \| ``"session.connected"`` \| ``"session.disconnected"``\>\>

Defined in: [web/src/createClient.ts:52](https://github.com/signalwire/video-sdk-poc/blob/880d309/packages/web/src/createClient.ts#L52)

___

### createRoomObject

▸ `Const` **createRoomObject**(`roomOptions`: *CreateRoomObjectOptions*): *Promise*<unknown\>

## Intro
Using Video.createRoomObject you can create an RTCSession to join a room.

## Examples
Create the rtcSession object using the JWT.

**`example`**
With an HTMLDivElement with id="root" in the DOM.
```js
// <div id="root"></div>

try {
  const rtcSession = await VideoSDK.createRTCSession({
    token: '<YourJWT>',
    rootElementId: 'root',
  })

  rtcSession.join()
} catch (error) {
  console.error('Error', error)
}
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `roomOptions` | *CreateRoomObjectOptions* |

**Returns:** *Promise*<unknown\>

Defined in: [web/src/createRoomObject.ts:38](https://github.com/signalwire/video-sdk-poc/blob/880d309/packages/web/src/createRoomObject.ts#L38)

___

### joinRoom

▸ `Const` **joinRoom**(`roomOptions`: *CreateRoomObjectOptions*): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `roomOptions` | *CreateRoomObjectOptions* |

**Returns:** *Promise*<unknown\>

Defined in: [web/src/joinRoom.ts:3](https://github.com/signalwire/video-sdk-poc/blob/880d309/packages/web/src/joinRoom.ts#L3)
