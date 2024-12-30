import { IncomingCallManager } from './IncomingCallManager'
import { IncomingCallNotification } from './types'

describe('IncomingCallManager', () => {
  const answer = jest.fn()
  const buildCall = () => ({ answer })
  const rejectCall = jest.fn().mockResolvedValue(null)

  beforeAll(() => {
    jest.resetAllMocks()
  })

  test('It should invoke the proper listeners', () => {
    //@ts-ignore
    const manager = new IncomingCallManager(buildCall, rejectCall)
    const allNotificationListerner = jest.fn()
    const pnNotificationListerner = jest.fn()
    const wsNotificationListerner = jest.fn()

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

  test('It should not answer the call when the invite is rejected', () => {
    //@ts-ignore
    const manager = new IncomingCallManager(buildCall, rejectCall)
    const allNotificationListerner = jest.fn(
      (notification: IncomingCallNotification) => {
        notification.invite.reject()
      }
    )

    manager.setNotificationHandlers({
      //@ts-ignore
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
    expect(answer).toBeCalledTimes(0)
  })

  test('It should answer the call when the invite is accepted', () => {
    //@ts-ignore
    const manager = new IncomingCallManager(buildCall, rejectCall)
    //@ts-ignore
    const allNotificationListerner = jest.fn(
      (notification: IncomingCallNotification) => {
        notification.invite.accept({})
      }
    )

    manager.setNotificationHandlers({
      //@ts-ignore
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
    expect(answer).toBeCalledTimes(1)
  })

  test('It should dedupe overlaping listeners', () => {
    //@ts-ignore
    const manager = new IncomingCallManager(buildCall, rejectCall)
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

  test('It should dedupe invites', () => {
    //@ts-ignore
    const manager = new IncomingCallManager(buildCall, rejectCall)
    const notificationListerner = jest.fn()
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

    expect(notificationListerner).toHaveBeenCalledTimes(1)
  })

  test('It should clean up invites after reject', () => {
    //@ts-ignore
    const manager = new IncomingCallManager(buildCall, rejectCall)
    const notificationListerner = jest.fn(
      (notification: IncomingCallNotification) => {
        notification.invite.reject()
      }
    )
    manager.setNotificationHandlers({
      //@ts-ignore
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

  test('It should clean up invites after accept', () => {
    //@ts-ignore
    const manager = new IncomingCallManager(buildCall, rejectCall)
    //@ts-ignore
    const notificationListerner = jest.fn(
      (notification: IncomingCallNotification) => {
        notification.invite.accept({})
      }
    )
    manager.setNotificationHandlers({
      //@ts-ignore
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
