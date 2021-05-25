[@signalwire/web](../README.md) / [WebRTC](../modules/webrtc.md) / Call

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
- [hangup](webrtc.call.md#hangup)
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
- [setMicrophoneVolume](webrtc.call.md#setmicrophonevolume)
- [setNoiseGateValue](webrtc.call.md#setnoisegatevalue)
- [setSpeakerVolume](webrtc.call.md#setspeakervolume)
- [setState](webrtc.call.md#setstate)
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

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:33

## Properties

### audioElements

• **audioElements**: HTMLAudioElement[]

Inherited from: BaseCall.audioElements

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:25

___

### cause

• **cause**: *string*

Inherited from: BaseCall.cause

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:17

___

### causeCode

• **causeCode**: *string*

Inherited from: BaseCall.causeCode

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:18

___

### direction

• **direction**: Direction

Inherited from: BaseCall.direction

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:14

___

### doReinvite

• **doReinvite**: *boolean*

Inherited from: BaseCall.doReinvite

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:22

___

### gotEarly

• **gotEarly**: *boolean*

Inherited from: BaseCall.gotEarly

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:19

___

### id

• **id**: *string*

Inherited from: BaseCall.id

Defined in: core/dist/core/src/BaseComponent.d.ts:10

___

### isDirect

• **isDirect**: *boolean*

Inherited from: BaseCall.isDirect

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:23

___

### join

• **join**: () => *Promise*<unknown\>

#### Type declaration

▸ (): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.join

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:76

___

### nodeId

• **nodeId**: *string*

Inherited from: BaseCall.nodeId

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:13

___

### options

• **options**: BaseCallOptions

Inherited from: BaseCall.options

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:16

___

### participantLayerIndex

• **participantLayerIndex**: *number*

Inherited from: BaseCall.participantLayerIndex

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:26

___

### participantLogo

• **participantLogo**: *string*

Inherited from: BaseCall.participantLogo

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:27

___

### peer

• **peer**: *default*<CallEvents\>

Inherited from: BaseCall.peer

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:15

___

### screenShare

• `Optional` **screenShare**: *BaseCall*

Inherited from: BaseCall.screenShare

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:20

___

### secondSource

• `Optional` **secondSource**: *BaseCall*

Inherited from: BaseCall.secondSource

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:21

___

### videoElements

• **videoElements**: HTMLVideoElement[]

Inherited from: BaseCall.videoElements

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:24

## Accessors

### active

• get **active**(): *boolean*

**Returns:** *boolean*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:35

___

### cameraId

• get **cameraId**(): *string*

**Returns:** *string*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:58

___

### cameraLabel

• get **cameraLabel**(): *string*

**Returns:** *string*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:59

___

### destroyer

• set **destroyer**(`d`: () => *void*): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `d` | () => *void* |

**Returns:** *any*

Defined in: core/dist/core/src/BaseComponent.d.ts:14

___

### emitter

• get **emitter**(): *Emitter*<EventType, BaseComponent<EventType\>\>

**Returns:** *Emitter*<EventType, BaseComponent<EventType\>\>

Defined in: core/dist/core/src/BaseComponent.d.ts:16

___

### extension

• get **extension**(): *string*

**Returns:** *string*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:37

• set **extension**(`extension`: *string*): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `extension` | *string* |

**Returns:** *any*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:39

___

### htmlAudioElement

• get **htmlAudioElement**(): HTMLAudioElement

**Returns:** HTMLAudioElement

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:65

___

### htmlVideoElement

• get **htmlVideoElement**(): HTMLVideoElement

**Returns:** HTMLVideoElement

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:64

___

### localAudioTrack

• get **localAudioTrack**(): MediaStreamTrack

**Returns:** MediaStreamTrack

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:67

___

### localStream

• get **localStream**(): MediaStream

**Returns:** MediaStream

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:40

___

### localVideoTrack

• get **localVideoTrack**(): MediaStreamTrack

**Returns:** MediaStreamTrack

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:66

___

### memberId

• get **memberId**(): *string*

**Returns:** *string*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:38

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

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:42

___

### microphoneId

• get **microphoneId**(): *string*

**Returns:** *string*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:60

___

### microphoneLabel

• get **microphoneLabel**(): *string*

**Returns:** *string*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:61

___

### remoteStream

• get **remoteStream**(): MediaStream

**Returns:** MediaStream

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:41

___

### store

• get **store**(): *Store*<any, AnyAction\>

**Returns:** *Store*<any, AnyAction\>

Defined in: core/dist/core/src/BaseComponent.d.ts:15

___

### trying

• get **trying**(): *boolean*

**Returns:** *boolean*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:36

___

### withAudio

• get **withAudio**(): *boolean*

**Returns:** *boolean*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:62

___

### withVideo

• get **withVideo**(): *boolean*

**Returns:** *boolean*

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:63

## Methods

### \_finalize

▸ `Protected` **_finalize**(): *void*

**Returns:** *void*

Inherited from: BaseCall.\_finalize

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:119

___

### answer

▸ **answer**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.answer

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:78

___

### audioMute

▸ **audioMute**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.audioMute

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:107

___

### audioUnmute

▸ **audioUnmute**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.audioUnmute

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:108

___

### deaf

▸ **deaf**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.deaf

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:111

___

### desktopOnlyMethod

▸ **desktopOnlyMethod**(): *void*

**Returns:** *void*

Defined in: webrtc/dist/webrtc/src/Call.d.ts:3

___

### destroy

▸ **destroy**(): *void*

**Returns:** *void*

Inherited from: BaseCall.destroy

Defined in: core/dist/core/src/BaseComponent.d.ts:22

___

### disableInboundAudio

▸ **disableInboundAudio**(): *void*

Deaf

**Returns:** *void*

Inherited from: BaseCall.disableInboundAudio

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:92

___

### disableOutboundAudio

▸ **disableOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.disableOutboundAudio

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:83

___

### disableOutboundVideo

▸ **disableOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.disableOutboundVideo

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:86

___

### doReinviteWithRelayOnly

▸ **doReinviteWithRelayOnly**(): *void*

**Returns:** *void*

Inherited from: BaseCall.doReinviteWithRelayOnly

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:101

___

### dtmf

▸ **dtmf**(`dtmf`: *string*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `dtmf` | *string* |

**Returns:** *void*

Inherited from: BaseCall.dtmf

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:82

___

### emit

▸ **emit**(...`params`: [eventName: CallEvents, ...args: any[]]): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [eventName: CallEvents, ...args: any[]] |

**Returns:** *boolean*

Inherited from: BaseCall.emit

Defined in: core/dist/core/src/BaseComponent.d.ts:20

___

### enableInboundAudio

▸ **enableInboundAudio**(): *void*

Undeaf

**Returns:** *void*

Inherited from: BaseCall.enableInboundAudio

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:96

___

### enableOutboundAudio

▸ **enableOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.enableOutboundAudio

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:84

___

### enableOutboundVideo

▸ **enableOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.enableOutboundVideo

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:87

___

### execute

▸ **execute**(`__namedParameters`: ExecuteParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | ExecuteParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.execute

Defined in: core/dist/core/src/BaseComponent.d.ts:23

___

### executeInvite

▸ **executeInvite**(`sdp`: *string*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sdp` | *string* |

**Returns:** *Promise*<void\>

Inherited from: BaseCall.executeInvite

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:80

___

### hangup

▸ **hangup**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Inherited from: BaseCall.hangup

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:81

___

### invite

▸ **invite**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.invite

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:77

___

### off

▸ **off**(...`params`: [eventName: CallEvents, handler?: Function]): *BaseComponent*<CallEvents\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [eventName: CallEvents, handler?: Function] |

**Returns:** *BaseComponent*<CallEvents\>

Inherited from: BaseCall.off

Defined in: core/dist/core/src/BaseComponent.d.ts:19

___

### on

▸ **on**(...`params`: [eventName: CallEvents, handler: Function, once?: boolean]): *BaseComponent*<CallEvents\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [eventName: CallEvents, handler: Function, once?: boolean] |

**Returns:** *BaseComponent*<CallEvents\>

Inherited from: BaseCall.on

Defined in: core/dist/core/src/BaseComponent.d.ts:17

___

### onError

▸ **onError**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onError

Defined in: core/dist/core/src/BaseComponent.d.ts:25

___

### onLocalSDPReady

▸ **onLocalSDPReady**(`localDescription`: RTCSessionDescription): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `localDescription` | RTCSessionDescription |

**Returns:** *void*

Inherited from: BaseCall.onLocalSDPReady

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:79

___

### onRemoteSDP

▸ **onRemoteSDP**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onRemoteSDP

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:74

___

### onRoomId

▸ **onRoomId**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onRoomId

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:75

___

### onStateChange

▸ **onStateChange**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onStateChange

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:73

___

### onSuccess

▸ **onSuccess**(`component`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `component` | *any* |

**Returns:** *void*

Inherited from: BaseCall.onSuccess

Defined in: core/dist/core/src/BaseComponent.d.ts:26

___

### once

▸ **once**(...`params`: [eventName: CallEvents, handler: Function]): *BaseComponent*<CallEvents\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [eventName: CallEvents, handler: Function] |

**Returns:** *BaseComponent*<CallEvents\>

Inherited from: BaseCall.once

Defined in: core/dist/core/src/BaseComponent.d.ts:18

___

### removeAllListeners

▸ **removeAllListeners**(...`params`: []): *BaseComponent*<CallEvents\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...params` | [] |

**Returns:** *BaseComponent*<CallEvents\>

Inherited from: BaseCall.removeAllListeners

Defined in: core/dist/core/src/BaseComponent.d.ts:21

___

### removeMember

▸ **removeMember**(`__namedParameters`: *Required*<MemberCommandParams\>): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | *Required*<MemberCommandParams\> |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.removeMember

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:116

___

### restoreOutboundAudio

▸ **restoreOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.restoreOutboundAudio

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:103

___

### restoreOutboundVideo

▸ **restoreOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.restoreOutboundVideo

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:105

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

Defined in: core/dist/core/src/BaseComponent.d.ts:24

___

### setMicrophoneVolume

▸ **setMicrophoneVolume**(`__namedParameters`: MemberCommandWithValueParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | MemberCommandWithValueParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.setMicrophoneVolume

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:114

___

### setNoiseGateValue

▸ **setNoiseGateValue**(`__namedParameters`: MemberCommandWithValueParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | MemberCommandWithValueParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.setNoiseGateValue

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:115

___

### setSpeakerVolume

▸ **setSpeakerVolume**(`__namedParameters`: MemberCommandWithValueParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | MemberCommandWithValueParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.setSpeakerVolume

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:113

___

### setState

▸ **setState**(`state`: SwWebRTCCallState): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `state` | SwWebRTCCallState |

**Returns:** *void*

Inherited from: BaseCall.setState

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:106

___

### stopOutboundAudio

▸ **stopOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.stopOutboundAudio

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:102

___

### stopOutboundVideo

▸ **stopOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.stopOutboundVideo

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:104

___

### toggleInboundAudio

▸ **toggleInboundAudio**(): *void*

Toggle Deaf

**Returns:** *void*

Inherited from: BaseCall.toggleInboundAudio

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:100

___

### toggleOutboundAudio

▸ **toggleOutboundAudio**(): *void*

**Returns:** *void*

Inherited from: BaseCall.toggleOutboundAudio

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:85

___

### toggleOutboundVideo

▸ **toggleOutboundVideo**(): *void*

**Returns:** *void*

Inherited from: BaseCall.toggleOutboundVideo

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:88

___

### undeaf

▸ **undeaf**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.undeaf

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:112

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

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:72

___

### videoMute

▸ **videoMute**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.videoMute

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:109

___

### videoUnmute

▸ **videoUnmute**(`__namedParameters?`: MemberCommandParams): *Promise*<unknown\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters?` | MemberCommandParams |

**Returns:** *Promise*<unknown\>

Inherited from: BaseCall.videoUnmute

Defined in: webrtc/dist/webrtc/src/BaseCall.d.ts:110
