import {
  getLogger,
  sagaEffects,
  actions,
  VertoResult,
  VertoPong,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  WebRTCMessageParams,
} from '@signalwire/core'

import { BaseConnection } from '../BaseConnection'

type VertoEventWorkerOnDone = (args: BaseConnection<any>) => void
type VertoEventWorkerOnFail = (args: { error: Error }) => void

export type VertoEventWorkerHooks = SDKWorkerHooks<
  VertoEventWorkerOnDone,
  VertoEventWorkerOnFail
>

export const vertoEventWorker: SDKWorker<
  BaseConnection<any>,
  VertoEventWorkerHooks
> = function* (options): SagaIterator {
  getLogger().debug('vertoEventWorker started')
  const { channels, instance } = options
  const { swEventChannel } = channels

  while (true) {
    const action: MapToPubSubShape<WebRTCMessageParams> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        if (action.type === 'webrtc.message') {
          return action.payload.params?.callID === instance.callId
        }
        return false
      })

    const { id: jsonrpcId, method, params = {} } = action.payload
    const { callID, nodeId } = params
    const activeRTCPeer = instance.peer

    // getLogger().warn('vertoEventWorker', method, params)
    switch (method) {
      case 'verto.media':
      case 'verto.answer': {
        /**
         * verto.media and verto.answer share the same logic
         *
         * Always invoke peer.onRemoteSdp(params.sdp) on the proper RTCPeer.
         * Looking for the RTCPeer with have-local-offer and set the remote SDP on it.
         */
        const peer = instance.getRTCPeerWithLocalOffer()
        if (!peer) {
          getLogger().warn(
            `RTCPeer not found for method: '${method}'. No Peer with 'have-local-offer' state.`,
            params
          )
          break
        }
        if (peer.uuid === activeRTCPeer?.uuid) {
          const state = method === 'verto.media' ? 'early' : 'active'
          instance.setState(state)
        }
        if (params?.sdp) {
          peer.onRemoteSdp(params.sdp)
        }

        yield sagaEffects.put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoResult(jsonrpcId, method),
              node_id: nodeId,
            },
          })
        )
        break
      }
      case 'verto.bye': {
        /**
         * If the `params.callID` is the current ACTIVE peer, stop everything and destroy the BaseConnection
         * If the `params.callID` is NOT the current peer, but is there from promote/demote process stop/destroy just the peer
         */
        yield sagaEffects.call(instance.onVertoBye, {
          rtcPeerId: callID, // FIXME:
          byeCause: params?.cause,
          byeCauseCode: params?.causeCode,
          redirectDestination: params?.redirectDestination,
        })

        yield sagaEffects.put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoResult(jsonrpcId, method),
              node_id: nodeId,
            },
          })
        )
        break
      }
      case 'verto.ping': {
        // Remove nodeId from params
        const { nodeId, ...pongParams } = params
        yield sagaEffects.put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoPong(pongParams),
              node_id: nodeId,
            },
          })
        )
        break
      }
      case 'verto.mediaParams': {
        if (!callID || !params.mediaParams) {
          getLogger().warn(`Invalid mediaParams event`, params)
          break
        }
        const { audio, video } = params.mediaParams
        if (activeRTCPeer && video) {
          activeRTCPeer.applyMediaConstraints('video', video)
        }
        if (activeRTCPeer && audio) {
          activeRTCPeer.applyMediaConstraints('audio', audio)
        }
        break
      }
      default:
        return getLogger().warn(`Unknown Verto method: ${method}`, params)
    }
  }

  getLogger().trace('vertoEventWorker ended')
}
