import { CustomSaga } from './interfaces'
import { SDKStore } from './'
import type { BaseComponent } from '../BaseComponent'
import { EventEmitter } from '../utils/EventEmitter'

interface Connect<T> {
  store: SDKStore
  Component: new (o: any) => T
  customSagas?: Array<CustomSaga<T>>
}

export const connect = <
  EventTypes extends EventEmitter.ValidEventTypes,
  /**
   * Class extending BaseComponent.
   */
  T extends BaseComponent<EventTypes>,
  /**
   * The type the end user will be interacting with.
   */
  TargetType
>(
  options: Connect<T>
) => {
  const { store, Component, customSagas = [] } = options

  return (userOptions: any): TargetType => {
    const instance = new Component({ ...userOptions, store })

    // Run all the custom sagas
    const taskList = customSagas?.map((saga) => {
      return store.runSaga(saga, { instance, runSaga: store.runSaga })
    })

    instance.destroyer = () => {
      // Cancel all the custom sagas
      if (taskList?.length) {
        taskList.forEach((task) => task.cancel())
      }
    }

    return instance as any as TargetType
  }
}
