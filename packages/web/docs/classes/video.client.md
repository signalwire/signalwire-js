[@signalwire/web](../README.md) / [Video](../modules/video.md) / Client

# Class: Client<EventType\>

[Video](../modules/video.md).Client

## Type parameters

| Name | Type | Default |
| :------ | :------ | :------ |
| `EventType` | *string* | ClientEvents |

## Hierarchy

- *SignalWire*<EventType\>

  ↳ **Client**

## Table of contents

### Constructors

- [constructor](video.client.md#constructor)

### Properties

- [options](video.client.md#options)
- [store](video.client.md#store)

### Accessors

- [emitter](video.client.md#emitter)
- [rooms](video.client.md#rooms)

### Methods

- [connect](video.client.md#connect)
- [disconnect](video.client.md#disconnect)
- [emit](video.client.md#emit)
- [off](video.client.md#off)
- [on](video.client.md#on)
- [once](video.client.md#once)
- [removeAllListeners](video.client.md#removealllisteners)

## Constructors

### constructor

\+ **new Client**<EventType\>(`options`: *BaseClientOptions*<SignalWire<EventType\>, EventType\>, `store`: *Store*<any, AnyAction\>): [*Client*](video.client.md)<EventType\>

#### Type parameters

| Name | Type | Default |
| :------ | :------ | :------ |
| `EventType` | *string* | ``"session.unknown"`` \| ``"session.reconnecting"`` \| ``"session.connected"`` \| ``"session.disconnected"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | *BaseClientOptions*<SignalWire<EventType\>, EventType\> |
| `store` | *Store*<any, AnyAction\> |

**Returns:** [*Client*](video.client.md)<EventType\>

Inherited from: SignalWire<EventType\>.constructor

Defined in: core/dist/core/src/SignalWire.d.ts:6

## Properties

### options

• **options**: *BaseClientOptions*<SignalWire<EventType\>, EventType\>

Inherited from: SignalWire.options

Defined in: core/dist/core/src/SignalWire.d.ts:5

___

### store

• **store**: *Store*<any, AnyAction\>

Inherited from: SignalWire.store

Defined in: core/dist/core/src/SignalWire.d.ts:6

## Accessors

### emitter

• get **emitter**(): *Emitter*<EventType, SignalWire<EventType\>\>

**Returns:** *Emitter*<EventType, SignalWire<EventType\>\>

Defined in: core/dist/core/src/SignalWire.d.ts:8

___

### rooms

• get **rooms**(): *object*

**Returns:** *object*

| Name | Type |
| :------ | :------ |
| `makeCall` | (`options`: *any*) => [*Call*](webrtc.call.md) |

Defined in: [web/src/Client.ts:6](https://github.com/signalwire/video-sdk-poc/blob/880d309/packages/web/src/Client.ts#L6)

## Methods

### connect

▸ **connect**(): *Promise*<[*Client*](video.client.md)<EventType\>\>

Connect the underlay WebSocket connection to the SignalWire network.

**`example`**
```js
const client = await Video.createClient({
  token: '<YourJWT>',
  autoConnect: false,
})

client.on('socket.closed', () => {
  // The WebSocket connection is closed
})

await client.connect()
```

**Returns:** *Promise*<[*Client*](video.client.md)<EventType\>\>

Promise that will resolve with the Client object.

Inherited from: SignalWire.connect

Defined in: core/dist/core/src/SignalWire.d.ts:33

___

### disconnect

▸ **disconnect**(): *void*

Disconnect the Client from the SignalWire network.

**`example`**
```js
const client = await Video.createClient({
  token: '<YourJWT>',
})

// .. use your client...

client.disconnect()
```

**Returns:** *void*

Inherited from: SignalWire.disconnect

Defined in: core/dist/core/src/SignalWire.d.ts:48

___

### emit

▸ **emit**(...`params`: [eventName: EventType, ...args: any[]]): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [eventName: EventType, ...args: any[]] |

**Returns:** *boolean*

Inherited from: SignalWire.emit

Defined in: core/dist/core/src/SignalWire.d.ts:12

___

### off

▸ **off**(...`params`: [eventName: EventType, handler?: Function]): *SignalWire*<EventType\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [eventName: EventType, handler?: Function] |

**Returns:** *SignalWire*<EventType\>

Inherited from: SignalWire.off

Defined in: core/dist/core/src/SignalWire.d.ts:11

___

### on

▸ **on**(...`params`: [eventName: EventType, handler: Function, once?: boolean]): *SignalWire*<EventType\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [eventName: EventType, handler: Function, once?: boolean] |

**Returns:** *SignalWire*<EventType\>

Inherited from: SignalWire.on

Defined in: core/dist/core/src/SignalWire.d.ts:9

___

### once

▸ **once**(...`params`: [eventName: EventType, handler: Function]): *SignalWire*<EventType\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [eventName: EventType, handler: Function] |

**Returns:** *SignalWire*<EventType\>

Inherited from: SignalWire.once

Defined in: core/dist/core/src/SignalWire.d.ts:10

___

### removeAllListeners

▸ **removeAllListeners**(...`params`: []): *SignalWire*<EventType\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [] |

**Returns:** *SignalWire*<EventType\>

Inherited from: SignalWire.removeAllListeners

Defined in: core/dist/core/src/SignalWire.d.ts:13
