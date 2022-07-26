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
  const { swEventChannel } = channels //pubSubChannel

  while (true) {
    const action: MapToPubSubShape<WebRTCMessageParams> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return action.type === 'webrtc.message'
      })

    const { id: jsonrpcId, method, params = {} } = action.payload
    const { callID, nodeId } = params
    const peer = instance.getRTCPeerById(callID)
    if (!peer) {
      getLogger().warn(
        `RTCPeer '${callID}' not found for method: '${method}'`,
        params
      )
      continue
    }

    // Set nodeId for each RTCPeer
    peer.nodeId = nodeId

    // getLogger().warn('vertoEventWorker', method, params)
    switch (method) {
      case 'verto.media': {
        /**
         * TODO: set nodeId on instance
         * Always invoke peer.onRemoteSdp(params.sdp) on the proper RTCPeer
         * If the `params.callID` is the current ACTIVE peer, set the BaseConnection state to "early"
         * If the `params.callID` is NOT the current peer, but it's there from promote/demote process just setup the media
         * and wait for the join event to swap RTCPeers
         */
        // TODO: Improve
        if (peer.uuid === instance.peer?.uuid) {
          instance.setState('early')
        }
        peer.onRemoteSdp(params.sdp)

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
      case 'verto.answer': {
        /**
         * TODO: set nodeId on instance
         * IF WE HAVE `params.sdp`: always invoke peer.onRemoteSdp(params.sdp) on the proper RTCPeer
         * If the `params.callID` is the current ACTIVE peer, set the BaseConnection state to "active"
         * If the `params.callID` is NOT the current peer, but it's there from promote/demote process just setup the media
         * and wait for the join event to swap RTCPeers
         */
        // TODO: Improve
        if (peer.uuid === instance.peer?.uuid) {
          instance.setState('active')
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
         * TODO: make sure to have nodeId on instance
         * If the `params.callID` is the current ACTIVE peer, stop everything and destroy the BaseConnection
         * If the `params.callID` is NOT the current peer, but is there from promote/demote process stop/destroy just the peer
         */
        yield sagaEffects.call(instance.onVertoBye, {
          rtcPeerId: callID,
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
        // TODO: test
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
        // TODO: test
        const { audio, video } = params.mediaParams
        if (peer && video) {
          peer.applyMediaConstraints('video', video)
        }
        if (peer && audio) {
          peer.applyMediaConstraints('audio', audio)
        }
        break
      }
      default:
        return getLogger().warn(`Unknown Verto method: ${method}`, params)
    }
  }

  getLogger().trace('vertoEventWorker ended')
}
