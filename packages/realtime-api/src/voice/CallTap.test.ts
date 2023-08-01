import { configureJestStore } from '../testUtils'
import { createCallTapObject, CallTap } from './CallTap'

describe('CallTap', () => {
  describe('createCallTapObject', () => {
    let instance: CallTap
    beforeEach(() => {
      instance = createCallTapObject({
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

    it('should update the attributes on setPayload call', () => {
      const newCallId = 'new_call_id'
      const newNodeId = 'new_node_id'
      const newControlId = 'new_control_id'

      // @ts-expect-error
      instance.setPayload({
        call_id: newCallId,
        node_id: newNodeId,
        control_id: newControlId,
      })

      expect(instance.callId).toBe(newCallId)
      // @ts-expect-error
      expect(instance.nodeId).toBe(newNodeId)
      expect(instance.controlId).toBe(newControlId)
    })
  })
})
