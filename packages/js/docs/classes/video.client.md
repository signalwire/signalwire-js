[@signalwire/js](../README.md) / [Video](../modules/video.md) / Client

# Class: Client

[Video](../modules/video.md).Client

## Hierarchy

- *SignalWire*

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

\+ **new Client**(`options`: BaseClientOptions, `store`: *Store*<any, AnyAction\>): [*Client*](video.client.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | BaseClientOptions |
| `store` | *Store*<any, AnyAction\> |

**Returns:** [*Client*](video.client.md)

Inherited from: SignalWire.constructor

Defined in: packages/core/dist/core/src/SignalWire.d.ts:5

## Properties

### options

• **options**: BaseClientOptions

Inherited from: SignalWire.options

Defined in: packages/core/dist/core/src/SignalWire.d.ts:4

___

### store

• **store**: *Store*<any, AnyAction\>

Inherited from: SignalWire.store

Defined in: packages/core/dist/core/src/SignalWire.d.ts:5

## Accessors

### emitter

• get **emitter**(): Emitter

**Returns:** Emitter

Defined in: packages/core/dist/core/src/SignalWire.d.ts:7

___

### rooms

• get **rooms**(): *object*

**Returns:** *object*

| Name | Type |
| :------ | :------ |
| `makeCall` | (`options`: *any*) => *StrictEventEmitter*<[*Call*](webrtc.call.md), CallEvents, CallEvents, ``"addListener"`` \| ``"addEventListener"`` \| ``"removeListener"`` \| ``"removeEventListener"``, ``"on"`` \| ``"once"`` \| ``"emit"``\> |

Defined in: [packages/js/src/Client.ts:7](https://github.com/signalwire/video-sdk-poc/blob/ed1d3e8/packages/js/src/Client.ts#L7)

## Methods

### connect

▸ **connect**(): *Promise*<[*Client*](video.client.md)\>

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

**Returns:** *Promise*<[*Client*](video.client.md)\>

Promise that will resolve with the Client object.

Inherited from: SignalWire.connect

Defined in: packages/core/dist/core/src/SignalWire.d.ts:32

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

Defined in: packages/core/dist/core/src/SignalWire.d.ts:47

___

### emit

▸ **emit**(...`params`: [event: string \| symbol, ...args: any[]]): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event: string \| symbol, ...args: any[]] |

**Returns:** *boolean*

Inherited from: SignalWire.emit

Defined in: packages/core/dist/core/src/SignalWire.d.ts:11

___

### off

▸ **off**(...`params`: [event: string \| symbol, fn?: function, context?: any, once?: boolean]): *EventEmitter*<string \| symbol, any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event: string \| symbol, fn?: function, context?: any, once?: boolean] |

**Returns:** *EventEmitter*<string \| symbol, any\>

Inherited from: SignalWire.off

Defined in: packages/core/dist/core/src/SignalWire.d.ts:9

___

### on

▸ **on**(...`params`: [event: string \| symbol, fn: function, context?: any]): *EventEmitter*<string \| symbol, any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event: string \| symbol, fn: function, context?: any] |

**Returns:** *EventEmitter*<string \| symbol, any\>

Inherited from: SignalWire.on

Defined in: packages/core/dist/core/src/SignalWire.d.ts:8

___

### once

▸ **once**(...`params`: [event: string \| symbol, fn: function, context?: any]): *EventEmitter*<string \| symbol, any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event: string \| symbol, fn: function, context?: any] |

**Returns:** *EventEmitter*<string \| symbol, any\>

Inherited from: SignalWire.once

Defined in: packages/core/dist/core/src/SignalWire.d.ts:10

___

### removeAllListeners

▸ **removeAllListeners**(...`params`: [event?: string \| symbol]): *EventEmitter*<string \| symbol, any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event?: string \| symbol] |

**Returns:** *EventEmitter*<string \| symbol, any\>

Inherited from: SignalWire.removeAllListeners

Defined in: packages/core/dist/core/src/SignalWire.d.ts:12
