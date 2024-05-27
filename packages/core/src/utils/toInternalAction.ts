import { JSONRPCRequest } from '..'
import { MapToPubSubShape } from '../redux/interfaces'
import { isWebrtcEventType } from './common'

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

  /**
   * `webrtc.*` events need to carry the node_id with them
   */
  if (isWebrtcEventType(event_type) && (params as JSONRPCRequest)?.jsonrpc) {
    const vertoRPC = params as JSONRPCRequest & {room_session_id?: string, call_id?:string, origin_call_id?:string}
    console.log("###### vertoRPC", {vertoRPC})
    if (vertoRPC.params) {
      vertoRPC.params.nodeId = node_id
    }
    return {
      type: event_type,
      payload: vertoRPC,
      nodeId: node_id,
      eventRoutingId: vertoRPC.room_session_id || vertoRPC.call_id,
      originCallId: vertoRPC.origin_call_id
    } as MapToPubSubShape<T>
  }

  return {
    type: event_type,
    payload: params,
    nodeId: node_id,
    //@ts-ignore
    eventRoutingId: params.room_session_id || params.call_id,
    //@ts-ignore
    originCallId: params.origin_call_id
  } as MapToPubSubShape<T> 
}
