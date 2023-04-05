import { EventEmitter } from '@signalwire/core'
import { configureJestStore } from '../testUtils'
import {
  createCallDetectObject,
  CallDetect,
  CallDetectEventsHandlerMapping,
} from './CallDetect'

describe('CallDetect', () => {
  describe('createCallDetectObject', () => {
    let instance: CallDetect
    beforeEach(() => {
      instance = createCallDetectObject({
        store: configureJestStore(),
        emitter: new EventEmitter<CallDetectEventsHandlerMapping>(),
        payload: {
          call_id: 'call_id',
          node_id: 'node_id',
          control_id: 'control_id',
        },
      })
      // @ts-expect-error
      instance.execute = jest.fn()
    })

    it('should control an active playback', async () => {
      const baseExecuteParams = {
        method: '',
        params: {
          call_id: 'call_id',
          node_id: 'node_id',
          control_id: 'control_id',
        },
      }

      await instance.stop()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'calling.detect.stop',
      })
    })
  })
})
