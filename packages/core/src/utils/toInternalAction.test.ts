import { toInternalAction } from './toInternalAction'

describe('toInternalAction', () => {
  it('should translate event_type and params to an action with type and payload', () => {
    const internalAction = toInternalAction({
      event_type: 'bla',
      params: {
        key: 'value',
      },
    })

    expect(internalAction).toStrictEqual({
      type: 'bla',
      payload: {
        key: 'value',
      },
    })

    const internalAction2 = toInternalAction({
      event_type: 'bla',
      params: 'just string',
    })

    expect(internalAction2).toStrictEqual({
      type: 'bla',
      payload: 'just string',
    })
  })

  it('should handle the special case of "queuing.relay.tasks"', () => {
    const message = {
      event_type: 'queuing.relay.tasks',
      space_id: 'space_id',
      project_id: 'project_id',
      context: 'context',
      timestamp: 1658484425,
      message: {
        id: 1658484419686,
        item: 'last',
      },
    }
    const internalAction = toInternalAction(message)

    expect(internalAction).toStrictEqual({
      type: 'queuing.relay.tasks',
      payload: message,
    })
  })

  it('should handle the special case of "webrtc.message"', () => {
    const internalAction = toInternalAction({
      event_type: 'webrtc.message',
      event_channel: 'event_channel',
      timestamp: 1658484743.339018,
      project_id: 'project_id',
      node_id: 'node_id',
      params: {
        jsonrpc: '2.0',
        id: 1174,
        method: 'verto.mediaParams',
        params: {
          callID: '9ce1a38e-34fc-4a4a-95e8-61d710c4a7c7',
          mediaParams: {
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
          },
        },
      },
    })

    expect(internalAction).toStrictEqual({
      type: 'webrtc.message',
      payload: {
        jsonrpc: '2.0',
        id: 1174,
        method: 'verto.mediaParams',
        params: {
          nodeId: 'node_id',
          callID: '9ce1a38e-34fc-4a4a-95e8-61d710c4a7c7',
          mediaParams: {
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
          },
        },
      },
    })
  })
})
