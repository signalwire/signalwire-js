import { testUtils, componentActions, sagaHelpers } from '@signalwire/core'
import { expectSaga } from 'redux-saga-test-plan'
import { childMemberJoinedWorker } from './childMemberJoinedWorker'

const { createPubSubChannel, createSwEventChannel } = testUtils

describe('childMemberJoinedWorker', () => {
  it('should handle video.member.joined with parent_id', () => {
    const parentId = 'd815d293-f8d0-49e8-aec2-3a4cc3729af8'
    let runSaga = true
    const session = {} as any
    const pubSubChannel = createPubSubChannel()
    const swEventChannel = createSwEventChannel()
    const sessionChannel = sagaHelpers.eventChannel(() => () => {})
    const dispatchedActions: unknown[] = []
    const defaultState = {
      components: {
        byId: {
          [parentId]: {
            id: parentId,
            responses: {},
            state: 'active',
            remoteSDP: 'sdp',
            nodeId: '4959db05-3dbb-41fa-ae1d-596854b665d0@',
            roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
            roomSessionId: '313bedbe-edc9-4653-b332-34fbf43e8289',
            memberId: parentId,
          },
        },
      },
    }

    return expectSaga(childMemberJoinedWorker, {
      // @ts-expect-error
      session,
      channels: {
        pubSubChannel,
        swEventChannel,
      },
      sessionChannel,
      instance: {
        id: 'instance-id',
        _attachListeners: jest.fn(),
        applyEmitterTransforms: jest.fn(),
      } as any,
      initialState: {
        parentId,
      },
    })
      .withState(defaultState)
      .provide([
        {
          take({ channel }, next) {
            if (runSaga && channel === swEventChannel) {
              runSaga = false

              return {
                type: 'video.member.joined',
                payload: {
                  room_session_id: '313bedbe-edc9-4653-b332-34fbf43e8289',
                  room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
                  member: {
                    parent_id: parentId,
                    id: 'b8912cc5-4248-4345-b53c-d53b2761748d',
                  },
                },
              }
            } else if (runSaga === false) {
              sessionChannel.close()
              pubSubChannel.close()
            }
            return next()
          },
          put(action, next) {
            dispatchedActions.push(action)
            return next()
          },
        },
      ])
      .put(
        componentActions.upsert({
          id: 'instance-id',
          roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          roomSessionId: '313bedbe-edc9-4653-b332-34fbf43e8289',
          memberId: 'b8912cc5-4248-4345-b53c-d53b2761748d',
        })
      )
      .silentRun()
      .finally(() => {
        expect(dispatchedActions).toHaveLength(1)
      })
  })
})
