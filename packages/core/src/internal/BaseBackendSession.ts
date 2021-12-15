import { BaseSession } from '../BaseSession'
import {
  InternalRPCConnect,
  InternalRPCConnectParams,
  InternalRPCRequestBody,
  InternalRPCResponse,
  InternalRPCResponseBody,
  JSONRPCMethodNotFound,
  makeInternalRPCErrorResponse,
  makeInternalRPCErrorResponseBody,
  makeInternalRPCResultResponse,
} from '.'
import { JSONRPCRequest, NodeSocketClient } from '../utils/interfaces'

/**
 * @internal
 */
export class BaseBackendSession extends BaseSession {
  protected protocols(): { protocol: string; rank: number }[] {
    return [
      {
        protocol: '(unspecified)',
        rank: 1,
      },
    ]
  }
  override async authenticate(): Promise<void> {
    const protocols = this.protocols()
    const params: InternalRPCConnectParams = {
      agent: this.agent,
      protocols,
    }
    this._rpcConnectResult = await this.execute(InternalRPCConnect(params))
  }

  protected getSocketOptions(): Record<string, any> {
    return {}
  }
  protected override _createSocket(): NodeSocketClient {
    const socketOptions = this.getSocketOptions()
    // @ts-ignore
    return new this.WebSocketConstructor(this.host, socketOptions)
  }

  protected process(
    request: InternalRPCRequestBody
  ): Promise<InternalRPCResponseBody> {
    this.logger.error({ request }, 'process (not implemented)')
    const response = makeInternalRPCErrorResponseBody(
      request,
      '500',
      `Virtual class BaseBackendSession does not implement any RPC`
    )
    return Promise.resolve(response)
  }

  /* @internal */
  protected override async _handleWebSocketMessage(
    payload: JSONRPCRequest
  ): Promise<void> {
    const { method, params } = payload
    switch (method) {
      case 'blade.execute':
        this.logger.info(
          { params },
          '_handleWebSocketMessage: blade.execute request received'
        )
        const rpcResponse: InternalRPCResponseBody = await this.process(
          params as InternalRPCRequestBody
        )
        const response: InternalRPCResponse = makeInternalRPCResultResponse(
          payload,
          rpcResponse.result
        )
        await this.execute(response)
        this.logger.info({ response }, '_handleWebSocketMessage: sent response')
        break
      default:
        await this.execute(
          makeInternalRPCErrorResponse(
            payload,
            JSONRPCMethodNotFound,
            'Unknown method received'
          )
        )
        this.logger.error(
          { payload },
          '_handleWebSocketMessage: unknown method received'
        )
        break
    }
  }
}
