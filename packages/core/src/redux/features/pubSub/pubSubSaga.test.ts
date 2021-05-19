import { channel } from 'redux-saga'
import { expectSaga } from 'redux-saga-test-plan'
import { pubSubSaga } from './pubSubSaga'
import { logger } from '../../../utils'
import { EventEmitter } from '../../../utils/EventEmitter'

describe('sessionChannelWatcher', () => {
  it('should take from pubSubChannel and emit through the EventEmitter', () => {
    let runSaga = true
    const emitter = EventEmitter()
    const mockFn = jest.fn()
    emitter.on('event.name', mockFn)
    const pubSubChannel = channel()

    return expectSaga(pubSubSaga, {
      pubSubChannel,
      emitter,
    })
      .provide([
        {
          take({ channel }, next) {
            if (runSaga && channel === pubSubChannel) {
              runSaga = false
              return { type: 'event.name', payload: { key: 'value' } }
            } else if (runSaga === false) {
              pubSubChannel.close()
            }
            return next()
          },
        },
      ])
      .run()
      .finally(() => {
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith({ key: 'value' })
      })
  })

  it('should be resilient to the end-user errors', () => {
    let runSagaCounter = 0
    const emitter = EventEmitter()
    const mockFn = jest.fn()
    emitter.on('exception', () => {
      throw 'Jest Error'
    })
    emitter.on('event.name', mockFn)
    const pubSubChannel = channel()

    return expectSaga(pubSubSaga, {
      pubSubChannel,
      emitter,
    })
      .provide([
        {
          take(_opts, next) {
            switch (runSagaCounter) {
              case 0:
                runSagaCounter += 1
                return { type: 'exception', payload: { error: true } }
              case 1:
                runSagaCounter += 1
                return { type: 'event.name', payload: { error: false } }
              default:
                pubSubChannel.close()
                return next()
            }
          },
        },
      ])
      .run()
      .finally(() => {
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith({ error: false })

        expect(logger.error).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalledWith('Jest Error')
      })
  })
})
