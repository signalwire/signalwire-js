export const ROOM_COMPONENT_LISTENERS = {
  state: 'onStateChange',
  remoteSDP: 'onRemoteSDP',
  roomId: 'onRoomSubscribed',
  videoConstraints: 'onVideoConstraints',
  audioConstraints: 'onAudioConstraints',
  errors: 'onError',
  responses: 'onSuccess',
}

export const SCREENSHARE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  // @ts-expect-error
  noiseSuppression: false,
  autoGainControl: false,
  googAutoGainControl: false,
}
