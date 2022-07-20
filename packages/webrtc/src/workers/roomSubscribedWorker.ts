import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  VideoRoomSubscribedEvent,
  VideoMemberJoinedEvent,
  componentSelectors,
  componentActions,
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

  const action: MapToPubSubShape<
    VideoRoomSubscribedEvent | VideoMemberJoinedEvent
  > = yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
    if (action.type === 'video.room.subscribed') {
      return action.payload.call_id === instance.__uuid
    } else if (action.type === 'video.member.joined') {
      return action.payload.room_session_id === instance.roomSessionId
    }
    return false
  })

  let memberId
  let roomSessionId
  if (action.type === 'video.member.joined') {
    /**
     * On video.member.joined with a parent_id, check if we are the
     * owner of the object comparing parent_id in the state.
     * If so update the state with the room values to update the
     * object.
     */
    const { member } = action.payload
    if (member?.parent_id) {
      const parent = yield sagaEffects.select(
        componentSelectors.getComponent,
        member.parent_id
      )
      if (parent) {
        memberId = member.id
        roomSessionId = action.payload.room_session_id
        yield sagaEffects.put(
          componentActions.upsert({
            id: member.id,
            roomId: action.payload.room_id,
            roomSessionId: action.payload.room_session_id,
            memberId: member.id,
          })
        )
      }
    }
  } else {
    memberId = action.payload.member_id
    roomSessionId = action.payload.room_session.id
  }

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

  getLogger().trace('roomSubscribedWorker ended')
}
