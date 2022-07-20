import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  VideoRoomSubscribedEvent,
} from '@signalwire/core'

import { BaseConnection } from '../BaseConnection'

type RoomSubscribedWorkerOnDone = (args: BaseConnection<any>) => void
type RoomSubscribedWorkerOnFail = (args: { error: Error }) => void

export type RoomSubscribedDigitsWorkerHooks = SDKWorkerHooks<
  RoomSubscribedWorkerOnDone,
  RoomSubscribedWorkerOnFail
>

export const roomSubscribedWorker: SDKWorker<
  BaseConnection<any>,
  RoomSubscribedDigitsWorkerHooks
> = function* (options): SagaIterator {
  getLogger().trace('roomSubscribedWorker started')
  const { channels, instance } = options
  const { swEventChannel } = channels

  const action: MapToPubSubShape<VideoRoomSubscribedEvent> =
    yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
      if (action.type === 'video.room.subscribed') {
        return action.payload.call_id === instance.__uuid
      }
      return false
    })

  /**
   * For screenShare/additionalDevice we're using
   * the `memberId` to namespace the object.
   **/
  if (instance.options.additionalDevice || instance.options.screenShare) {
    // @ts-expect-error
    instance._attachListeners(action.payload.member_id)
  } else {
    // @ts-expect-error
    instance._attachListeners(action.payload.room_session.id)
  }
  // FIXME: Move to a better place when rework _attachListeners too.
  // @ts-expect-error
  instance.applyEmitterTransforms()

  getLogger().trace('roomSubscribedWorker ended')
}
