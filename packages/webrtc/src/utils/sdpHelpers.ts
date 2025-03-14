import { getLogger } from '@signalwire/core'
import SDPUtils from 'sdp'

const endOfLine = '\r\n'

const _isAudioLine = (line: string) => /^m=audio/.test(line)
const _isVideoLine = (line: string) => /^m=video/.test(line)
const _getCodecPayloadType = (line: string) => {
  const pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+')
  const result = line.match(pattern)
  return result && result.length == 2 ? result[1] : null
}
const _normalizeSDPLines = (sdp: string) => {
  // Make the line break consistent
  return sdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Check if SDP has a media section (audio or video)
 */
export const sdpHasMediaSection = (sdp: string, media: 'audio' | 'video') => {
  const lines = _normalizeSDPLines(sdp).split('\n')
  for (let line of lines) {
    if (line.startsWith(`m=${media}`)) {
      return true
    }
  }
  return false
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

/**
 * Add stereo support hacking the SDP
 * @return the SDP modified
 */
export const sdpStereoHack = (sdp: string) => {
  const sdpLines = sdp.split(endOfLine)

  const opusIndex = sdpLines.findIndex(
    (s) => /^a=rtpmap/.test(s) && /opus\/48000/.test(s)
  )
  if (opusIndex < 0) {
    return sdp
  }

  const opusPayload = _getCodecPayloadType(sdpLines[opusIndex])

  const pattern = new RegExp(`a=fmtp:${opusPayload}`)
  const fmtpLineIndex = sdpLines.findIndex((s) => pattern.test(s))

  if (fmtpLineIndex >= 0) {
    if (!/stereo=1;/.test(sdpLines[fmtpLineIndex])) {
      // Append stereo=1 to fmtp line if not already present
      sdpLines[fmtpLineIndex] += '; stereo=1; sprop-stereo=1'
    }
  } else {
    // create an fmtp line
    sdpLines[
      opusIndex
    ] += `${endOfLine}a=fmtp:${opusPayload} stereo=1; sprop-stereo=1`
  }

  return sdpLines.join(endOfLine)
}

export const sdpMediaOrderHack = (
  answer: string,
  localOffer: string
): string => {
  const offerLines = localOffer.split(endOfLine)
  const offerAudioIndex = offerLines.findIndex(_isAudioLine)
  const offerVideoIndex = offerLines.findIndex(_isVideoLine)
  if (
    offerVideoIndex == -1 ||
    offerAudioIndex == -1 ||
    offerAudioIndex < offerVideoIndex
  ) {
    return answer
  }

  const answerLines = answer.split(endOfLine)
  const answerAudioIndex = answerLines.findIndex(_isAudioLine)
  const answerVideoIndex = answerLines.findIndex(_isVideoLine)
  const audioLines = answerLines.slice(answerAudioIndex, answerVideoIndex)
  const videoLines = answerLines.slice(answerVideoIndex, answerLines.length - 1)
  const beginLines = answerLines.slice(0, answerAudioIndex)
  return [...beginLines, ...videoLines, ...audioLines, ''].join(endOfLine)
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
 * Check for srflx, prflx or relay candidates
 * TODO: improve the logic check private/public IP for typ host
 *
 * @param sdp string
 * @returns boolean
 */
export const sdpHasValidCandidates = (sdp: string) => {
  try {
    const regex = /typ (?:srflx|prflx|relay)/
    const sections = SDPUtils.getMediaSections(sdp)
    for (const section of sections) {
      const lines = SDPUtils.splitLines(section)
      const valid = lines.some((line) => {
        return line.indexOf('a=candidate') === 0 && regex.test(line)
      })
      if (!valid) {
        return false
      }
    }

    return true
  } catch (error) {
    getLogger().error('Error checking SDP', error)
    return false
  }
}

export const opusConfigsHack = (sdp: SDPUtils.SDPBlob, options: any) => {
  const sdpLines = SDPUtils.splitLines(sdp)
  const opusIndex = sdpLines.findIndex(
    (s) => /^a=rtpmap:(\d+)\s+opus\/(\d+)(?:\/(\d+))?$/i.test(s)
  )

  if (opusIndex < 0) {
    // nothing todo
    return sdp
  }

  const opusRtpMap = SDPUtils.parseRtpMap(sdpLines[opusIndex])

  const pattern = new RegExp(`^a=fmtp:${opusRtpMap.payloadType}`)
  const opusFmtpLineIndex = sdpLines.findIndex(s => pattern.test(s))

  const opusParameters =
    opusFmtpLineIndex >= 0
      ? SDPUtils.parseFmtp(sdpLines[opusFmtpLineIndex])
      : {}

  if (options.maxOpusPlaybackRate) {
    opusParameters.maxplaybackrate = `${options.maxOpusPlaybackRate}`
    opusParameters.useinbandfec = '1'
    opusParameters.minptime = '10'
  }

  if(options.maxOpusAverageBitrate) {
    opusParameters.maxaveragebitrate = `${options.maxOpusAverageBitrate}`
  }

  if (options.useStereo) {
    opusParameters.stereo = '1'
    opusParameters['sprop-stereo'] = '1'
  }

  const opusFmtpLine = SDPUtils.writeFmtp({
    channels: opusRtpMap.channels,
    name: opusRtpMap.name,
    payloadType: opusRtpMap.payloadType,
    parameters: opusParameters,
    clockRate: opusRtpMap.clockRate,
  })

  if (opusFmtpLineIndex >= 0) {
    sdpLines[opusFmtpLineIndex] = opusFmtpLine.trim()
  } else {
    sdpLines[opusIndex] += `${endOfLine}${opusFmtpLine.trim()}`
    console.log(sdpLines[opusIndex])
  }

  return `${sdpLines.join(endOfLine)}${endOfLine}`
}

/**
 * Remove "a=candidate" lines with local candidates
 * https://bloggeek.me/psa-mdns-and-local-ice-candidates-are-coming/
 */
export const sdpRemoveLocalCandidates = (sdp: string) => {
  const pattern = /^a=candidate.*.local\ .*/
  
  return sdp
    .split(endOfLine)
    .filter((line) => !pattern.test(line))
    .join(endOfLine)
}

/**
 * Get the SDP direction for the specified media type.
 * Returns 'sendrecv' if no direction attribute is found, as per SDP standards.
 */
export const getSdpDirection = (
  sdp: string,
  media: 'audio' | 'video'
): RTCRtpTransceiverDirection => {
  const lines = _normalizeSDPLines(sdp).split('\n')
  let inMediaSection = false

  const directions = ['inactive', 'recvonly', 'sendonly', 'sendrecv', 'stopped']

  for (let line of lines) {
    if (line.startsWith('m=')) {
      // Check if this is the media section we're interested in
      inMediaSection = line.startsWith(`m=${media}`)
    } else if (inMediaSection && line.startsWith('a=')) {
      // Check for direction attribute within this media section
      const attr = line.substring(2)
      if (directions.includes(attr)) {
        // Return the found direction attribute
        return attr as RTCRtpTransceiverDirection
      }
    }
  }

  // If no media section is found, return `stopped`
  if (!inMediaSection) {
    return 'stopped'
  }

  // If no direction attribute is found, return 'sendrecv' as per SDP standard
  return 'sendrecv'
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
