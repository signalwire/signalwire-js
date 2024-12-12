import util from 'util'
import { expectSaga } from 'redux-saga-test-plan'
import { memberUpdatedWorker } from '.'
import {
  createSwEventChannel,
  createSessionChannel,
  configureJestStore,
} from '../testUtils'
import { BaseComponent } from '../BaseComponent'
import { MapToPubSubShape } from '../redux/interfaces'
import { VideoMemberUpdatedEvent } from '..'

describe('memberPositionWorker', () => {
  util.inspect.defaultOptions.depth = null

  class JestComponent extends BaseComponent<any> {
    constructor() {
      super({
        store: configureJestStore(),
      })
    }
  }

  let instance: BaseComponent<any>

  beforeEach(() => {
    instance = new JestComponent()
  })

  afterEach(() => {
    instance.removeAllListeners()
  })

  const memberId = 'ab42641c-e784-42f1-9815-d264105bc24f'
  const action: MapToPubSubShape<VideoMemberUpdatedEvent> = {
    type: 'video.member.updated',
    payload: {
      room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
      room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
      member: {
        requested_position: 'auto',
        updated: ['visible', 'video_muted'],
        room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        id: memberId,
        visible: true,
        room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        video_muted: false,
      } as any,
    },
  }
  const swEventChannel = createSwEventChannel()
  const sessionChannel = createSessionChannel()
  const memberList = new Map([
    [
      memberId,
      {
        room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        member: {
          requested_position: 'auto',
          room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          id: memberId,
          visible: false,
          room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          video_muted: true,
        } as any,
      },
    ],
  ])
  const session = {
    connect: jest.fn(),
  } as any
  const getSession = jest.fn().mockImplementation(() => session)

  it('should handle video.member.updated dispatching the sub-events for what is changed for the user and updating the internal cache', () => {
    // A spy for the emitter.emit method
    const emitSpy = jest.spyOn(instance, 'emit')

    return expectSaga(memberUpdatedWorker, {
      action,
      channels: {
        swEventChannel,
        sessionChannel,
      },
      memberList,
      instance,
      instanceMap: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        getAll: jest.fn(),
        deleteAll: jest.fn(),
      },
      getSession,
    })
      .run()
      .finally(() => {
        expect(emitSpy).toHaveBeenCalledWith(
          'member.updated.visible',
          action.payload
        )
        expect(emitSpy).toHaveBeenCalledWith(
          'member.updated.video_muted',
          action.payload
        )
        expect(emitSpy).toHaveBeenCalledWith('member.updated', action.payload)
        expect(memberList.get(memberId)?.member.visible).toBe(true)
        expect(memberList.get(memberId)?.member.video_muted).toBe(false)
        expect(memberList.get(memberId)?.member.updated).toStrictEqual([
          'visible',
          'video_muted',
        ])
      })
  })

  it('should handle video.member.updated dispatching using the dispatcher function if passed', () => {
    // A spy for the emitter.emit method
    const emitSpy = jest.spyOn(instance, 'emit')

    // A mock dispatcher function
    const mockDispatcher = jest.fn()

    return expectSaga(memberUpdatedWorker, {
      action,
      channels: {
        swEventChannel,
        sessionChannel,
      },
      memberList,
      instance,
      instanceMap: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        getAll: jest.fn(),
        deleteAll: jest.fn(),
      },
      getSession,
      dispatcher: mockDispatcher,
    })
      .run()
      .finally(() => {
        expect(emitSpy).toHaveBeenCalledTimes(0)
        expect(mockDispatcher).toHaveBeenCalledTimes(3)
      })
  })
})
