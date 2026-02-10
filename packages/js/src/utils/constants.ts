export const SCREENSHARE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: false,
  // @ts-expect-error
  googAutoGainControl: false,
}
