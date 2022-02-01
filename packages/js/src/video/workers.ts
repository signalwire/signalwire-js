import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  toSyntheticEvent,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'

export const membersChangedWorker: SDKWorker<RoomSession> =
  function* membersChangedWorker({
    channels: { pubSubChannel },
    instance,
  }): SagaIterator {
    while (true) {
      const pubSubAction = yield sagaEffects.take(
        pubSubChannel,
        ({ type }: any) => {
          return (
            type === 'video.room.joined' ||
            type === 'video.member.joined' ||
            type === 'video.member.left' ||
            type.startsWith('video.member.updated')
          )
        }
      )

      // @ts-expect-error
      console.log('========> instance', instance.getSubscriptions());

      const { payload } = pubSubAction
      yield sagaEffects.put(pubSubChannel, {
        type: toSyntheticEvent('video.members.changed') as any,
        payload: payload,
      })
    }
  }
