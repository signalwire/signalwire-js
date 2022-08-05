import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  VideoMemberPromotedEvent,
  VideoMemberDemotedEvent,
  sessionActions,
  selectors,
} from '@signalwire/core'

import { BaseConnection } from '../BaseConnection'

type PromoteDemoteWorkerOnDone = (args: BaseConnection<any>) => void
type PromoteDemoteWorkerOnFail = (args: { error: Error }) => void

export type PromoteDemoteWorkerHooks = SDKWorkerHooks<
  PromoteDemoteWorkerOnDone,
  PromoteDemoteWorkerOnFail
>

export const promoteDemoteWorker: SDKWorker<
  BaseConnection<any>,
  PromoteDemoteWorkerHooks
> = function* (options): SagaIterator {
  getLogger().debug('promoteDemoteWorker started')
  const { channels, instance, initialState } = options
  const { swEventChannel } = channels // pubSubChannel
  const { rtcPeerId } = initialState
  if (!rtcPeerId) {
    throw new Error('Missing rtcPeerId for promoteDemoteWorker')
  }

  const action: MapToPubSubShape<
    VideoMemberPromotedEvent | VideoMemberDemotedEvent
  > = yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
    if (
      action.type === 'video.member.promoted' ||
      action.type === 'video.member.demoted'
    ) {
      return action.payload.member_id === rtcPeerId
    }
    return false
  })

  getLogger().debug('promoteDemoteWorker:', action.type, action.payload)

  const isPromoted = action.type === 'video.member.promoted'
  yield sagaEffects.put(
    sessionActions.updateAuthState(action.payload.authorization)
  )
  const authState: ReturnType<typeof selectors.getAuthState> =
    yield sagaEffects.select(selectors.getAuthState)
  if (!authState) {
    throw new Error(`Invalid authState for '${action.type}'`)
  }

  if (authState?.type !== 'video') {
    return
  }

  instance.updateMediaOptions({
    audio: isPromoted && authState.audio_allowed !== 'none',
    video: isPromoted && authState.video_allowed !== 'none',
    negotiateAudio: true,
    negotiateVideo: true,
  })
  instance._triggerNewRTCPeer()

  getLogger().debug('promoteDemoteWorker ended', rtcPeerId)
}
