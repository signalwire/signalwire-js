import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  VideoRoomSubscribedEvent,
  componentActions,
} from '@signalwire/core'

import { BaseConnection } from '../BaseConnection'

type RoomSubscribedWorkerOnDone = (args: BaseConnection<any>) => void
type RoomSubscribedWorkerOnFail = (args: { error: Error }) => void

export type RoomSubscribedWorkerHooks = SDKWorkerHooks<
  RoomSubscribedWorkerOnDone,
  RoomSubscribedWorkerOnFail
>

export const roomSubscribedWorker: SDKWorker<
  BaseConnection<any>,
  RoomSubscribedWorkerHooks
> = function* (options): SagaIterator {
  getLogger().debug('roomSubscribedWorker started')
  const { channels, instance, initialState } = options
  const { swEventChannel, pubSubChannel } = channels
  const { rtcPeerId } = initialState
  if (!rtcPeerId) {
    throw new Error('Missing rtcPeerId for roomSubscribedWorker')
  }

  const action: MapToPubSubShape<VideoRoomSubscribedEvent> =
    yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
      if (action.type === 'video.room.subscribed') {
        return action.payload.call_id === rtcPeerId
      }
      return false
    })

  const memberId = action.payload.member_id
  const roomSessionId = action.payload.room_session.id

  /**
   * For screenShare/additionalDevice we're using
   * the `memberId` to namespace the object.
   **/
  if (instance.options.additionalDevice || instance.options.screenShare) {
    if (!memberId) {
      throw new Error('[roomSubscribedWorker] missing memberId')
    }

    // @ts-expect-error
    instance._attachListeners(memberId)
  } else {
    if (!roomSessionId) {
      throw new Error('[roomSubscribedWorker] missing roomSessionId')
    }

    // @ts-expect-error
    instance._attachListeners(roomSessionId)
  }

  // FIXME: Move to a better place when rework _attachListeners too.
  // @ts-expect-error
  instance.applyEmitterTransforms()

  /**
   * In here we joined a room_session so we can swap between RTCPeers
   */
  instance.setActiveRTCPeer(rtcPeerId)

  /**
   * TODO: Replace the redux action/component with properties on RTCPeer instance?
   */
  yield sagaEffects.put(
    componentActions.upsert({
      id: action.payload.call_id,
      roomId: action.payload.room_session.room_id,
      roomSessionId: action.payload.room_session.id,
      memberId: action.payload.member_id,
      previewUrl: action.payload.room_session.preview_url,
    })
  )

  // Rename "room.subscribed" with "room.joined" for the end-user
  yield sagaEffects.put(pubSubChannel, {
    type: 'video.room.joined',
    payload: action.payload,
  })

  getLogger().debug('roomSubscribedWorker ended', rtcPeerId)
}
