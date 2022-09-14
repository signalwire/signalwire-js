import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  VideoMemberJoinedEvent,
  componentSelectors,
  componentActions,
} from '@signalwire/core'

import type { BaseConnection } from '@signalwire/webrtc'

type ChildMemberJoinedWorkerOnDone = (args: BaseConnection<any>) => void
type ChildMemberJoinedWorkerOnFail = (args: { error: Error }) => void

export type ChildMemberJoinedWorkerHooks = SDKWorkerHooks<
  ChildMemberJoinedWorkerOnDone,
  ChildMemberJoinedWorkerOnFail
>

export const childMemberJoinedWorker: SDKWorker<
  BaseConnection<any>,
  ChildMemberJoinedWorkerHooks
> = function* (options): SagaIterator {
  getLogger().trace('childMemberJoinedWorker started')
  const { channels, instance, initialState } = options
  const { swEventChannel } = channels
  const { parentId } = initialState
  if (!parentId) {
    throw new Error('Missing parentId for childMemberJoinedWorker')
  }

  const action: MapToPubSubShape<VideoMemberJoinedEvent> =
    yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
      if (action.type === 'video.member.joined') {
        return action.payload.member.parent_id === parentId
      }
      return false
    })

  /**
   * On video.member.joined with a parent_id, check if we are the
   * owner of the object comparing parent_id in the state.
   * If so update the state with the room values to update the
   * object.
   */
  const { member } = action.payload
  if (member?.parent_id) {
    /**
     * For screenShare/additionalDevice we're using
     * the `memberId` to namespace the object.
     **/
    // @ts-expect-error
    instance._attachListeners(member.id)
    // @ts-expect-error
    instance.applyEmitterTransforms()

    const parent = yield sagaEffects.select(
      componentSelectors.getComponent,
      member.parent_id
    )
    if (parent) {
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
  getLogger().trace('childMemberJoinedWorker ended')
}
