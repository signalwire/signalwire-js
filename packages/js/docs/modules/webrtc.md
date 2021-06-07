[@signalwire/js](../README.md) / WebRTC

# Namespace: WebRTC

## Table of contents

### Classes

- [Call](../classes/webrtc.call.md)

### Functions

- [RTCPeerConnection](webrtc.md#rtcpeerconnection)
- [assureDeviceId](webrtc.md#assuredeviceid)
- [checkCameraPermissions](webrtc.md#checkcamerapermissions)
- [checkDeviceIdConstraints](webrtc.md#checkdeviceidconstraints)
- [checkMicrophonePermissions](webrtc.md#checkmicrophonepermissions)
- [checkPermissions](webrtc.md#checkpermissions)
- [checkSpeakerPermissions](webrtc.md#checkspeakerpermissions)
- [createCameraDeviceWatcher](webrtc.md#createcameradevicewatcher)
- [createDeviceWatcher](webrtc.md#createdevicewatcher)
- [createMicrophoneDeviceWatcher](webrtc.md#createmicrophonedevicewatcher)
- [createSpeakerDeviceWatcher](webrtc.md#createspeakerdevicewatcher)
- [enumerateDevices](webrtc.md#enumeratedevices)
- [enumerateDevicesByKind](webrtc.md#enumeratedevicesbykind)
- [getAudioInDevices](webrtc.md#getaudioindevices)
- [getAudioInDevicesWithPermissions](webrtc.md#getaudioindeviceswithpermissions)
- [getAudioOutDevices](webrtc.md#getaudiooutdevices)
- [getAudioOutDevicesWithPermissions](webrtc.md#getaudiooutdeviceswithpermissions)
- [getDevices](webrtc.md#getdevices)
- [getDevicesWithPermissions](webrtc.md#getdeviceswithpermissions)
- [getDisplayMedia](webrtc.md#getdisplaymedia)
- [getMediaDevicesApi](webrtc.md#getmediadevicesapi)
- [getSupportedConstraints](webrtc.md#getsupportedconstraints)
- [getUserMedia](webrtc.md#getusermedia)
- [getVideoDevices](webrtc.md#getvideodevices)
- [getVideoDevicesWithPermissions](webrtc.md#getvideodeviceswithpermissions)
- [requestPermissions](webrtc.md#requestpermissions)
- [scanResolutions](webrtc.md#scanresolutions)
- [sdpToJsonHack](webrtc.md#sdptojsonhack)
- [setMediaElementSinkId](webrtc.md#setmediaelementsinkid)
- [stopStream](webrtc.md#stopstream)
- [stopTrack](webrtc.md#stoptrack)
- [streamIsValid](webrtc.md#streamisvalid)
- [supportsMediaDevices](webrtc.md#supportsmediadevices)
- [supportsMediaOutput](webrtc.md#supportsmediaoutput)
- [validateAudioInDevice](webrtc.md#validateaudioindevice)
- [validateAudioOutDevice](webrtc.md#validateaudiooutdevice)
- [validateVideoDevice](webrtc.md#validatevideodevice)

## Functions

### RTCPeerConnection

▸ `Const` **RTCPeerConnection**(`config`: RTCConfiguration): RTCPeerConnection

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | RTCConfiguration |

**Returns:** RTCPeerConnection

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:1

___

### assureDeviceId

▸ `Const` **assureDeviceId**(`id`: *string*, `label`: *string*, `name`: ``"camera"`` \| ``"microphone"`` \| ``"speaker"``): *Promise*<string\>

Assure a deviceId exists in the current device list from the browser.
It checks for deviceId or label - in case the UA changed the deviceId randomly

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |
| `label` | *string* |
| `name` | ``"camera"`` \| ``"microphone"`` \| ``"speaker"`` |

**Returns:** *Promise*<string\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:34

___

### checkCameraPermissions

▸ `Const` **checkCameraPermissions**(): *Promise*<boolean\>

**Returns:** *Promise*<boolean\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:4

___

### checkDeviceIdConstraints

▸ `Const` **checkDeviceIdConstraints**(`id`: *string*, `label`: *string*, `name`: ``"camera"`` \| ``"microphone"`` \| ``"speaker"``, `constraints`: MediaTrackConstraints): *Promise*<MediaTrackConstraints\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |
| `label` | *string* |
| `name` | ``"camera"`` \| ``"microphone"`` \| ``"speaker"`` |
| `constraints` | MediaTrackConstraints |

**Returns:** *Promise*<MediaTrackConstraints\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:41

___

### checkMicrophonePermissions

▸ `Const` **checkMicrophonePermissions**(): *Promise*<boolean\>

**Returns:** *Promise*<boolean\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:5

___

### checkPermissions

▸ `Const` **checkPermissions**(`name?`: ``"camera"`` \| ``"microphone"`` \| ``"speaker"``): *Promise*<boolean\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name?` | ``"camera"`` \| ``"microphone"`` \| ``"speaker"`` |

**Returns:** *Promise*<boolean\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:3

___

### checkSpeakerPermissions

▸ `Const` **checkSpeakerPermissions**(): *Promise*<boolean\>

**Returns:** *Promise*<boolean\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:6

___

### createCameraDeviceWatcher

▸ `Const` **createCameraDeviceWatcher**(): *Promise*<EventEmitter<string \| symbol, any\>\>

**Returns:** *Promise*<EventEmitter<string \| symbol, any\>\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:49

___

### createDeviceWatcher

▸ `Const` **createDeviceWatcher**(`options?`: CreateDeviceWatcherOptions): *Promise*<EventEmitter<string \| symbol, any\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | CreateDeviceWatcherOptions |

**Returns:** *Promise*<EventEmitter<string \| symbol, any\>\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:46

___

### createMicrophoneDeviceWatcher

▸ `Const` **createMicrophoneDeviceWatcher**(): *Promise*<EventEmitter<string \| symbol, any\>\>

**Returns:** *Promise*<EventEmitter<string \| symbol, any\>\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:47

___

### createSpeakerDeviceWatcher

▸ `Const` **createSpeakerDeviceWatcher**(): *Promise*<EventEmitter<string \| symbol, any\>\>

**Returns:** *Promise*<EventEmitter<string \| symbol, any\>\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:48

___

### enumerateDevices

▸ `Const` **enumerateDevices**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:6

___

### enumerateDevicesByKind

▸ `Const` **enumerateDevicesByKind**(`filterByKind?`: MediaDeviceKind): *Promise*<MediaDeviceInfo[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filterByKind?` | MediaDeviceKind |

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:7

___

### getAudioInDevices

▸ `Const` **getAudioInDevices**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:23

___

### getAudioInDevicesWithPermissions

▸ `Const` **getAudioInDevicesWithPermissions**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:16

___

### getAudioOutDevices

▸ `Const` **getAudioOutDevices**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:24

___

### getAudioOutDevicesWithPermissions

▸ `Const` **getAudioOutDevicesWithPermissions**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:17

___

### getDevices

▸ `Const` **getDevices**(`name?`: ``"camera"`` \| ``"microphone"`` \| ``"speaker"``, `fullList?`: *boolean*): *Promise*<MediaDeviceInfo[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name?` | ``"camera"`` \| ``"microphone"`` \| ``"speaker"`` |
| `fullList?` | *boolean* |

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:18

___

### getDevicesWithPermissions

▸ `Const` **getDevicesWithPermissions**(`kind?`: ``"camera"`` \| ``"microphone"`` \| ``"speaker"``, `fullList?`: *boolean*): *Promise*<MediaDeviceInfo[]\>

Retrieve device list using the browser APIs
It checks for permission to return valid deviceId and label

#### Parameters

| Name | Type |
| :------ | :------ |
| `kind?` | ``"camera"`` \| ``"microphone"`` \| ``"speaker"`` |
| `fullList?` | *boolean* |

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:11

___

### getDisplayMedia

▸ `Const` **getDisplayMedia**(`constraints`: MediaStreamConstraints): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `constraints` | MediaStreamConstraints |

**Returns:** *any*

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:5

___

### getMediaDevicesApi

▸ `Const` **getMediaDevicesApi**(): MediaDevices

**Returns:** MediaDevices

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:3

___

### getSupportedConstraints

▸ `Const` **getSupportedConstraints**(): MediaTrackSupportedConstraints

**Returns:** MediaTrackSupportedConstraints

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:8

___

### getUserMedia

▸ `Const` **getUserMedia**(`constraints?`: MediaStreamConstraints): *Promise*<MediaStream\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `constraints?` | MediaStreamConstraints |

**Returns:** *Promise*<MediaStream\>

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:4

___

### getVideoDevices

▸ `Const` **getVideoDevices**(): *Promise*<MediaDeviceInfo[]\>

Helper methods to get devices by kind

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:22

___

### getVideoDevicesWithPermissions

▸ `Const` **getVideoDevicesWithPermissions**(): *Promise*<MediaDeviceInfo[]\>

Helper methods to get devices by kind

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:15

___

### requestPermissions

▸ `Const` **requestPermissions**(`constraints`: MediaStreamConstraints): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `constraints` | MediaStreamConstraints |

**Returns:** *Promise*<void\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:42

___

### scanResolutions

▸ `Const` **scanResolutions**(`deviceId`: *string*): *Promise*<{ `height`: *number* ; `resolution`: *string* ; `width`: *number*  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | *string* |

**Returns:** *Promise*<{ `height`: *number* ; `resolution`: *string* ; `width`: *number*  }[]\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:25

___

### sdpToJsonHack

▸ `Const` **sdpToJsonHack**(`sdp`: *any*): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `sdp` | *any* |

**Returns:** *any*

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:12

___

### setMediaElementSinkId

▸ `Const` **setMediaElementSinkId**(`el`: HTMLMediaElement, `deviceId`: *string*): *Promise*<boolean\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `el` | HTMLMediaElement |
| `deviceId` | *string* |

**Returns:** *Promise*<boolean\>

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:11

___

### stopStream

▸ `Const` **stopStream**(`stream?`: MediaStream): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream?` | MediaStream |

**Returns:** *void*

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:13

___

### stopTrack

▸ `Const` **stopTrack**(`track`: MediaStreamTrack): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `track` | MediaStreamTrack |

**Returns:** *void*

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:14

___

### streamIsValid

▸ `Const` **streamIsValid**(`stream?`: MediaStream): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream?` | MediaStream |

**Returns:** *boolean*

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:9

___

### supportsMediaDevices

▸ `Const` **supportsMediaDevices**(): *boolean*

**Returns:** *boolean*

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:2

___

### supportsMediaOutput

▸ `Const` **supportsMediaOutput**(): *boolean*

**Returns:** *boolean*

Defined in: packages/webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:10

___

### validateAudioInDevice

▸ `Const` **validateAudioInDevice**(`id`: *string*, `label`: *string*): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |
| `label` | *string* |

**Returns:** *Promise*<string\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:39

___

### validateAudioOutDevice

▸ `Const` **validateAudioOutDevice**(`id`: *string*, `label`: *string*): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |
| `label` | *string* |

**Returns:** *Promise*<string\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:40

___

### validateVideoDevice

▸ `Const` **validateVideoDevice**(`id`: *string*, `label`: *string*): *Promise*<string\>

Helper methods to assure a deviceId without asking the user the "kind"

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |
| `label` | *string* |

**Returns:** *Promise*<string\>

Defined in: packages/webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:38
