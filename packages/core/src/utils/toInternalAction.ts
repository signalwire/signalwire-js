import { JSONRPCRequest } from '..'
import { MapToPubSubShape } from '../redux/interfaces'
import { isWebrtcEventType } from './common'



const mapUnifiedEvents = (unifiedEventType: string): string => {
  const nonMappingPrefix = ['video', 'calling', 'webrtc']
  const prefix = unifiedEventType.split('.')[0]
  if(!nonMappingPrefix.includes(prefix)) {
    return unifiedEventType.startsWith('call.') ?  `video.${unifiedEventType.replace('call.', 'room.')}` : `video.${unifiedEventType}`
  }
  return unifiedEventType
}

export const toInternalAction = <
  T extends { event_type: string; params?: unknown; node_id?: string }
>(
  event: T,
  unifiedEventing = false
) => {
  const { event_type: payload_event_type, params, node_id } = event
  const event_type = unifiedEventing ? mapUnifiedEvents(payload_event_type) : payload_event_type

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
