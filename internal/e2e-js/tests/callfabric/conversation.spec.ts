import { uuid } from '@signalwire/core'
import {
  SignalWireClient,
  ConversationMessageEventParams,
} from '@signalwire/js'
import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient } from '../../utils'

// FIXME: Enable this test once the issue with conversation APIs is resolved
test.describe.skip('Conversation Room', () => {
  test('send message in a room conversation', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    const page2 = await createCustomPage({
      name: '[page2]',
    })
    await page.goto(SERVER_URL)
    await page2.goto(SERVER_URL)

    await createCFClient(page)
    await createCFClient(page2)

    const roomName = `e2e-js-convo-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    const firstMsgEvent = await page.evaluate(
      ({ roomName }) => {
        return new Promise<ConversationMessageEventParams>(async (resolve) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client
          const addresses = await client.address.getAddresses({
            displayName: roomName,
          })
          const roomAddress = addresses.data[0]
          const addressId = roomAddress.id
          // Note: subscribe will trigger for call logs too
          // we need to make sure call logs don't resolve promise
          client.conversation.subscribe((event) => {
            if (event.subtype == 'chat') {
              resolve(event)
            }
          })
          client.conversation.sendMessage({
            text: '1st message from 1st subscriber',
            addressId,
          })
        })
      },
      { roomName }
    )

    expect(firstMsgEvent.type).toBe('message')

    const addressId = firstMsgEvent.address_id

    const secondMsgEventPromiseFromPage1 = page.evaluate(() => {
      return new Promise<ConversationMessageEventParams>((resolve) => {
        // @ts-expect-error
        const client: SignalWireClient = window._client
        // Note: subscribe will trigger for call logs too
        // we need to make sure call logs don't resolve promise
        client.conversation.subscribe((event) => {
          // Note we need to do this
          if (event.subtype == 'chat') {
            resolve(event)
          }
        })
      })
    })

    const firstMsgEventFromPage2 = await page2.evaluate(
      ({ addressId }) => {
        return new Promise<ConversationMessageEventParams>(async (resolve) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client
          // Note: subscribe will trigger for call logs too
          // we need to make sure call logs don't resolve promise
          client.conversation.subscribe((event) => {
            if (event.subtype == 'chat') {
              resolve(event)
            }
          })
          const result = await client.conversation.getConversations()
          const convo = result.data.filter((c) => c.id == addressId)[0]
          convo.sendMessage({
            text: '1st message from 2nd subscriber',
          })
        })
      },
      { addressId }
    )

    const secondMsgEventFromPage1 = await secondMsgEventPromiseFromPage1
    expect(secondMsgEventFromPage1).not.toBeUndefined()

    expect(secondMsgEventFromPage1.type).toBe('message')

    expect(firstMsgEventFromPage2).not.toBeUndefined()

    expect(firstMsgEventFromPage2.type).toBe('message')

    const messages = await page.evaluate(
      async ({ addressId }) => {
        // @ts-expect-error
        const client: SignalWireClient = window._client
        const result = await client.conversation.getConversations()
        const convo = result.data.filter((c) => c.id == addressId)[0]
        return await convo.getMessages({})
      },
      { addressId }
    )

    expect(messages).not.toBeUndefined()

    // Note: even though we are only sending 2 messages
    // there can be call logs inside the messages
    expect(messages.data.length).toBeGreaterThanOrEqual(2)

    expect(messages.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conversation_id: addressId,
          details: {},
          id: expect.anything(),
          kind: null,
          subtype: 'chat',
          text: '1st message from 2nd subscriber',
          ts: expect.anything(),
          type: 'message',
          user_id: expect.anything(),
        }),
        expect.objectContaining({
          conversation_id: addressId,
          details: {},
          id: expect.anything(),
          kind: null,
          subtype: 'chat',
          text: '1st message from 1st subscriber',
          ts: expect.anything(),
          type: 'message',
          user_id: expect.anything(),
        }),
      ])
    )
  })
})
