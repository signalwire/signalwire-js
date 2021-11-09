import WebSocket from 'ws'
import fs from 'fs'
import { BaseSession } from './BaseSession'
import { NodeSocketClient, SessionOptions } from './utils/interfaces'
import {
  BladeConnect,
  BladeConnectParams,
  BladeRequest,
  BladeResponse,
  BladeRPCRequest,
  BladeRPCResponse,
  JSONRPCMethodNotFound,
  makeBladeErrorResponse,
  makeBladeResultResponse,
  makeBladeRPCErrorResponse,
} from './RPCMessages'

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
  public override WebSocketConstructor = WebSocket
  protected wsOptions: WSOptions

  constructor(options: BackendSessionOptions) {
    super(options)
    const { key, cert, caCert } = options
    this.wsOptions = { key, cert, caCert }
  }
  protected provider(): string {
    return '(unspecified)'
  }
  override async authenticate(): Promise<void> {
    const params: BladeConnectParams = {
      agent: this.agent,
      protocols: [
        {
          protocol: this.provider(),
          rank: 1,
        },
      ],
    }
    this._rpcConnectResult = await this.execute(BladeConnect(params))
  }

  protected override _createSocket(): NodeSocketClient {
    this.logger.info('_createSocket')
    const { caCert: caPath, cert: certPath, key: keyPath } = this.wsOptions
    if (
      fs.existsSync(caPath) &&
      fs.existsSync(certPath) &&
      fs.existsSync(keyPath)
    ) {
      const ca = fs.readFileSync(caPath)
      const key = fs.readFileSync(keyPath)
      const cert = fs.readFileSync(certPath)
      const wsOptions = { cert, key, ca: [ca], rejectUnauthorized: false }
      return new this.WebSocketConstructor(this.host, wsOptions)
    } else {
      throw new Error('cert, key and caCert paths are required.')
    }
  }

  protected process(request: BladeRPCRequest): Promise<BladeRPCResponse> {
    this.logger.error({ request }, 'process (not implemented)')
    const response = makeBladeRPCErrorResponse(
      request,
      '500',
      `Virtual class BaseBackendSession does not implement any RPC`
    )
    return Promise.resolve(response)
  }

  /* @internal */
  protected override async _handleWebSocketMessage(
    payload: BladeRequest
  ): Promise<void> {
    const { method, params } = payload
    switch (method) {
      case 'blade.execute':
        this.logger.info(
          { params },
          '_handleWebSocketMessage: blade.execute request received'
        )
        const rpcResponse: BladeRPCResponse = await this.process(params)
        const response: BladeResponse = makeBladeResultResponse(
          payload,
          rpcResponse.result
        )
        await this.execute(response)
        this.logger.info({ response }, '_handleWebSocketMessage: sent response')
        break
      default:
        await this.execute(
          makeBladeErrorResponse(
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
