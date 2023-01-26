import { EventEmitter, getLogger } from '@signalwire/core'
import type RTCPeer from '../RTCPeer'

export const watchRTCPeerMediaPackets = <
  T extends EventEmitter.ValidEventTypes
>(
  rtcPeer: RTCPeer<T>
) => {
  if (!rtcPeer.hasAudioReceiver && !rtcPeer.hasVideoReceiver) {
    getLogger().warn(
      `Missing receivers to inspect media for RTCPeer "${rtcPeer.uuid}"`
    )
    return
  }
  getLogger().debug(`Start watching media for RTCPeer "${rtcPeer.uuid}"`)
  let previousAudioValue = 0
  let previousVideoValue = 0

  let run = true
  let timer: ReturnType<typeof setTimeout>
  const clearTimer = () => {
    clearTimeout(timer)
  }

  const meter = async () => {
    let audioPacketsReceived = 0
    let videoPacketsReceived = 0
    try {
      const stats = await rtcPeer.instance.getStats(null)
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          getLogger().debug(
            `audio inbound-rtp: packetsReceived: ${report.packetsReceived} (at ${report.lastPacketReceivedTimestamp})`
          )
          audioPacketsReceived = report.packetsReceived
        }
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          getLogger().debug(
            `video inbound-rtp: packetsReceived: ${report.packetsReceived} (at ${report.lastPacketReceivedTimestamp})`
          )
          videoPacketsReceived = report.packetsReceived
        }
      })
    } catch (error) {
      getLogger().warn('getStats error', error)
    } finally {
      const noAudioChanged =
        audioPacketsReceived && audioPacketsReceived <= previousAudioValue
      const noVideoChanged =
        videoPacketsReceived && videoPacketsReceived <= previousVideoValue
      if (noAudioChanged && noVideoChanged) {
        getLogger().warn(
          `audioPacketsReceived: ${audioPacketsReceived} - previousAudioValue: ${previousAudioValue}`
        )
        getLogger().warn(
          `videoPacketsReceived: ${videoPacketsReceived} - previousVideoValue: ${previousVideoValue}`
        )
        rtcPeer.triggerResume()
      } else {
        previousAudioValue = audioPacketsReceived ?? previousAudioValue
        previousVideoValue = videoPacketsReceived ?? previousVideoValue
        clearTimer()
        if (run && rtcPeer.instance.connectionState !== 'closed') {
          timer = setTimeout(() => meter(), rtcPeer.watchMediaPacketsTimeout)
        }
      }
    }
  }

  return {
    start: () => {
      clearTimer()
      meter()
    },
    stop: () => {
      run = false
      clearTimer()
    },
  }
}
