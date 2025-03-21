import { getLogger } from '@signalwire/core'
import { BaseConnectionOptions } from '../BaseConnection'
import sdpTransform from 'sdp-transform'

const DEFAULT_MAX_BITRATE = 64000

const endOfLine = '\r\n'

type MediaSectionType = 'audio' | 'video'

const opusPayload = 111
const dtmfPayload = 110

const _getMediaSection = (
  mutableParsedSDP: sdpTransform.SessionDescription,
  type: 'audio' | 'video'
) => mutableParsedSDP.media.find((medisSection) => medisSection.type == type)

const _stringifyParamMap = (paramMap: sdpTransform.ParamMap) =>
  Object.entries(paramMap)
    .map(([key, value]) => `${key}=${value}`)
    .join(';')

/**
 * Check if SDP has a media section (audio or video)
 */
export const sdpHasMediaSection = (sdp: string, type: MediaSectionType) => {
  const parsedSDP = sdpTransform.parse(sdp)
  return !!_getMediaSection(parsedSDP, type)
}

/**
 * Check if SDP includes video
 */
export const sdpHasVideo = (sdp: string) => {
  return sdpHasMediaSection(sdp, 'video')
}

/**
 * Check if SDP includes audio
 */
export const sdpHasAudio = (sdp: string) => {
  return sdpHasMediaSection(sdp, 'audio')
}

export const sdpMediaOrderHack = (
  answer: string,
  localOffer: string
): string => {
  const parsedOffer = sdpTransform.parse(localOffer)
  const parsedAnswer = sdpTransform.parse(answer)

  if (parsedOffer.media[0].type === parsedAnswer.media[0].type) {
    return answer
  }

  parsedAnswer.media.reverse()

  return sdpTransform.write(parsedAnswer)
}

/**
 * Modify the SDP to increase video bitrate
 * @return the SDP modified
 */
export const sdpBitrateHack = (
  sdp: string,
  max: number,
  min: number,
  start: number
) => {
  const lines = sdp.split(endOfLine)
  lines.forEach((line, i) => {
    if (/^a=fmtp:\d*/.test(line)) {
      lines[
        i
      ] += `;x-google-max-bitrate=${max};x-google-min-bitrate=${min};x-google-start-bitrate=${start}`
    } else if (/^a=mid:(1|video)/.test(line)) {
      lines[i] += `\r\nb=AS:${max}`
    }
  })
  return lines.join(endOfLine)
}

/**
 * Check for srflx, prflx relay, or host with public IP candidates
 *
 * @param sdp string
 * @returns boolean
 */
export const sdpHasValidCandidates = (sdp: string) => {
  try {
    const validCandidatesTypes = ['srflx', 'prflx', 'relay']
    const typeHostInvalidIP = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^fc00:/,
      /^fd00:/,
      /^fe80:/,
      /\.local$/,
    ]
    const parsedSDP = sdpTransform.parse(sdp)
    return (
      parsedSDP.media
        // map each section to boolean, depending on having at least one valid candide
        .map((mediaSection) =>
          mediaSection.candidates?.some(
            (candidate) =>
              validCandidatesTypes.includes(candidate.type) ||
              (candidate.type === 'host' &&
                !typeHostInvalidIP.some((pattern) =>
                  pattern.test(candidate.ip)
                ))
          )
        )
        // reduce to true if all sections have valid candidates
        .reduce((acc, value) => acc && value, true)
    )
  } catch (error) {
    getLogger().error('Error checking SDP', error)
    return false
  }
}

export const filterAudioCodes = (
  mutableParsedSDP: sdpTransform.SessionDescription,
  codecPayloads: number[]
) => {
  mutableParsedSDP.media.forEach((mediaSection) => {
    if (mediaSection.type == 'audio') {
      mediaSection.payloads = codecPayloads.join(' ')
      mediaSection.rtp = mediaSection.rtp.filter((rtp) =>
        codecPayloads.includes(rtp.payload)
      )
      mediaSection.fmtp = mediaSection.fmtp.filter((rtp) =>
        codecPayloads.includes(rtp.payload)
      )
    }
  })
}

const _getOrCreatePayloadFmtp = (
  mediaSection: sdpTransform.MediaDescription,
  codecPayload: number
) => {
  let codecFmtp = mediaSection.fmtp.find((fmtp) => fmtp.payload == codecPayload)

  if (!codecFmtp) {
    codecFmtp = {
      payload: codecPayload,
      config: '',
    }
    mediaSection.fmtp.push(codecFmtp)
  }

  return codecFmtp
}

