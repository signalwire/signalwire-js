import util from 'util'
import { eventChannel } from '@redux-saga/core'
import { expectSaga } from 'redux-saga-test-plan'
import { memberUpdatedWorker } from '.'
import { socketMessageAction } from '../redux/actions'
import { createPubSubChannel, createSwEventChannel } from '../testUtils'
import { memberPositionWorker } from './workers'

describe('memberPositionWorker', () => {
  util.inspect.defaultOptions.depth = null
  it('should handle video.member.updated dispatching the sub-events for what is changed for the user', async () => {
    const action = {
      type: 'video.member.updated',
      payload: {
        room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        member: {
          requested_position: 'auto',
          updated: ['visible', 'video_muted'],
          room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          id: 'ab42641c-e784-42f1-9815-d264105bc24f',
          visible: true,
          room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          video_muted: false,
        } as any,
      },
    }
    let runSaga = true
    const pubSubChannel = createPubSubChannel()
    const swEventChannel = createSwEventChannel()
    const sessionChannel = eventChannel(() => () => {})
    const dispatchedActions: unknown[] = []

    return (
      expectSaga(memberUpdatedWorker, {
        action,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        memberList: new Map([
          [
            'ab42641c-e784-42f1-9815-d264105bc24f',
            {
              room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
              room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
              member: {
                requested_position: 'auto',
                room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
                id: 'ab42641c-e784-42f1-9815-d264105bc24f',
                visible: false,
                room_id: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
                video_muted: true,
              } as any,
            },
          ],
        ]),
        instance: {},
      })
        .provide([
          {
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(pubSubChannel, {
          type: 'video.member.updated.visible',
          payload: action.payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.updated.video_muted',
          payload: action.payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.updated',
          payload: action.payload,
        })
        .run()
    )
    // .finally(() => {
    //   expect(dispatchedActions).toHaveLength(3)
    // })
  })
})
