import { MakeRoomOptions } from '../Client'
import { RoomSession } from '../video'

type Strategy = 'room'
type StrategyParams = RoomStrategyParams
type RoomStrategyParams = {
  token: string
}
interface FabricCallResponse {
  strategy: Strategy
  params: StrategyParams
  userParams: MakeRoomOptions
}

export const buildCall = ({
  strategy,
  params,
  userParams,
}: FabricCallResponse) => {
  let obj: RoomSession
  let start: (...args: any[]) => void
  switch (strategy) {
    case 'room':
      obj = new RoomSession({
        token: params.token,
        debug: {
          logWsTraffic: true,
        },
        logLevel: 'debug',
        watchMediaPackets: false,
        ...userParams,
      })
      start = (joinParams: any) => {
        return new Promise((resolve, reject) => {
          obj.once('room.joined', (params) => resolve(params))
          // @ts-ignore
          obj.emitter.once('verto.display', (params) => resolve(params))
          return obj.join(joinParams).catch((error) => reject(error))
        })
      }
      break
    // case 'voice':
    // case 'script':
    // case 'whatever':
    default:
      throw new Error(`Unknown strategy: '${strategy}'`)
  }

  const interceptors = {
    start,
  }

  return new Proxy(obj, {
    get(target: typeof obj, prop: keyof typeof obj, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}
