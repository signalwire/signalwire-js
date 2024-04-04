import { test, expect } from '../../fixtures'
import { 
  SERVER_URL,
  createTestSATToken,
  createVideoRoom,
  createCFClient
} from '../../utils'
import { uuid } from '@signalwire/core'

test.describe('Conversation Room', () => {
  test('send message in a room conversation', async ({ createCustomVanillaPage }) => {
    const page = await createCustomVanillaPage({ name: '[page]' })
    const page2 = await createCustomVanillaPage({
      name: '[page2]'
    })
    await page.goto(SERVER_URL)
    await page2.goto(SERVER_URL)

    const sat1 = await createTestSATToken()
    await createCFClient(page, sat1)
    const sat2 = await createTestSATToken()
    await createCFClient(page2, sat2)

    const roomName = `e2e-js-convo-room_${uuid()}`
    await createVideoRoom(roomName)
    
    const firstMsgEvent = await page.evaluate(({ roomName }) => {
      return new Promise(async (resolve) => {
        // @ts-expect-error
        const client = window._client
        const addresses = await client.addresses.getAddresses({ displayName: roomName })
        const roomAddress = addresses.data[0]
        const addressId = roomAddress.id
        client.conversation.subscribe(resolve)
        client.conversation.sendMessage({
          text: '1st message from 1st subscriber',
          addressId,
        })
      })
    }, { roomName })

    // @ts-expect-error
    expect(firstMsgEvent.type).toBe('message')

    // @ts-expect-error
    const addressId = firstMsgEvent.address_id

    const secondMsgEventPromiseFromPage1 = page.evaluate(() => {
      return new Promise(resolve => {
        // @ts-expect-error
        const client = window._client
        client.conversation.subscribe(resolve)
      })
    })

    const firstMsgEventFromPage2 = await page2.evaluate(({ addressId }) => {
      return new Promise(async (resolve) => {
        // @ts-expect-error
        const client = window._client
        await client.connect()
        client.conversation.subscribe(resolve)
        const result = await client.conversation.getConversations()
        const convo = result.data.filter(c => c.id == addressId)[0]
        convo.sendMessage({
          text: '1st message from 2nd subscriber',
        })
      })
    }, { addressId })

    const secondMsgEventFromPage1 = await secondMsgEventPromiseFromPage1
    expect(secondMsgEventFromPage1).not.toBeUndefined()

    // @ts-expect-error
    expect(secondMsgEventFromPage1.type).toBe('message')
    
    expect(firstMsgEventFromPage2).not.toBeUndefined()
    
    // @ts-expect-error
    expect(firstMsgEventFromPage2.type).toBe('message')

    const messages = await page.evaluate(async ({ addressId }) => {
      // @ts-expect-error
      const client = window._client
      const result = await client.conversation.getConversations()
      const convo = result.data.filter(c => c.id == addressId)[0]
      return await convo.getMessages({})
    }, { addressId })

    expect(messages).not.toBeUndefined()

    expect(messages.data.length).toEqual(2)
    expect(messages.data[0]).toMatchObject({
      "conversation_id": addressId, 
      "details": {}, 
      "id": expect.anything(), 
      "kind": null, 
      "subtype": "chat", 
      "text": "1st message from 2nd subscriber",
      "ts": expect.anything(), 
      "type": "message",
      "user_id": expect.anything()
    })

    expect(messages.data[1]).toMatchObject({
      "conversation_id": addressId, 
      "details": {}, 
      "id": expect.anything(), 
      "kind": null, 
      "subtype": "chat", 
      "text": "1st message from 1st subscriber",
      "ts": expect.anything(), 
      "type": "message",
      "user_id": expect.anything()
    })
  })
})