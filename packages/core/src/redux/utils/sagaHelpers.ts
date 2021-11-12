import { call, spawn } from '@redux-saga/core/effects'
import { getLogger } from '../../utils'

export const createRestartableSaga = (saga: any) => {
  return function* () {
    spawn(function* () {
      while (true) {
        try {
          getLogger().debug('Run a restartable saga')
          yield call(saga)
          getLogger().debug(
            'One of the restartable saga has ended. Restarting..'
          )
        } catch (error) {
          getLogger().error('Restartable Saga Error', error)
        }
      }
    })
  }
}

export const createCatchableSaga = (saga: any) => {
  return function* () {
    try {
      getLogger().debug('Run a catchable saga')
      yield call(saga)
    } catch (error) {
      getLogger().error('Catchable Saga Error', error)
    }
  }
}
