import {
  SATAuthorization,
  SessionOptions,
  UNIFIED_CONNECT_VERSION,
} from '@signalwire/core'
import { JWTSession } from '../JWTSession'

export class SATSession extends JWTSession {
  public connectVersion = UNIFIED_CONNECT_VERSION

  constructor(public options: SessionOptions) {
    super(options)
  }

  override get signature() {
    if (this._rpcConnectResult) {
      const { authorization } = this._rpcConnectResult
      return (authorization as SATAuthorization).jti
    }
    return undefined
  }
}
