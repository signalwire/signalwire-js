import { EventEmitter } from '@signalwire/core'
import { configureJestStore } from '../testUtils'
import {
  createCallCollectObject,
  CallCollect,
  CallCollectEventsHandlerMapping,
} from './CallCollect'

describe('CallCollect', () => {
  describe('createCallCollectObject', () => {
    let instance: CallCollect
    beforeEach(() => {
      instance = createCallCollectObject({
        store: configureJestStore(),
        emitter: new EventEmitter<CallCollectEventsHandlerMapping>(),
      })
      // @ts-expect-error
      instance.execute = jest.fn()
    })

    it('should control an active collect action', async () => {
      // @ts-expect-error
      instance.callId = 'call_id'
      // @ts-expect-error
      instance.nodeId = 'node_id'
      // @ts-expect-error
      instance.controlId = 'control_id'

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
        method: 'calling.collect.stop',
      })

      await instance.startInputTimers()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        method: 'calling.collect.start_input_timers',
        params: {
          call_id: 'call_id',
          node_id: 'node_id',
          control_id: 'control_id',
        },
      })
    })
  })
})
