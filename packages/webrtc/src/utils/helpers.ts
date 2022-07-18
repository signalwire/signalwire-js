import { getLogger } from '@signalwire/core'
import { getUserMedia as _getUserMedia } from './getUserMedia'
import { assureDeviceId } from './deviceHelpers'
import { ConnectionOptions } from './interfaces'

// FIXME: Remove and use getUserMedia directly
export const getUserMedia = (constraints: MediaStreamConstraints) => {
  getLogger().info('RTCService.getUserMedia', constraints)
  const { audio, video } = constraints
  if (!audio && !video) {
    return
  }

  return _getUserMedia(constraints)
}

export const getMediaConstraints = async (
  options: ConnectionOptions
): Promise<MediaStreamConstraints> => {
  let { audio = true, micId } = options
  const { micLabel = '' } = options
  if (micId) {
    const newMicId = await assureDeviceId(micId, micLabel, 'microphone').catch(
      (_error) => null
    )
    if (newMicId) {
      if (typeof audio === 'boolean') {
        audio = {}
      }
      audio.deviceId = { exact: newMicId }
    }
  }

  let { video = false, camId } = options
  const { camLabel = '' } = options
  if (camId) {
    const newCamId = await assureDeviceId(camId, camLabel, 'camera').catch(
      (_error) => null
    )
    if (newCamId) {
      if (typeof video === 'boolean') {
        video = {}
      }
      video.deviceId = { exact: newCamId }
    }
  }

  return { audio, video }
}
