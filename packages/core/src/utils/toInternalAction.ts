import { JSONRPCRequest } from '..'
import { MapToPubSubShape } from '../redux/interfaces'
import { isWebrtcEventType } from './common'

export const toInternalAction = <
  T extends { event_type: string; params?: unknown; node_id?: string }
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

  // FIXME This is a hack until we can get the nodeId from the members for the unified methods
  if(event_type === 'call.joined') {
    return {
      type: event_type,
      payload: {
        //@ts-ignore
        ...params,
        node_id: node_id
      }
    }
  }

  /**
   * `webrtc.*` events need to carry the node_id with them
   */
  if (isWebrtcEventType(event_type) && (params as JSONRPCRequest)?.jsonrpc) {
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
