import fs from 'fs'
import { BaseSession } from './BaseSession'
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
} from './RPCMessages'
import {
  JSONRPCRequest,
  NodeSocketClient,
  SessionOptions,
} from './utils/interfaces'

interface WSOptions {
  key: string
  cert: string
  caCert: string
}

/**
 * @internal
 */
export interface BackendSessionOptions extends SessionOptions, WSOptions {}

/**
 * @internal
 */
export class BaseBackendSession extends BaseSession {
  constructor(public options: BackendSessionOptions) {
    super(options)
  }
  protected provider(): string {
    return '(unspecified)'
  }
  override async authenticate(): Promise<void> {
    const params: InternalRPCConnectParams = {
      agent: this.agent,
      protocols: [
        {
          protocol: this.provider(),
          rank: 1,
        },
      ],
    }
    this._rpcConnectResult = await this.execute(InternalRPCConnect(params))
  }

  protected getSocketOptions() {
    const { caCert: caPath, cert: certPath, key: keyPath } = this.options
    if (
      fs.existsSync(caPath) &&
      fs.existsSync(certPath) &&
      fs.existsSync(keyPath)
    ) {
      const ca = fs.readFileSync(caPath).toString()
      const key = fs.readFileSync(keyPath).toString()
      const cert = fs.readFileSync(certPath).toString()
      const socketOptions = { cert, key, ca: [ca], rejectUnauthorized: false }
      return socketOptions
    } else {
      throw new Error('cert, key and caCert paths are required.')
    }
  }
  protected override _createSocket(): NodeSocketClient {
    this.logger.info('_createSocket')
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
