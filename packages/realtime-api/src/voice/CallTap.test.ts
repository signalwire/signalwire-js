import { EventEmitter } from '@signalwire/core'
import { configureJestStore } from '../testUtils'
import {
  createCallTapObject,
  CallTap,
  CallTapEventsHandlerMapping,
} from './CallTap'

describe('CallTap', () => {
  describe('createCallTapObject', () => {
    let instance: CallTap
    beforeEach(() => {
      instance = createCallTapObject({
        store: configureJestStore(),
        emitter: new EventEmitter<CallTapEventsHandlerMapping>(),
        // @ts-expect-error
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
        method: 'calling.tap.stop',
      })
    })
  })
})
