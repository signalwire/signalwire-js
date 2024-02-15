import {
  InternalUnifiedMethodTarget,
  JSONRPCRequest,
  JSONRPCResponse,
  SessionOptions,
  isJSONRPCRequest,
} from '@signalwire/core'
import { JWTSession } from './JWTSession'
import { UnifiedRequestMapper } from './utils/UnifiedRequestMapper'


export function isUnifedJWTSession(obj: any): obj is UnifiedJWTSession {
  return !!obj && obj instanceof UnifiedJWTSession
}

export class UnifiedJWTSession extends JWTSession {
  private callInstancesStack: InternalUnifiedMethodTarget[] = []

  constructor(public options: SessionOptions) {
    super({ ...options })
  }

  pushCallInstanceRef(target: InternalUnifiedMethodTarget) {
    this.logger.debug('Pushing new target to stack', target)
    this.callInstancesStack.push(target)
  }

  popCallInstanceRef(): InternalUnifiedMethodTarget | undefined {
    const target = this.callInstancesStack.pop()
    this.logger.debug('Poping target from stack', target.callId)
    return target
  }

  getExcuteSelf() {
    return this.callInstancesStack[0]
  }

  getCurrentSelf() {
    return this.callInstancesStack[this.callInstancesStack.length-1]
  }

  isASelfInstance(id: string) {
    return !!this.callInstancesStack.find((item)=>item.memberId === id)
  }

  //@ts-ignore
  getExecuteTargets(msg: JSONRPCRequest): InternalUnifiedMethodTarget[] {
    const {member_id:targetMemberId} = msg.params ?? {}

    if(targetMemberId && this.isASelfInstance(targetMemberId)) {
      // SDK emits all selves events as the original self...
      // when we make the target the current self
      
      //@ts-ignore
      const defaultTarget = getCurrentSelf()
      return !!defaultTarget ? [defaultTarget] : []
    }

    const memberInstance = targetMemberId ? this.instanceMap?.get<{id: string, callId: string, nodeId:string}>(targetMemberId) : undefined;
    const {id:memberId, callId, nodeId} = memberInstance ?? {};
    const targetMember = memberId && callId && nodeId ? {memberId, callId, nodeId} : undefined

    //@ts-ignore
    const defaultTarget = targetMember ?? getCurrentSelf()
    return !!defaultTarget ? [defaultTarget] : []
  }

  execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any> {
    if (isJSONRPCRequest(msg) && msg.method in UnifiedRequestMapper) {
      //first incarnation of the default target
      const self = this.getExcuteSelf()

      const targets = this.getExecuteTargets(msg)

      //@ts-ignore
      msg = UnifiedRequestMapper[msg.method](msg, self, targets)
    }
    return super.execute(msg)
  }
}
