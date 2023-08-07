import {
  getLogger,
  sagaEffects,
  VertoResult,
  VertoPong,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  WebRTCMessageParams,
  isWebrtcEventType,
  sagaHelpers,
  componentActions,
} from '@signalwire/core'

import { BaseConnection } from '../BaseConnection'

type VertoEventWorkerOnDone = (args: BaseConnection<any>) => void
type VertoEventWorkerOnFail = (args: { error: Error }) => void

export type VertoEventWorkerHooks = SDKWorkerHooks<
  VertoEventWorkerOnDone,
  VertoEventWorkerOnFail
>

const isWebrtcAction = (
  action: SDKActions
): action is MapToPubSubShape<WebRTCMessageParams> => {
  return isWebrtcEventType(action.type)
}

export const vertoEventWorker: SDKWorker<
  BaseConnection<any>,
  VertoEventWorkerHooks
> = function* (options): SagaIterator {
  getLogger().debug('vertoEventWorker started')
  const { channels, instance, initialState } = options
  const { swEventChannel } = channels
  const { rtcPeerId } = initialState
  if (!rtcPeerId) {
    throw new Error('Missing rtcPeerId for roomSubscribedWorker')
  }

  const worker = function* (action: MapToPubSubShape<WebRTCMessageParams>) {
    const { id: jsonrpcId, method, params = {} } = action.payload
    const { callID, nodeId } = params
    const peer = instance.getRTCPeerById(callID)
    if (!peer) {
      getLogger().warn(
        `RTCPeer '${callID}' not found for method: '${method}'`,
        params
      )
      return
    }
    const activeRTCPeer = instance.peer

    // getLogger().warn('vertoEventWorker', method, params)
    switch (method) {
      case 'verto.media':
      case 'verto.answer': {
        /**
         * verto.media and verto.answer share the same logic
         *
         * Always invoke peer.onRemoteSdp(params.sdp) on the proper RTCPeer
         * If the `params.callID` is the current ACTIVE peer, set the BaseConnection state to 'early' | 'active'
         * If the `params.callID` is NOT the current peer just setup the media (ie: promote/demote)
         */
        if (peer.uuid === activeRTCPeer?.uuid) {
          const state = method === 'verto.media' ? 'early' : 'active'
          instance.setState(state)
        }
        if (params?.sdp) {
          peer.onRemoteSdp(params.sdp)
        }

        yield sagaEffects.put(
          componentActions.upsert({
            id: action.payload.params?.callID,
            nodeId: action.payload.params?.nodeId,
          })
        )

        yield sagaEffects.call([instance, instance.execute], {
          method: instance._getRPCMethod(),
          params: {
            message: VertoResult(jsonrpcId, method),
            node_id: nodeId,
          },
        })
        break
      }
      case 'verto.bye': {
        /**
         * If the `params.callID` is the current ACTIVE peer, stop everything and destroy the BaseConnection
         * If the `params.callID` is NOT the current peer, but is there from promote/demote process stop/destroy just the peer
         */
        yield sagaEffects.call([instance, instance.onVertoBye], {
          rtcPeerId: callID,
          byeCause: params?.cause,
          byeCauseCode: params?.causeCode,
          redirectDestination: params?.redirectDestination,
        })

        yield sagaEffects.call([instance, instance.execute], {
          method: instance._getRPCMethod(),
          params: {
            message: VertoResult(jsonrpcId, method),
            node_id: nodeId,
          },
        })
        break
      }
      case 'verto.ping': {
        // Remove nodeId from params
        const { nodeId, ...pongParams } = params
        yield sagaEffects.call([instance, instance.execute], {
          method: instance._getRPCMethod(),
          params: {
            message: VertoPong(pongParams),
            node_id: nodeId,
          },
        })
        break
      }
      case 'verto.mediaParams': {
        if (!callID || !params.mediaParams) {
          getLogger().warn(`Invalid mediaParams event`, params)
          break
        }
        const { audio, video } = params.mediaParams
        if (peer && video) {
          peer.applyMediaConstraints('video', video)
        }
        if (peer && audio) {
          peer.applyMediaConstraints('audio', audio)
        }
        break
      }
      case 'verto.display': {
        /** Call is active so set the RTCPeer */
        instance.setActiveRTCPeer(rtcPeerId)

        instance.emit('verto.display', action.payload.params)
        break
      }
      default:
        return getLogger().warn(`Unknown Verto method: ${method}`, params)
    }
  }
  const catchableWorker = sagaHelpers.createCatchableSaga<
    MapToPubSubShape<WebRTCMessageParams>
  >(worker, (error) => {
    getLogger().error('Verto Error', error)
  })

  while (true) {
    const action: MapToPubSubShape<WebRTCMessageParams> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        if (isWebrtcAction(action)) {
          return action.payload.params?.callID === rtcPeerId
        }
        return false
      })
    yield sagaEffects.fork(catchableWorker, action)
  }

  getLogger().trace('vertoEventWorker ended')
}
