[@signalwire/js](../README.md) / [WebRTC](../modules/webrtc.md) / Call

# Class: Call

[WebRTC](../modules/webrtc.md).Call

## Hierarchy

- *BaseCall*

  ↳ **Call**

## Table of contents

### Constructors

- [constructor](webrtc.call.md#constructor)

### Properties

- [audioElements](webrtc.call.md#audioelements)
- [cause](webrtc.call.md#cause)
- [causeCode](webrtc.call.md#causecode)
- [direction](webrtc.call.md#direction)
- [doReinvite](webrtc.call.md#doreinvite)
- [gotEarly](webrtc.call.md#gotearly)
- [id](webrtc.call.md#id)
- [isDirect](webrtc.call.md#isdirect)
- [join](webrtc.call.md#join)
- [nodeId](webrtc.call.md#nodeid)
- [options](webrtc.call.md#options)
- [participantLayerIndex](webrtc.call.md#participantlayerindex)
- [participantLogo](webrtc.call.md#participantlogo)
- [peer](webrtc.call.md#peer)
- [screenShare](webrtc.call.md#screenshare)
- [secondSource](webrtc.call.md#secondsource)
- [videoElements](webrtc.call.md#videoelements)

### Accessors

- [active](webrtc.call.md#active)
- [cameraId](webrtc.call.md#cameraid)
- [cameraLabel](webrtc.call.md#cameralabel)
- [destroyer](webrtc.call.md#destroyer)
- [emitter](webrtc.call.md#emitter)
- [extension](webrtc.call.md#extension)
- [htmlAudioElement](webrtc.call.md#htmlaudioelement)
- [htmlVideoElement](webrtc.call.md#htmlvideoelement)
- [localAudioTrack](webrtc.call.md#localaudiotrack)
- [localStream](webrtc.call.md#localstream)
- [localVideoTrack](webrtc.call.md#localvideotrack)
- [memberId](webrtc.call.md#memberid)
- [messagePayload](webrtc.call.md#messagepayload)
- [microphoneId](webrtc.call.md#microphoneid)
- [microphoneLabel](webrtc.call.md#microphonelabel)
- [remoteStream](webrtc.call.md#remotestream)
- [store](webrtc.call.md#store)
- [trying](webrtc.call.md#trying)
- [withAudio](webrtc.call.md#withaudio)
- [withVideo](webrtc.call.md#withvideo)

### Methods

- [\_finalize](webrtc.call.md#_finalize)
- [answer](webrtc.call.md#answer)
- [audioMute](webrtc.call.md#audiomute)
- [audioUnmute](webrtc.call.md#audiounmute)
- [deaf](webrtc.call.md#deaf)
- [desktopOnlyMethod](webrtc.call.md#desktoponlymethod)
- [destroy](webrtc.call.md#destroy)
- [disableInboundAudio](webrtc.call.md#disableinboundaudio)
- [disableOutboundAudio](webrtc.call.md#disableoutboundaudio)
- [disableOutboundVideo](webrtc.call.md#disableoutboundvideo)
- [doReinviteWithRelayOnly](webrtc.call.md#doreinvitewithrelayonly)
- [dtmf](webrtc.call.md#dtmf)
- [emit](webrtc.call.md#emit)
- [enableInboundAudio](webrtc.call.md#enableinboundaudio)
- [enableOutboundAudio](webrtc.call.md#enableoutboundaudio)
- [enableOutboundVideo](webrtc.call.md#enableoutboundvideo)
- [execute](webrtc.call.md#execute)
- [executeInvite](webrtc.call.md#executeinvite)
- [getLayoutList](webrtc.call.md#getlayoutlist)
- [hangup](webrtc.call.md#hangup)
- [hideVideoMuted](webrtc.call.md#hidevideomuted)
- [invite](webrtc.call.md#invite)
- [off](webrtc.call.md#off)
- [on](webrtc.call.md#on)
- [onError](webrtc.call.md#onerror)
- [onLocalSDPReady](webrtc.call.md#onlocalsdpready)
- [onRemoteSDP](webrtc.call.md#onremotesdp)
- [onRoomId](webrtc.call.md#onroomid)
- [onStateChange](webrtc.call.md#onstatechange)
- [onSuccess](webrtc.call.md#onsuccess)
- [once](webrtc.call.md#once)
- [removeAllListeners](webrtc.call.md#removealllisteners)
- [removeMember](webrtc.call.md#removemember)
- [restoreOutboundAudio](webrtc.call.md#restoreoutboundaudio)
- [restoreOutboundVideo](webrtc.call.md#restoreoutboundvideo)
- [select](webrtc.call.md#select)
- [setInputSensitivity](webrtc.call.md#setinputsensitivity)
- [setLayout](webrtc.call.md#setlayout)
- [setMicrophoneVolume](webrtc.call.md#setmicrophonevolume)
- [setSpeakerVolume](webrtc.call.md#setspeakervolume)
- [setState](webrtc.call.md#setstate)
- [showVideoMuted](webrtc.call.md#showvideomuted)
- [stopOutboundAudio](webrtc.call.md#stopoutboundaudio)
- [stopOutboundVideo](webrtc.call.md#stopoutboundvideo)
- [toggleInboundAudio](webrtc.call.md#toggleinboundaudio)
- [toggleOutboundAudio](webrtc.call.md#toggleoutboundaudio)
- [toggleOutboundVideo](webrtc.call.md#toggleoutboundvideo)
- [undeaf](webrtc.call.md#undeaf)
- [vertoExecute](webrtc.call.md#vertoexecute)
- [videoMute](webrtc.call.md#videomute)
- [videoUnmute](webrtc.call.md#videounmute)

## Constructors

### constructor

\+ **new Call**(`options`: BaseCallOptions): [*Call*](webrtc.call.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | BaseCallOptions |

**Returns:** [*Call*](webrtc.call.md)

Inherited from: BaseCall.constructor

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:36

## Properties

### audioElements

• **audioElements**: HTMLAudioElement[]

Inherited from: BaseCall.audioElements

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:28

___

### cause

• **cause**: *string*

Inherited from: BaseCall.cause

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:20

___

### causeCode

• **causeCode**: *string*

Inherited from: BaseCall.causeCode

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:21

___

### direction

• **direction**: Direction

Inherited from: BaseCall.direction

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:17

___

### doReinvite

• **doReinvite**: *boolean*

Inherited from: BaseCall.doReinvite

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:25

___

### gotEarly

• **gotEarly**: *boolean*

Inherited from: BaseCall.gotEarly

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:22

___

### id

• **id**: *string*

Inherited from: BaseCall.id

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:10

___

### isDirect

• **isDirect**: *boolean*

Inherited from: BaseCall.isDirect

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:26

___

### join

• **join**: () => *Promise*<unknown\>

#### Type declaration

▸ (): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.join

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:79

___

### nodeId

• **nodeId**: *string*

Inherited from: BaseCall.nodeId

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:16

___

### options

• **options**: BaseCallOptions

Inherited from: BaseCall.options

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:19

___

### participantLayerIndex

• **participantLayerIndex**: *number*

Inherited from: BaseCall.participantLayerIndex

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:29

___

### participantLogo

• **participantLogo**: *string*

Inherited from: BaseCall.participantLogo

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:30

___

### peer

• **peer**: *default*

Inherited from: BaseCall.peer

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:18

___

### screenShare

• `Optional` **screenShare**: *BaseCall*

Inherited from: BaseCall.screenShare

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:23

___

### secondSource

• `Optional` **secondSource**: *BaseCall*

Inherited from: BaseCall.secondSource

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:24

___

### videoElements

• **videoElements**: HTMLVideoElement[]

Inherited from: BaseCall.videoElements

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:27

## Accessors

### active

• get **active**(): *boolean*

**Returns:** *boolean*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:38

___

### cameraId

• get **cameraId**(): *string*

**Returns:** *string*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:61

___

### cameraLabel

• get **cameraLabel**(): *string*

**Returns:** *string*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:62

___

### destroyer

• set **destroyer**(`d`: () => *void*): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `d` | () => *void* |

**Returns:** *any*

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:14

___

### emitter

• get **emitter**(): Emitter

**Returns:** Emitter

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:16

___

### extension

• get **extension**(): *string*

**Returns:** *string*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:40

• set **extension**(`extension`: *string*): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `extension` | *string* |

**Returns:** *any*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:42

___

### htmlAudioElement

• get **htmlAudioElement**(): HTMLAudioElement

**Returns:** HTMLAudioElement

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:68

___

### htmlVideoElement

• get **htmlVideoElement**(): HTMLVideoElement

**Returns:** HTMLVideoElement

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:67

___

### localAudioTrack

• get **localAudioTrack**(): MediaStreamTrack

**Returns:** MediaStreamTrack

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:70

___

### localStream

• get **localStream**(): MediaStream

**Returns:** MediaStream

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:43

___

### localVideoTrack

• get **localVideoTrack**(): MediaStreamTrack

**Returns:** MediaStreamTrack

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:69

___

### memberId

• get **memberId**(): *string*

**Returns:** *string*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:41

___

### messagePayload

• get **messagePayload**(): *object*

**Returns:** *object*

| Name | Type |
| :------ | :------ |
| `dialogParams` | *object* |
| `dialogParams.attach` | *boolean* |
| `dialogParams.callerName` | *string* |
| `dialogParams.callerNumber` | *string* |
| `dialogParams.destinationNumber` | *string* |
| `dialogParams.id` | *string* |
| `dialogParams.remoteCallerName` | *string* |
| `dialogParams.remoteCallerNumber` | *string* |
| `dialogParams.screenShare` | *boolean* |
| `dialogParams.userVariables` | *object* |
| `sessid` | *string* |

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:45

___

### microphoneId

• get **microphoneId**(): *string*

**Returns:** *string*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:63

___

### microphoneLabel

• get **microphoneLabel**(): *string*

**Returns:** *string*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:64

___

### remoteStream

• get **remoteStream**(): MediaStream

**Returns:** MediaStream

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:44

___

### store

• get **store**(): *Store*<any, AnyAction\>

**Returns:** *Store*<any, AnyAction\>

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:15

___

### trying

• get **trying**(): *boolean*

**Returns:** *boolean*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:39

___

### withAudio

• get **withAudio**(): *boolean*

**Returns:** *boolean*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:65

___

### withVideo

• get **withVideo**(): *boolean*

**Returns:** *boolean*

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:66

## Methods

### \_finalize

▸ `Protected` **_finalize**(): *void*

**Returns:** *void*

Inherited from: BaseCall.\_finalize

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:128

___

### answer

▸ **answer**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.answer

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:81

___

### audioMute

▸ **audioMute**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.audioMute

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:116

___

### audioUnmute

▸ **audioUnmute**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.audioUnmute

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:117

___

### deaf

▸ **deaf**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.deaf

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:120

___

### desktopOnlyMethod

▸ **desktopOnlyMethod**(): *void*

**Returns:** *void*

Defined in: packages/webrtc/dist/webrtc/src/Call.d.ts:3

___

### destroy

▸ **destroy**(): *void*

**Returns:** *void*

Inherited from: BaseCall.destroy

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:22

___

### disableInboundAudio

▸ **disableInboundAudio**(): *void*

Deaf

**Returns:** *void*

Inherited from: BaseCall.disableInboundAudio

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:95

___

### disableOutboundAudio

▸ **disableOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.disableOutboundAudio

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:86

___

### disableOutboundVideo

▸ **disableOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.disableOutboundVideo

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:89

___

### doReinviteWithRelayOnly

▸ **doReinviteWithRelayOnly**(): *void*

**Returns:** *void*

Inherited from: BaseCall.doReinviteWithRelayOnly

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:104

___

### dtmf

▸ **dtmf**(`dtmf`: *string*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `dtmf` | *string* |

**Returns:** *void*

Inherited from: BaseCall.dtmf

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:85

___

### emit

▸ **emit**(...`params`: [event: string \| symbol, ...args: any[]]): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event: string \| symbol, ...args: any[]] |

**Returns:** *boolean*

Inherited from: BaseCall.emit

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:20

___

### enableInboundAudio

▸ **enableInboundAudio**(): *void*

Undeaf

**Returns:** *void*

Inherited from: BaseCall.enableInboundAudio

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:99

___

### enableOutboundAudio

▸ **enableOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.enableOutboundAudio

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:87

___

### enableOutboundVideo

▸ **enableOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.enableOutboundVideo

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:90

___

### execute

▸ **execute**(`__namedParameters`: ExecuteParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | ExecuteParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.execute

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:23

___

### executeInvite

▸ **executeInvite**(`sdp`: *string*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sdp` | *string* |

**Returns:** *Promise*<void\>

Inherited from: BaseCall.executeInvite

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:83

___

### getLayoutList

▸ **getLayoutList**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.getLayoutList

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:110

___

### hangup

▸ **hangup**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Inherited from: BaseCall.hangup

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:84

___

### hideVideoMuted

▸ **hideVideoMuted**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.hideVideoMuted

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:114

___

### invite

▸ **invite**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.invite

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:80

___

### off

▸ **off**(...`params`: [event: string \| symbol, fn?: function, context?: any, once?: boolean]): *EventEmitter*<string \| symbol, any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event: string \| symbol, fn?: function, context?: any, once?: boolean] |

**Returns:** *EventEmitter*<string \| symbol, any\>

Inherited from: BaseCall.off

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:19

___

### on

▸ **on**(...`params`: [event: string \| symbol, fn: function, context?: any]): *EventEmitter*<string \| symbol, any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event: string \| symbol, fn: function, context?: any] |

**Returns:** *EventEmitter*<string \| symbol, any\>

Inherited from: BaseCall.on

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:17

___

### onError

▸ **onError**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onError

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:25

___

### onLocalSDPReady

▸ **onLocalSDPReady**(`localDescription`: RTCSessionDescription): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `localDescription` | RTCSessionDescription |

**Returns:** *void*

Inherited from: BaseCall.onLocalSDPReady

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:82

___

### onRemoteSDP

▸ **onRemoteSDP**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onRemoteSDP

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:77

___

### onRoomId

▸ **onRoomId**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onRoomId

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:78

___

### onStateChange

▸ **onStateChange**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onStateChange

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:76

___

### onSuccess

▸ **onSuccess**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onSuccess

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:26

___

### once

▸ **once**(...`params`: [event: string \| symbol, fn: function, context?: any]): *EventEmitter*<string \| symbol, any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event: string \| symbol, fn: function, context?: any] |

**Returns:** *EventEmitter*<string \| symbol, any\>

Inherited from: BaseCall.once

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:18

___

### removeAllListeners

▸ **removeAllListeners**(...`params`: [event?: string \| symbol]): *EventEmitter*<string \| symbol, any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [event?: string \| symbol] |

**Returns:** *EventEmitter*<string \| symbol, any\>

Inherited from: BaseCall.removeAllListeners

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:21

___

### removeMember

▸ **removeMember**(`__namedParameters`: *Required*<MemberCommandParams\>): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | *Required*<MemberCommandParams\> |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.removeMember

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:125

___

### restoreOutboundAudio

▸ **restoreOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.restoreOutboundAudio

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:106

___

### restoreOutboundVideo

▸ **restoreOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.restoreOutboundVideo

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:108

___

### select

▸ **select**<T\>(`selectorFn`: (`state`: SDKState) => T): T

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `selectorFn` | (`state`: SDKState) => T |

**Returns:** T

Inherited from: BaseCall.select

Defined in: packages/core/dist/core/src/BaseComponent.d.ts:24

___

### setInputSensitivity

▸ **setInputSensitivity**(`__namedParameters`: MemberCommandWithValueParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | MemberCommandWithValueParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.setInputSensitivity

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:124

___

### setLayout

▸ **setLayout**(`__namedParameters`: { `name`: *string*  }): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | *object* |
| `__namedParameters.name` | *string* |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.setLayout

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:111

___

### setMicrophoneVolume

▸ **setMicrophoneVolume**(`__namedParameters`: MemberCommandWithVolumeParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | MemberCommandWithVolumeParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.setMicrophoneVolume

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:123

___

### setSpeakerVolume

▸ **setSpeakerVolume**(`__namedParameters`: MemberCommandWithVolumeParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | MemberCommandWithVolumeParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.setSpeakerVolume

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:122

___

### setState

▸ **setState**(`state`: SwWebRTCCallState): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `state` | SwWebRTCCallState |

**Returns:** *void*

Inherited from: BaseCall.setState

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:109

___

### showVideoMuted

▸ **showVideoMuted**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.showVideoMuted

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:115

___

### stopOutboundAudio

▸ **stopOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.stopOutboundAudio

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:105

___

### stopOutboundVideo

▸ **stopOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.stopOutboundVideo

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:107

___

### toggleInboundAudio

▸ **toggleInboundAudio**(): *void*

Toggle Deaf

**Returns:** *void*

Inherited from: BaseCall.toggleInboundAudio

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:103

___

### toggleOutboundAudio

▸ **toggleOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.toggleOutboundAudio

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:88

___

### toggleOutboundVideo

▸ **toggleOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.toggleOutboundVideo

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:91

___

### undeaf

▸ **undeaf**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.undeaf

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:121

___

### vertoExecute

▸ **vertoExecute**(`vertoMessage`: *any*): *Promise*<unknown\>

Verto messages have to be wrapped into a blade.execute
request and sent using the 'video.message' method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `vertoMessage` | *any* |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.vertoExecute

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:75

___

### videoMute

▸ **videoMute**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.videoMute

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:118

___

### videoUnmute

▸ **videoUnmute**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.videoUnmute

Defined in: packages/webrtc/dist/webrtc/src/BaseCall.d.ts:119
