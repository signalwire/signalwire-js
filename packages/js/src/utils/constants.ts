export const ROOM_COMPONENT_LISTENERS = {
  state: 'onStateChange',
  errors: 'onError',
  responses: 'onSuccess',
}

export const SCREENSHARE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: false,
  // @ts-expect-error
  googAutoGainControl: false,
}
