import { JSONRPCRequest } from '..'
import { MapToPubSubShape } from '../redux/interfaces'

export const toInternalAction = <
  T extends { event_type: unknown; params?: unknown; node_id?: string }
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

  /**
   * webrtc.message needs to carry with him the node_id
   */
  if (event_type === 'webrtc.message' && (params as JSONRPCRequest)?.jsonrpc) {
    const vertoRPC = params as JSONRPCRequest
    if (vertoRPC.params) {
      vertoRPC.params.nodeId = node_id
    }
    return {
      type: event_type,
      payload: vertoRPC,
    } as MapToPubSubShape<T>
  }

  return {
    type: event_type,
    payload: params,
  } as MapToPubSubShape<T>
}
