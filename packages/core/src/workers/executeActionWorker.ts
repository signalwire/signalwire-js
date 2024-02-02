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
  const { initialState, onDone, onFail, getSession, instance } = options
  
  const { requestId, method, params } = initialState

  const session = getSession()

  const getTarget = () => {
    
    //TODO
    // find if params has a member_id
    //     than we need to look member data fir that member_id
    //     and return {call_id, node_id, member_id}

    //@ts-ignore
    return [instance.target]
  }

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
      const target = getTarget()
      //@ts-ignore
      message = UnifiedRequestMapper[message.method](message, instance.self, target)
    }

    
    const response = yield call(session.execute, message)
    onDone?.(response)
  } catch (error) {
    getLogger().warn('Execute error: ', error)
    onFail?.(error)
  }
}