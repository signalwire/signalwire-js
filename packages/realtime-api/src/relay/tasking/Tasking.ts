import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  extendComponent,
  OnlyStateProperties,
  OnlyFunctionProperties,
  AssertSameType,
  EventTransform,
  SessionState,
} from '@signalwire/core'
import * as relayMethods from '../methods'
import { taskingWorker } from './workers'
import { RelayMethods } from '../types'

export interface TaskingContract
  extends RelayMethods,
    BaseComponent<BaseTaskingApiEvents> {}
export type TaskingEntity = OnlyStateProperties<TaskingContract>
export type TaskingMethods = OnlyFunctionProperties<TaskingContract>

interface TaskingMain extends TaskingContract {}

// TODO: docs
interface TaskingDocs extends TaskingMain {}

export interface Tasking extends AssertSameType<TaskingMain, TaskingDocs> {}

export type BaseTaskingApiEventsHandlerMapping = Record<
  'queuing.relay.tasks',
  (task: any) => void
>

export type BaseTaskingApiEvents<T = BaseTaskingApiEventsHandlerMapping> = {
  [k in keyof T]: T[k]
}

export class BaseTasking extends BaseComponent<BaseTaskingApiEvents> {
  // protected override _eventsPrefix = '' as const

  constructor(options: BaseComponentOptions<BaseTaskingApiEvents>) {
    super(options)

    /**
     * Since we don't need a namespace for these events
     * we'll attach them as soon as the Client has been
     * registered in the Redux store.
     */
    // this._attachListeners('')
    // this.attachWorkers()
    // this.applyEmitterTransforms()
  }

  protected getWorkers() {
    return new Map([['tasking', { worker: taskingWorker }]])
  }

  /** @internal */
  protected getEmitterTransforms() {
    /**
     * TODO: Get rid of transforms for Task
     */
    return new Map<string | string[], EventTransform>([
      [
        ['queuing.relay.tasks'],
        {
          type: 'relayTask',
          instanceFactory: (payload: any) => {
            return payload.message
          },
          payloadTransform: (payload: any) => {
            return payload.message
          },
        },
      ],
    ])
  }

  onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this._attachListeners('')
      this.attachWorkers()
      this.applyEmitterTransforms()
    }
  }
}

export const BaseTaskingAPI = extendComponent<BaseTasking, RelayMethods>(
  BaseTasking,
  {
    receive: relayMethods.receive,
    unreceive: relayMethods.unreceive,
  }
)

export const createTaskingObject = <TaskingType>(
  params: BaseComponentOptions<BaseTaskingApiEvents>
) => {
  const tasking = connect<BaseTaskingApiEvents, BaseTasking, TaskingType>({
    store: params.store,
    Component: BaseTaskingAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
    sessionListeners: {
      authStatus: 'onAuth',
    },
  })(params)

  return tasking
}
