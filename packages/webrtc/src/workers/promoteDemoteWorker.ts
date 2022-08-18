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
  VideoAuthorization,
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

  yield sagaEffects.put(
    sessionActions.updateAuthState(action.payload.authorization)
  )
  const authState: VideoAuthorization = yield sagaEffects.select(
    selectors.getAuthState
  )
  if (!authState) {
    throw new Error(`Invalid authState for '${action.type}'`)
  }

  switch (action.type) {
    case 'video.member.promoted':
      /**
       * Promote means enable the media allowed and keep the
       * same recv settings. (do not force recv media)
       */
      instance.updateMediaOptions({
        audio: authState.audio_allowed === 'both',
        video: authState.video_allowed === 'both',
        // negotiateAudio: true,
        // negotiateVideo: true,
      })
      break
    case 'video.member.demoted':
      /**
       * Demote means force recvonly and receive only the media allowed.
       */
      instance.updateMediaOptions({
        audio: false,
        video: false,
        negotiateAudio: authState.audio_allowed !== 'none',
        negotiateVideo: authState.video_allowed !== 'none',
      })
      break
  }

  instance._triggerNewRTCPeer()

  getLogger().debug('promoteDemoteWorker ended', rtcPeerId)
}
