import { call, spawn } from 'redux-saga/effects'
import { logger } from '../../utils'

export const createRestartableSaga = (saga: any) => {
  return function* () {
    spawn(function* () {
      while (true) {
        try {
          logger.debug('Run a restartable saga')
          yield call(saga)
          logger.debug('One of the restartable saga has ended. Restarting..')
        } catch (error) {
          logger.error('Restartable Saga Error', error)
        }
      }
    })
  }
}

export const createCatchableSaga = (saga: any) => {
  return function* () {
    try {
      logger.debug('Run a catchable saga')
      yield call(saga)
    } catch (error) {
      logger.error('Catchable Saga Error', error)
    }
  }
}
