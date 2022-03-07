import { MapToPubSubShape } from '../redux/interfaces'

export const toInternalAction = <
  T extends { event_type: unknown; params: unknown }
>(
  event: T
) => {
  const { event_type, params } = event

  return {
    type: event_type,
    payload: params,
  } as MapToPubSubShape<T>
}
