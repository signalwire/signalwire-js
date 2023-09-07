import { configureJestStore } from '../testUtils'
import { createCallRecordingObject, CallRecording } from './CallRecording'

describe('CallRecording', () => {
  describe('createCallRecordingObject', () => {
    let instance: CallRecording
    beforeEach(() => {
      instance = createCallRecordingObject({
        store: configureJestStore(),
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

    it('should control an active recording', async () => {
      const baseExecuteParams = {
        method: '',
        params: {
          call_id: 'call_id',
          node_id: 'node_id',
          control_id: 'control_id',
        },
      }

      await instance.pause()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        method: 'calling.record.pause',
        params: {
          ...baseExecuteParams.params,
          behavior: 'silence',
        },
      })

      await instance.pause({ behavior: 'skip' })
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        method: 'calling.record.pause',
        params: {
          ...baseExecuteParams.params,
          behavior: 'skip',
        },
      })

      await instance.resume()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'calling.record.resume',
      })

      await instance.stop()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'calling.record.stop',
      })
    })
  })
})
