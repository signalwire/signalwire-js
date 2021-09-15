import { configureJestStore } from '../testUtils'
import { BaseComponent } from '../BaseComponent'
import { EventEmitter } from '../utils/EventEmitter'
import { connect, SDKStore } from '../redux'
import * as CustomMethods from './methods'

describe('Room Custom Methods', () => {
  let store: SDKStore
  let instance: any

  Object.defineProperties(BaseComponent.prototype, CustomMethods)

  beforeEach(() => {
    store = configureJestStore()
    instance = connect({
      store,
      componentListeners: {
        errors: 'onError',
        responses: 'onSuccess',
      },
      Component: BaseComponent,
    })({
      emitter: new EventEmitter(),
    })
    instance.execute = jest.fn()
    instance._attachListeners(instance.__uuid)
  })

  it('should have all the custom methods defined', () => {
    Object.keys(CustomMethods).forEach((method) => {
      expect(instance[method]).toBeDefined()
    })
  })

  describe('startRecording', () => {
    it('should return the raw payload w/o emitterTransforms', async () => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
      })
      instance.roomSessionId = 'mocked'

      const response = await instance.startRecording()
      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith({
        method: 'video.recording.start',
        params: {
          room_session_id: 'mocked',
        },
      })
      expect(response).toStrictEqual({
        code: '200',
        message: 'Recording started',
        recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        room_session_id: 'mocked',
      })
    })
  })
})
