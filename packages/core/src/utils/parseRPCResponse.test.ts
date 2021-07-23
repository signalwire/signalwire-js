import { BladeConnect, Execute } from '../RPCMessages'
import { parseRPCResponse } from './parseRPCResponse'

describe('parseRPCResponse', () => {
  const project = 'project'
  const token = 'token'

  describe('signalwire.connect', () => {
    const request = BladeConnect({
      authentication: { project, token },
    })

    it('should handle signalwire.connect success', () => {
      const response = JSON.parse(
        '{"jsonrpc":"2.0","id":"bc78ab45-a070-4e09-9b43-01f03b7c28ec","result":{"session_restored":false,"sessionid":"abc6ce66-e19f-42dd-aa9a-08ce68510273","nodeid":"4f75ff8b-08b2-448f-b28f-26bf2fb8e7c6@124f5b6d-8bae-4340-af18-16a0d85f709c.west-us","identity":"4f75ff8b-08b2-448f-b28f-26bf2fb8e7c6@124f5b6d-8bae-4340-af18-16a0d85f709c.west-us","master_nodeid":"00000000-0000-0000-0000-000000000000@","authorization":{"project":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","expires_at":1618220912,"scopes":["webrtc","test-scope","conferencing"],"scope_id":null,"resource":"edoardo","signature":"c01e2e6acb37a98e6f8363b2a7c5bc5aa90e846752d01a4f0f5a788bafa4682b"},"protocols":[],"subscriptions":[],"authorizations":[],"accesses":[],"protocols_uncertified":["signalwire"],"result":{"protocol":"signalwire_c01e2e6acb37a98e6f8363b2a7c5bc5aa90e846752d01a4f0f5a788bafa4682b_4b7c0361-918e-49c5-8da3-dfbf14563d7f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","iceServers":[{"url":"127.0.0.1:3478","credential":"wwD1a7JVOtPXf3Hpup1JTc9IV3Q=","credentialType":"password","username":"1617803345:78429ef1-283b-4fa9-8ebc-16b59f95bb1f"}]}},"hops":[]}'
      )
      expect(parseRPCResponse({ request, response })).toStrictEqual({
        result: response.result,
      })
    })

    it('should handle signalwire.connect failure', () => {
      const response = JSON.parse(
        '{"jsonrpc":"2.0","id":"387f88c9-886f-4f44-9495-fc6b393b9b73","error":{"code":-32002,"message":"Authentication service failed with status ProtocolError, 401 Unauthorized: {}"},"hops":[]}'
      )
      expect(parseRPCResponse({ request, response })).toStrictEqual({
        error: response.error,
      })
    })
  })

  describe('blade.execute', () => {
    const request = Execute({
      method: 'signalwire.subscribe',
      params: { x: 1, y: 2 },
    })

    it('should handle blade.execute result', () => {
      const response = JSON.parse(
        '{"jsonrpc":"2.0","id":"uuid","result":{"requester_nodeid":"req-id","responder_nodeid":"res-id","result":{"code":"200","message":"Playing","call_id":"call-id"}}}'
      )
      expect(parseRPCResponse({ request, response })).toEqual({
        result: { code: '200', message: 'Playing', call_id: 'call-id' },
      })
    })
    it('should handle blade.execute result', () => {
      const response = JSON.parse(
        '{"jsonrpc":"2.0","id":"uuid","error":{"requester_nodeid":"req-id","responder_nodeid":"res-id","code":-32601,"message":"Error Message"}}'
      )
      expect(parseRPCResponse({ request, response })).toEqual({
        error: response.error,
      })
    })

    it('should handle Verto result over Blade', () => {
      const normalResponse = JSON.parse(
        '{"jsonrpc":"2.0","id":"uuid","result":{"requester_nodeid":"req-id","responder_nodeid":"res-id","result":{"code":"200","node_id":"node-id","result":{}}}}'
      )
      expect(parseRPCResponse({ request, response: normalResponse })).toEqual({
        result: { node_id: 'node-id' },
      })

      const vertoResponse = JSON.parse(
        '{"jsonrpc":"2.0","id":"uuid","result":{"requester_nodeid":"req-id","responder_nodeid":"res-id","result":{"code":"200","node_id":"node-id","result":{"jsonrpc":"2.0","id":"verto-uuid","result":{"message":"CALL CREATED","callID":"call-id"}}}}}'
      )
      expect(parseRPCResponse({ request, response: vertoResponse })).toEqual({
        result: {
          message: 'CALL CREATED',
          callID: 'call-id',
          node_id: 'node-id',
        },
      })
    })

    it('should handle Verto error over Blade', () => {
      const response = JSON.parse(
        '{"jsonrpc":"2.0","id":"uuid","result":{"requester_nodeid":"req-id","responder_nodeid":"res-id","result":{"code":"200","node_id":"node-id","result":{"jsonrpc":"2.0","id":"123","error":{"message":"Random Error","callID":"call-id","code":"123"}}}}}'
      )
      expect(parseRPCResponse({ request, response })).toEqual({
        error: { code: '123', message: 'Random Error', callID: 'call-id' },
      })
    })
  })
})