export const upsertCodecParams = (
  mutableParsedSDP: sdpTransform.SessionDescription,
  media: MediaSectionType,
  codecPayload: number,
  params: sdpTransform.ParamMap
) => {
  const mediaSection = _getMediaSection(mutableParsedSDP, media)
  if (!mediaSection || !mediaSection.payloads?.includes(`${codecPayload}`)) {
    // nothing todo, either the media doesn't exist or the codec is not included in the payloads
    return
  }

  const fmtp = _getOrCreatePayloadFmtp(mediaSection, codecPayload)

  // parse existing configs
  let currentParams = fmtp.config.trim().length
    ? sdpTransform.parseParams(fmtp.config)
    : {}
  // merge config
  let updatedParams = { ...currentParams, ...params }

  fmtp.config = _stringifyParamMap(updatedParams)
}

/**
 * @returns True if the opus parameters are specified
 */
const shouldOfferOpusOnly = (options: BaseConnectionOptions) =>
  !!options.opusMaxAverageBitrate || !!options.opusMaxPlaybackRate

export const updateSDPForOpus = (
  sdp: string,
  options: BaseConnectionOptions
) => {
  const parsedSDP = sdpTransform.parse(sdp)
  const opusFmtpConfig: sdpTransform.ParamMap = {}

  if (shouldOfferOpusOnly(options)) {
    filterAudioCodes(parsedSDP, [opusPayload, dtmfPayload])
    if (options.opusMaxPlaybackRate) {
      opusFmtpConfig['maxplaybackrate'] = `${options.opusMaxPlaybackRate}`
      opusFmtpConfig['maxaveragebitrate'] = `${getMaxBitrate(options)}`
    }

    if (options.opusMaxAverageBitrate) {
      opusFmtpConfig['maxaveragebitrate'] = `${options.opusMaxAverageBitrate}`
    }
  }

  if (options.useStereo) {
    opusFmtpConfig.stereo = '1'
    opusFmtpConfig['sprop-stereo'] = '1'
  }

  if(Object.keys(opusFmtpConfig).length) {
    upsertCodecParams(parsedSDP, 'audio', opusPayload, opusFmtpConfig)
  }

  return sdpTransform.write(parsedSDP)
}

/**
 * Remove "a=candidate" lines with local candidates
 * https://bloggeek.me/psa-mdns-and-local-ice-candidates-are-coming/
 */
export const sdpRemoveLocalCandidates = (sdp: string) => {
  const parsedSDP = sdpTransform.parse(sdp)

  parsedSDP.media.forEach((mediaSection) => {
    mediaSection.candidates = mediaSection.candidates?.filter(
      (candidate) => !/\.local$/.test(candidate.ip)
    )
  })

  const result = sdpTransform.write(parsedSDP)

  return result
}

/**
 * Get the SDP direction for the specified media type.
 * Returns 'sendrecv' if no direction attribute is found, as per SDP standards.
 */
export const getSdpDirection = (
  sdp: string,
  media: 'audio' | 'video'
): RTCRtpTransceiverDirection => {
  const parsedSDP = sdpTransform.parse(sdp)

  const mediaSection = parsedSDP.media.find(
    (mediaSection) => mediaSection.type == media
  )
  return !mediaSection
    ? // If no media section is found, return `stopped`
      'stopped'
    : // If no direction attribute is found, return 'sendrecv' as per SDP standard
      mediaSection.direction ?? 'sendrecv'
}

/**
 * Returns the opposite SDP direction based on the provided direction.
 */
export const getOppositeSdpDirection = (
  direction: RTCRtpTransceiverDirection
): RTCRtpTransceiverDirection => {
  switch (direction) {
    case 'sendrecv':
      return 'sendrecv'
    case 'sendonly':
      return 'recvonly'
    case 'recvonly':
      return 'sendonly'
    case 'inactive':
      return 'inactive'
    default:
      return 'inactive'
  }
}

/**
 * Returns boolean indicating remote and local SDPs has the expected opposite direction
 */
export const hasMatchingSdpDirection = ({
  localSdp,
  remoteSdp,
  media,
}: {
  localSdp: string
  remoteSdp: string
  media: 'audio' | 'video'
}) => {
  const localDirection = getSdpDirection(localSdp, media)
  const expectedRemoteDirection = getOppositeSdpDirection(localDirection)
  const remoteDirection = getSdpDirection(remoteSdp, media)
  return remoteDirection === expectedRemoteDirection
}

export const getMaxBitrate = (options: BaseConnectionOptions) => {
  if (!options.opusMaxPlaybackRate && !options.useStereo) {
    return
  }

  let maxBitrate = DEFAULT_MAX_BITRATE

  if (options.opusMaxPlaybackRate && options.opusMaxPlaybackRate <= 8000) {
    maxBitrate = !options.useStereo ? 2000 : 4000
  } else if (
    options.opusMaxPlaybackRate &&
    options.opusMaxPlaybackRate <= 16000
  ) {
    maxBitrate = !options.useStereo ? 32000 : 64000
  } else if (
    options.opusMaxPlaybackRate &&
    options.opusMaxPlaybackRate <= 24000
  ) {
    maxBitrate = !options.useStereo ? 40000 : 80000
  } else if (options.useStereo) {
    maxBitrate = 128000
  }

  return maxBitrate
}
