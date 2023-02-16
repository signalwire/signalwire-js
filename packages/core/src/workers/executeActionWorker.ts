import { call } from '@redux-saga/core/effects'
import { SagaIterator } from '@redux-saga/core'
import { getLogger } from '../utils/logger'
import { RPCExecute } from '../RPCMessages/RPCExecute'
import type { SDKWorker } from '../utils/interfaces'
import type { ExecuteActionParams } from '../redux/interfaces'

/**
 * Send a JSONRPC over the wire using session.execute and resolve/reject the promise
 */
export const executeActionWorker: SDKWorker<ExecuteActionParams> = function* (
  options
): SagaIterator {
  const { payload, onDone, onFail, getSession } = options

  const { requestId, method, params } = payload

  const session = getSession()

  if (!session) {
    const error = new Error('Session does not exist!')
    getLogger().error(error)
    onFail?.(error)
    return
  }

  try {
    const message = RPCExecute({
      id: requestId,
      method,
      params,
    })
    const response = yield call(session.execute, message)
    onDone?.(response)
  } catch (error) {
    getLogger().warn('Execute error: ', error)
    onFail?.(error)
  }
}
