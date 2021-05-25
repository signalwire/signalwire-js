[@signalwire/web](../README.md) / WebRTC

# Namespace: WebRTC

## Table of contents

### Classes

- [Call](../classes/webrtc.call.md)

### Functions

- [RTCPeerConnection](webrtc.md#rtcpeerconnection)
- [assureDeviceId](webrtc.md#assuredeviceid)
- [checkAudioPermissions](webrtc.md#checkaudiopermissions)
- [checkDeviceIdConstraints](webrtc.md#checkdeviceidconstraints)
- [checkPermissions](webrtc.md#checkpermissions)
- [checkVideoPermissions](webrtc.md#checkvideopermissions)
- [enumerateDevices](webrtc.md#enumeratedevices)
- [enumerateDevicesByKind](webrtc.md#enumeratedevicesbykind)
- [getAudioInDevices](webrtc.md#getaudioindevices)
- [getAudioInDevicesWithPermissions](webrtc.md#getaudioindeviceswithpermissions)
- [getAudioOutDevices](webrtc.md#getaudiooutdevices)
- [getAudioOutDevicesWithPermissions](webrtc.md#getaudiooutdeviceswithpermissions)
- [getDevices](webrtc.md#getdevices)
- [getDevicesWithPermissions](webrtc.md#getdeviceswithpermissions)
- [getDisplayMedia](webrtc.md#getdisplaymedia)
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

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:1

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

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:32

___

### checkAudioPermissions

▸ `Const` **checkAudioPermissions**(): *Promise*<boolean\>

**Returns:** *Promise*<boolean\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:4

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

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:39

___

### checkPermissions

▸ `Const` **checkPermissions**(`name?`: ``"camera"`` \| ``"microphone"`` \| ``"speaker"``): *Promise*<boolean\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name?` | ``"camera"`` \| ``"microphone"`` \| ``"speaker"`` |

**Returns:** *Promise*<boolean\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:2

___

### checkVideoPermissions

▸ `Const` **checkVideoPermissions**(): *Promise*<boolean\>

**Returns:** *Promise*<boolean\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:3

___

### enumerateDevices

▸ `Const` **enumerateDevices**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:4

___

### enumerateDevicesByKind

▸ `Const` **enumerateDevicesByKind**(`filterByKind?`: MediaDeviceKind): *Promise*<MediaDeviceInfo[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filterByKind?` | MediaDeviceKind |

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:5

___

### getAudioInDevices

▸ `Const` **getAudioInDevices**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:21

___

### getAudioInDevicesWithPermissions

▸ `Const` **getAudioInDevicesWithPermissions**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:14

___

### getAudioOutDevices

▸ `Const` **getAudioOutDevices**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:22

___

### getAudioOutDevicesWithPermissions

▸ `Const` **getAudioOutDevicesWithPermissions**(): *Promise*<MediaDeviceInfo[]\>

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:15

___

### getDevices

▸ `Const` **getDevices**(`name?`: ``"camera"`` \| ``"microphone"`` \| ``"speaker"``, `fullList?`: *boolean*): *Promise*<MediaDeviceInfo[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name?` | ``"camera"`` \| ``"microphone"`` \| ``"speaker"`` |
| `fullList?` | *boolean* |

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:16

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

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:9

___

### getDisplayMedia

▸ `Const` **getDisplayMedia**(`constraints`: MediaStreamConstraints): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `constraints` | MediaStreamConstraints |

**Returns:** *any*

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:3

___

### getSupportedConstraints

▸ `Const` **getSupportedConstraints**(): MediaTrackSupportedConstraints

**Returns:** MediaTrackSupportedConstraints

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:6

___

### getUserMedia

▸ `Const` **getUserMedia**(`constraints?`: MediaStreamConstraints): *Promise*<MediaStream\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `constraints?` | MediaStreamConstraints |

**Returns:** *Promise*<MediaStream\>

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:2

___

### getVideoDevices

▸ `Const` **getVideoDevices**(): *Promise*<MediaDeviceInfo[]\>

Helper methods to get devices by kind

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:20

___

### getVideoDevicesWithPermissions

▸ `Const` **getVideoDevicesWithPermissions**(): *Promise*<MediaDeviceInfo[]\>

Helper methods to get devices by kind

**Returns:** *Promise*<MediaDeviceInfo[]\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:13

___

### requestPermissions

▸ `Const` **requestPermissions**(`constraints`: MediaStreamConstraints): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `constraints` | MediaStreamConstraints |

**Returns:** *Promise*<void\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:40

___

### scanResolutions

▸ `Const` **scanResolutions**(`deviceId`: *string*): *Promise*<{ `height`: *number* ; `resolution`: *string* ; `width`: *number*  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | *string* |

**Returns:** *Promise*<{ `height`: *number* ; `resolution`: *string* ; `width`: *number*  }[]\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:23

___

### sdpToJsonHack

▸ `Const` **sdpToJsonHack**(`sdp`: *any*): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `sdp` | *any* |

**Returns:** *any*

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:10

___

### setMediaElementSinkId

▸ `Const` **setMediaElementSinkId**(`el`: HTMLMediaElement, `deviceId`: *string*): *Promise*<boolean\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `el` | HTMLMediaElement |
| `deviceId` | *string* |

**Returns:** *Promise*<boolean\>

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:9

___

### stopStream

▸ `Const` **stopStream**(`stream?`: MediaStream): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream?` | MediaStream |

**Returns:** *void*

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:11

___

### stopTrack

▸ `Const` **stopTrack**(`track`: MediaStreamTrack): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `track` | MediaStreamTrack |

**Returns:** *void*

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:12

___

### streamIsValid

▸ `Const` **streamIsValid**(`stream?`: MediaStream): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream?` | MediaStream |

**Returns:** *boolean*

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:7

___

### supportsMediaOutput

▸ `Const` **supportsMediaOutput**(): *boolean*

**Returns:** *boolean*

Defined in: webrtc/dist/webrtc/src/utils/webrtcHelpers.d.ts:8

___

### validateAudioInDevice

▸ `Const` **validateAudioInDevice**(`id`: *string*, `label`: *string*): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |
| `label` | *string* |

**Returns:** *Promise*<string\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:37

___

### validateAudioOutDevice

▸ `Const` **validateAudioOutDevice**(`id`: *string*, `label`: *string*): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |
| `label` | *string* |

**Returns:** *Promise*<string\>

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:38

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

Defined in: webrtc/dist/webrtc/src/utils/deviceHelpers.d.ts:36
