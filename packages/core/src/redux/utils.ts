import { getStore } from './index'
// import { getSession } from '../JWTSession'
import { uuid } from '../utils'

const connect = (mapState: any, componentFn: any) => {
  const store = getStore()
  const { onStateChangeListeners = {} } = mapState
  const componentKeys = Object.keys(onStateChangeListeners)

  return (userOptions: any) => {
    const instance = componentFn(store)(userOptions)
    const cacheMap = new Map<string, any>()
    // const _unsubscribe = store.subscribe(() => {
    store.subscribe(() => {
      const { components = {} } = store.getState()
      componentKeys.forEach((key) => {
        const current = cacheMap.get(key)
        const updatedValue = components[instance.id][key]
        if (current !== updatedValue) {
          cacheMap.set(key, updatedValue)
          const fnName = onStateChangeListeners[key]
          instance[fnName](components[instance.id])
        }
      })
    })

    // TODO: automatically attach unsubscribe to the object destroy
    // TODO: remove instance.id from cacheMap

    return instance
  }
}

const BaseWebRTCCall = (store: any) => (userOptions: any) => {
  console.debug('BaseWebRTCCall userOptions', store, userOptions)
  const id = uuid()

  return {
    id,
    onStateChange: (component: any) => {
      console.debug('Im onStateChange', component, id)
    },
    onRemoteSDP: (component: any) => {
      console.debug('Im onRemoteSDP', component, id)
    },
  }
}

const ConnectedWebRTCCall = connect(
  {
    onStateChangeListeners: {
      state: 'onStateChange',
      remoteSDP: 'onRemoteSDP',
    },
  },
  BaseWebRTCCall
)

const BaseMessage = (store: any) => (userOptions: any) => {
  console.debug('BaseWebRTCCall userOptions', store, userOptions)
  const id = uuid()

  return {
    id,
    onStatusChange: (component: any) => {
      console.debug('Im onStatusChange', component, id)
    },
  }
}

const ConnectedMessage = connect(
  {
    onStateChangeListeners: {
      status: 'onStatusChange',
    },
  },
  BaseMessage
)

export const createWebRTCCall = (userOptions: any) => {
  // const session = getSession()
  // console.debug('createWebRTCCall', session)
  console.debug('createWebRTCCall')

  return ConnectedWebRTCCall(userOptions)
}

export const createMessage = (userOptions: any) => {
  // const session = getSession()
  // console.debug('createMessage', session)
  console.debug('createMessage')

  return ConnectedMessage(userOptions)
}
