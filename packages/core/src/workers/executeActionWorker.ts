import { call } from '@redux-saga/core/effects'
import { SagaIterator } from '@redux-saga/core'
import { getLogger } from '../utils/logger'
import { RPCExecute } from '../RPCMessages/RPCExecute'
import type { SDKWorker } from '../utils/interfaces'
import type { ExecuteActionParams } from '../redux/interfaces'
import { UnifiedRequestMapper } from '../utils/UnifiedRequestMapper'

/**
 * Send a JSONRPC over the wire using session.execute and resolve/reject the promise
 */
export const executeActionWorker: SDKWorker<ExecuteActionParams> = function* (
  options
): SagaIterator {
  const { initialState, onDone, onFail, getSession, instanceMap } = options
  
  const { requestId, method, params, self, componentId } = initialState

  const session = getSession()

  if (!session) {
    const error = new Error('Session does not exist!')
    getLogger().error(error)
    onFail?.(error)
    return
  }

  try {
    let message = RPCExecute({
      id: requestId,
      method,
      params,
    })

    if(session.unifiedEventing && message.method in UnifiedRequestMapper) {
      const component = instanceMap.get(componentId)
      console.log('@#$')
      console.log(component)
      // FIXME we need to lookup the target from the memberList
      const target = {
        ...self,
        member_id: params.member_id
      }
      //@ts-expect-error
      message = UnifiedRequestMapper[message.method](message, self, target)
    }

    
    const response = yield call(session.execute, message)
    onDone?.(response)
  } catch (error) {
    getLogger().warn('Execute error: ', error)
    onFail?.(error)
  }
}
