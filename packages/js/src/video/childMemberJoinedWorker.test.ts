import { testUtils, componentActions } from '@signalwire/core'
import { expectSaga } from 'redux-saga-test-plan'
import { childMemberJoinedWorker } from './childMemberJoinedWorker'

const { createSwEventChannel, createSessionChannel } = testUtils

describe('childMemberJoinedWorker', () => {
  it('should handle video.member.joined with parent_id', () => {
    const parentId = 'd815d293-f8d0-49e8-aec2-3a4cc3729af8'
    const memberId = 'b8912cc5-4248-4345-b53c-d53b2761748d'
    let runSaga = true
    const swEventChannel = createSwEventChannel()
    const sessionChannel = createSessionChannel()
    const session = {
      connect: jest.fn(),
    } as any
    const getSession = jest.fn().mockImplementation(() => session)
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
      channels: {
        swEventChannel,
        sessionChannel,
      },
      instance: {
        callId: 'callId',
      } as any,
      initialState: {
        parentId,
      },
      instanceMap: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
      getSession,
      runSaga: jest.fn(),
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
                    id: memberId,
                    parent_id: parentId,
                  },
                },
              }
            } else if (runSaga === false) {
              sessionChannel.close()
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
          id: 'callId',
          roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          roomSessionId: '313bedbe-edc9-4653-b332-34fbf43e8289',
          memberId,
        })
      )
      .silentRun()
      .finally(() => {
        expect(dispatchedActions).toHaveLength(1)
      })
  })
})
