import { SagaIterator } from '@redux-saga/core'
import type { SDKWorker } from '../utils/interfaces'

/**
 * Set any instance to the instance map
 */
export const injectInInstanceMapWorker: SDKWorker<any> = function* (
  options
): SagaIterator {
  const { initialState, instanceMap } = options
  const { instances, callback } = initialState

  if (!Array.isArray(instances)) {
    throw new Error('Instances should be an array')
  }

  instances.forEach((pInstance: any) => {
    if (callback) {
      callback(instanceMap, pInstance)
    } else {
      instanceMap.set(pInstance.id, pInstance)
    }
  })
}
