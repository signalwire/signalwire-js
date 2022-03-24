import { MapToPubSubShape } from '../redux/interfaces'

export const toInternalAction = <
  T extends { event_type: unknown; params: unknown }
>(
  event: T
) => {
  const { event_type, params } = event

  if (event_type === 'queuing.relay.tasks') {
    return {
      type: event_type,
      payload: event,
    } as MapToPubSubShape<T>
  }

  return {
    type: event_type,
    payload: params,
  } as MapToPubSubShape<T>
}
