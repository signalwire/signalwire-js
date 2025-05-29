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
  const { swEventChannel } = channels
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
      return action.payload.member_id === instance.memberId
    }
    return false
  })

  getLogger().debug('promoteDemoteWorker:', action.type, action.payload)

  yield sagaEffects.put(
    sessionActions.updateAuthorization(action.payload.authorization)
  )
  const authorization: VideoAuthorization = yield sagaEffects.select(
    selectors.getAuthorization
  )
  if (!authorization) {
    throw new Error(`Invalid authorization for '${action.type}'`)
  }

  // TODO: use the new getJoinMediaParams in here
  const { audio_allowed, video_allowed } = authorization
  switch (action.type) {
    case 'video.member.promoted':
      /**
       * Promote means enable the media allowed and keep the
       * same recv settings. (do not force recv media)
       */
      instance.updateMediaOptions({
        audio: audio_allowed === 'both',
        video: video_allowed === 'both',
        negotiateAudio: audio_allowed !== 'none',
        negotiateVideo: video_allowed !== 'none',
      })
      break
    case 'video.member.demoted':
      /**
       * Demote means force recvonly and receive only the media allowed.
       */
      instance.updateMediaOptions({
        audio: false,
        video: false,
        negotiateAudio: audio_allowed !== 'none',
        negotiateVideo: video_allowed !== 'none',
      })
      break
  }

  instance._triggerNewRTCPeer()

    getLogger().debug('promoteDemoteWorker ended', rtcPeerId)
  } finally {
    getLogger().debug(`promoteDemoteWorker for ${rtcPeerId} [cancelled]`)
  }
}
