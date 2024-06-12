import { JSONRPCRequest } from '..'
import { MapToPubSubShape } from '../redux/interfaces'

export const toInternalAction = <
  T extends { event_type: string; params?: unknown; node_id?: string}
>(
  event: T
) => {
  const { event_type, params, node_id } = event
  /**
   * queuing.relay.tasks has a slightly different shape:
   * no nested "params" so we return the whole event.
   */
  if (event_type === 'queuing.relay.tasks') {
    return {
      type: event_type,
      payload: event,
    } as MapToPubSubShape<T>
  }

  
  const vertoRPC = params as JSONRPCRequest
    
  if (vertoRPC.params) {
    vertoRPC.params.nodeId = node_id
  }
  return {
    type: event_type,
    payload: vertoRPC,
  } as MapToPubSubShape<T>
  
}
