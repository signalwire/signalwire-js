import { InternalUnifiedMethodTarget, JSONRPCRequest, JSONRPCResponse, SessionOptions, isJSONRPCRequest } from "@signalwire/core";
import { JWTSession } from "./JWTSession";
import { UnifiedRequestMapper } from "./utils/UnifiedRequestMapper";

 
export function isUnifedJWTSession(obj: any): obj is UnifiedJWTSession {
    return !!obj && obj instanceof UnifiedJWTSession
  }


export class UnifiedJWTSession extends JWTSession {

    private callInstancesStack: InternalUnifiedMethodTarget[] = []

    constructor(public options: SessionOptions){
        super({...options});
    }

    pushCallInstanceRef(target:InternalUnifiedMethodTarget) {
        this.callInstancesStack.push(target);
    }

    popCallInstanceRef():InternalUnifiedMethodTarget | undefined {
        return this.callInstancesStack.pop()
    }

    getExcuteSelf() {
        return this.callInstancesStack[0];
    }

    //@ts-ignore
    getExecuteTargets(msg: JSONRPCRequest): InternalUnifiedMethodTarget[] {
        // TODO inspect if msg.params contains member
        
        //@ts-ignore
        const defaultTarget = this.callInstancesStack.findLast(()=>true)
        return !!defaultTarget ? [ defaultTarget ] : []
    } 

    execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any> {
        if(isJSONRPCRequest(msg) && msg.method in UnifiedRequestMapper) {
            //first incarnation of the default target
            const self = this.getExcuteSelf()

            const targets = this.getExecuteTargets(msg)

            //@ts-ignore 
            msg = UnifiedRequestMapper[msg.method](msg, self, targets)
        }
        return super.execute(msg)
    }

}