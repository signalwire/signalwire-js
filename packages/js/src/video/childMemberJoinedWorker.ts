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
  type ReduxComponent,
} from '@signalwire/core'

import type { BaseConnection } from '@signalwire/webrtc'

type ChildMemberJoinedWorkerOnDone = () => void
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
  const { channels, instance, initialState, onDone, onFail } = options
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
    const byId: Record<string, ReduxComponent> = yield sagaEffects.select(
      componentSelectors.getComponentsById
    )
    const parent = Object.values(byId).find((row) => {
      return 'memberId' in row && row.memberId === member.parent_id
    })
    if (parent) {
      /**
       * For screenShare/additionalDevice we're using the `memberId` to
       * namespace the object.
       **/

      yield sagaEffects.put(
        componentActions.upsert({
          id: instance.callId,
          roomId: action.payload.room_id,
          roomSessionId: action.payload.room_session_id,
          memberId: member.id,
        })
      )

      onDone?.()
    } else {
      onFail?.({ error: new Error('Unknown parent_id') })
    }
  }
  getLogger().trace('childMemberJoinedWorker ended')
}
