import { MediaControlParams } from './interfaces'

export const validateUpdateMediaParams = (params: MediaControlParams) => {
  const { audio, video } = params
  const enabledDirections = ['send', 'sendrecv']
  const disabledDirections = ['none', 'receive']

  if (
    (audio && audio.enable && !enabledDirections.includes(audio.direction)) ||
    (video && video.enable && !enabledDirections.includes(video.direction))
  ) {
    return new Error(
      'Invalid media direction specified. When enabling the media, the direction can only be "send" or "sendrecv"'
    )
  }

  if (
    (audio && !audio.enable && !disabledDirections.includes(audio.direction)) ||
    (video && !video.enable && !disabledDirections.includes(video.direction))
  ) {
    return new Error(
      'Invalid media direction specified. When disabling the media, the direction can only be "none" or "receive"'
    )
  }

  return null
}
