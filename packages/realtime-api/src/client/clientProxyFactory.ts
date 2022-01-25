import { RealtimeClient } from './Client'
import { clientConnect } from './clientConnect'

export const clientProxyFactory = (client: RealtimeClient) => {
  // Client interceptors
  const clientOn: RealtimeClient['on'] = (...args) => {
    clientConnect(client)

    return client.on(...args)
  }
  const clientOnce: RealtimeClient['once'] = (...args) => {
    clientConnect(client)

    return client.once(...args)
  }

  return new Proxy<RealtimeClient>(client, {
    get(target: RealtimeClient, prop: keyof RealtimeClient, receiver: any) {
      if (prop === 'on') {
        return clientOn
      } else if (prop === 'once') {
        return clientOnce
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}
