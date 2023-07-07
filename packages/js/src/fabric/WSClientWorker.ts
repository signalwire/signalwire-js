import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  // VideoMemberJoinedEvent,
  // componentSelectors,
  // componentActions,
} from '@signalwire/core'
import { createClient } from '../createClient'
import type { BaseConnection } from '@signalwire/webrtc'

type WSClientWorkerOnDone = () => void
type WSClientWorkerOnFail = (args: { error: Error }) => void

export type WSClientWorkerHooks = SDKWorkerHooks<
  WSClientWorkerOnDone,
  WSClientWorkerOnFail
>

export const WSClientWorker: SDKWorker<
  ReturnType<typeof createClient<BaseConnection<any>>>,
  WSClientWorkerHooks
> = function* (options): SagaIterator {
  getLogger().debug('WSClientWorker started')
  const { channels, instance } = options
  const { swEventChannel } = channels
  getLogger().debug('WSClientWorker instance', instance)
  while (true) {
    const action: MapToPubSubShape<any> = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        getLogger().debug('WSClientWorker action', action)
        if (action.type === 'webrtc.message') {
          return action.payload.method === 'verto.invite'
        }
        return false
      }
    )
    getLogger().debug('Build new call to answer', action)

    // TODO: invoke WSClient function to build and answer the invite
    // instance.buildInboundCall(action)
  }

  getLogger().trace('WSClientWorker ended')
}
