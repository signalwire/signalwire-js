import { logger } from '../../../utils'
import { take } from 'redux-saga/effects'

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
