import { IncomingCallManager } from './IncomingCallManager'
import { CallParams, IncomingCallNotification, IncomingInvite } from './types'
import { WSClient } from './WSClient'

describe('IncomingCallManager', () => {
  const mockAnswer = jest.fn()
  const buildInboundCall = jest
    .fn()
    .mockImplementation((_invite: IncomingInvite, _params: CallParams) => ({
      answer: mockAnswer,
    }))
  const executeVertoBye = jest.fn()
  const client = {
    logger: {
      debug: jest.fn(),
      warn: jest.fn(),
    },
  } as unknown as WSClient

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const allNotificationListerner = jest.fn()
  const pnNotificationListerner = jest.fn()
  const wsNotificationListerner = jest.fn()

  test('it should invoke the proper listeners', () => {
    const manager = new IncomingCallManager({
      client,
      buildInboundCall,
      executeVertoBye,
    })

    manager.setNotificationHandlers({
      all: allNotificationListerner,
      websocket: wsNotificationListerner,
      pushNotification: pnNotificationListerner,
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'foo1',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    expect(allNotificationListerner).toHaveBeenCalledTimes(1)
    expect(wsNotificationListerner).toHaveBeenCalledTimes(1)
    expect(pnNotificationListerner).toHaveBeenCalledTimes(0)

    manager.handleIncomingInvite({
      source: 'pushNotification',
      callID: 'foo2',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    expect(allNotificationListerner).toHaveBeenCalledTimes(2)
    expect(wsNotificationListerner).toHaveBeenCalledTimes(1)
    expect(pnNotificationListerner).toHaveBeenCalledTimes(1)
  })

  test('it should not answer the call when the invite is rejected', () => {
    const manager = new IncomingCallManager({
      client,
      buildInboundCall,
      executeVertoBye,
    })

    const allNotificationListerner = jest.fn(
      (notification: IncomingCallNotification) => {
        notification.invite.reject()
      }
    )

    manager.setNotificationHandlers({
      all: allNotificationListerner,
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'foo1',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    expect(allNotificationListerner).toHaveBeenCalledTimes(1)
    expect(mockAnswer).toBeCalledTimes(0)
  })

  test('it should answer the call when the invite is accepted', () => {
    const manager = new IncomingCallManager({
      client,
      buildInboundCall,
      executeVertoBye,
    })

    const allNotificationListerner = jest.fn(
      (notification: IncomingCallNotification) => {
        notification.invite.accept({})
      }
    )

    manager.setNotificationHandlers({
      all: allNotificationListerner,
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'foo1',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    expect(allNotificationListerner).toHaveBeenCalledTimes(1)
  })

  test('it should dedupe overlaping listeners', () => {
    const manager = new IncomingCallManager({
      client,
      buildInboundCall,
      executeVertoBye,
    })

    const notificationListerner = jest.fn()
    manager.setNotificationHandlers({
      all: notificationListerner,
      websocket: notificationListerner,
      pushNotification: notificationListerner,
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'foo',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    expect(notificationListerner).toHaveBeenCalledTimes(1)
  })

  test('it should dedupe invites', () => {
    const manager = new IncomingCallManager({
      client,
      buildInboundCall,
      executeVertoBye,
    })

    manager.setNotificationHandlers({
      all: allNotificationListerner,
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'same-id',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'same-id',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    expect(allNotificationListerner).toHaveBeenCalledTimes(1)
  })

  test('it should clean up invites after reject', () => {
    const manager = new IncomingCallManager({
      client,
      buildInboundCall,
      executeVertoBye,
    })

    const notificationListerner = jest.fn(
      (notification: IncomingCallNotification) => {
        notification.invite.reject()
      }
    )
    manager.setNotificationHandlers({
      all: notificationListerner,
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'same-id',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'same-id',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    expect(notificationListerner).toHaveBeenCalledTimes(2)
  })

  test('it should clean up invites after accept', () => {
    const manager = new IncomingCallManager({
      client,
      buildInboundCall,
      executeVertoBye,
    })

    const notificationListerner = jest.fn(
      (notification: IncomingCallNotification) => {
        notification.invite.accept({})
      }
    )
    manager.setNotificationHandlers({
      all: notificationListerner,
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'same-id',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    manager.handleIncomingInvite({
      source: 'websocket',
      callID: 'same-id',
      callee_id_name: 'foo',
      callee_id_number: 'foo',
      caller_id_name: 'foo',
      caller_id_number: 'foo',
      sdp: 'foo',
      display_direction: 'foo',
      nodeId: 'foo',
    })

    expect(notificationListerner).toHaveBeenCalledTimes(2)
  })
})
