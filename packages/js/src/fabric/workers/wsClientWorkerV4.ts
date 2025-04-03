import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SwAuthorizationStateEvent,
  selectors,
  componentSelectors,
  ReduxComponent,
} from '@signalwire/core'
import { WSClientV4 } from '../v4/WSClientV4'
import { encodeAuthState } from '../utils/authStateCodec'

export const wsClientWorkerV4: SDKWorker<WSClientV4> = function* (
  options
): SagaIterator {
  getLogger().debug('wsClientWorkerV4 started')
  const { channels, instance: client } = options
  const { swEventChannel } = channels

  function* authStateWorker(
    action: MapToPubSubShape<SwAuthorizationStateEvent>
  ) {
    if (client.wsClientOptions.onAuthStateChange) {
      const authState = action.payload.authorization_state
      const protocol = selectors.getProtocol(client.store.getState())

      /**
       * The reattach is only possible to first call leg; originCallId
       * We store this origin call ID in the Redux Store via {@link roomSubscribedWorker}
       */
      const components = componentSelectors.getComponentsById(
        client.store.getState()
      )
      const callId = Object.values(components).find(
        (comp): comp is ReduxComponent & { originCallId: string } =>
          'originCallId' in comp
      )?.originCallId

      const encode = encodeAuthState({ authState, protocol, callId })

      client.wsClientOptions.onAuthStateChange(encode)
    }
  }

  const isAuthState = (action: SDKActions) => {
    return action.type === 'signalwire.authorization.state'
  }

  try {
    while (true) {
      // Take all actions from the channel
      const action: SDKActions = yield sagaEffects.take(
        swEventChannel,
        () => true
      )

      // If the event is signalwire.authorization.state, handle that with authStateWorker
      if (isAuthState(action)) {
        getLogger().debug('An authorization state is received', action)
        yield sagaEffects.fork(authStateWorker, action)
      }
    }
  } finally {
    getLogger().trace('wsClientWorkerV4 ended')
  }
}
