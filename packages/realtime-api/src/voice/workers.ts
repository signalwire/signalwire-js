import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  toSyntheticEvent,
} from '@signalwire/core'

export const SYNTHETIC_MEMBER_LIST_UPDATED_EVENT = toSyntheticEvent(
  'calling.call.answered'
)

export const voiceCallStateWorker: SDKWorker<any> = function* (
  options
): SagaIterator {
  const { channels } = options
  const { swEventChannel } = channels
  const action = yield sagaEffects.take(swEventChannel, (action: any) => {
    const istargetEvent = action.type === 'calling.call.dial'

    return istargetEvent
    // TODO: filter by instance.
    // && findNamespaceInPayload(action) === instance._eventsNamespace
  })

  // TODO: this should be conditional
  yield sagaEffects.put(channels.pubSubChannel, {
    // @ts-expect-error
    type: SYNTHETIC_MEMBER_LIST_UPDATED_EVENT,
  })

  console.log('---> action', action)
}
