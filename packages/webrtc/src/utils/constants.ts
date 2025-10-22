import { ConnectionOptions } from './interfaces'

export const INVITE_VERSION = 1000

export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

export const AUDIO_CONSTRAINTS_SCREENSHARE: MediaTrackConstraints = {
  ...AUDIO_CONSTRAINTS,
  noiseSuppression: false,
  autoGainControl: false,
  // @ts-expect-error
  googAutoGainControl: false,
}

export const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, min: 320 },
  height: { ideal: 720, min: 180 },
  aspectRatio: { ideal: 16 / 9 },
}

export const DEFAULT_CALL_OPTIONS: ConnectionOptions = {
  destinationNumber: 'room',
  remoteCallerName: 'Outbound Call',
  remoteCallerNumber: '',
  callerName: '',
  callerNumber: '',
  audio: AUDIO_CONSTRAINTS,
  video: VIDEO_CONSTRAINTS,
  useStereo: false,
  attach: false,
  screenShare: false,
  additionalDevice: false,
  userVariables: {},
  requestTimeout: 10 * 1000,
  autoApplyMediaParams: true,
  iceGatheringTimeout: 3 * 100,
  maxIceGatheringTimeout: 5 * 1000,
  maxConnectionStateTimeout: 15 * 1000,
  watchMediaPackets: true,
  watchMediaPacketsTimeout: 2 * 1000,
}
