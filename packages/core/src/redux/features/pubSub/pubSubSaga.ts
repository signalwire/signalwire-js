import { take } from 'redux-saga/effects'
import { logger } from '../../../utils'

export function* pubSubSaga({ pubSubChannel, emitter }: any) {
  while (true) {
    const { type, payload } = yield take(pubSubChannel)
    try {
      emitter.emit(type, payload)
    } catch (error) {
      logger.error(error)
    }
  }
}
