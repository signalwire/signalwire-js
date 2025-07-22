import { uuid } from '@signalwire/core'
import { test } from '../../fixtures'
import { expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  createGuestCFClient,
  dialAddress,
  expectCFFinalEvents,
  expectCFInitialEvents,
  expectTotalAudioEnergyToBeGreaterThan,
  getResourceAddresses,
} from '../../utils'

const agent_customer_static_scripts_desc =
  'CallCall Agent/Customer interaction, static cXML scripts'
test.describe(agent_customer_static_scripts_desc, () => {
  const conference_name = `e2e_${uuid()}`

  const cXMLScriptAgentContent = {
    call_handler_script: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference>${conference_name}</Conference></Dial></Response>`,
  }
  const cXMLScriptCustomerContent = {
    call_handler_script: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference>${conference_name}</Conference></Dial></Response>`,
  }

  test('agent and customer should dial an address linked to a static cXML script and expect to join a Conference', async ({
    createCustomPage,
    resource,
  }) => {
    // Agent
    const agent_page = await createCustomPage({ name: '[agent_page]' })
    await agent_page.goto(SERVER_URL)

    const agentResourceName = `e2e_${uuid()}`
    const agent_resource_data = await resource.createcXMLScriptResource({
      name: agentResourceName,
      contents: cXMLScriptAgentContent,
    })

    expect(agent_resource_data.cxml_script?.id).toBeDefined()

    await createCFClient(agent_page)

    await dialAddress(agent_page, {
      address: `/public/${agentResourceName}`, // or /public/?
      shouldWaitForJoin: false,
      shouldStartCall: false,
    })

    const expectInitialEventsForAgent = expectCFInitialEvents(agent_page, [])
    await agent_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.start()
    })

    console.log('Address dialled by Agent...')
    expectInitialEventsForAgent
    console.log('After CF Initial events for agent...')

    console.log('--------- creating customer ------------------')
    // Customer
    const customer_page = await createCustomPage({ name: '[customer_page]' })
    await customer_page.goto(SERVER_URL)

    const customerResourceName = `e2e_${uuid()}`
    const customer_resource_data = await resource.createcXMLScriptResource({
      name: customerResourceName,
      contents: cXMLScriptCustomerContent,
    })

    expect(customer_resource_data.id).toBeDefined()
    const resource_addresses = await getResourceAddresses(
      customer_resource_data.id
    )
    const allowed_addresses: string[] = resource_addresses.data.map(
      (address: { id: any }) => address.id ?? ''
    )

    console.log('Allowed addresses: ', allowed_addresses, ' <---------------')

    await createGuestCFClient(customer_page, {
      allowed_addresses: allowed_addresses,
    })

    await dialAddress(customer_page, {
      address: `/public/${customerResourceName}`, // or /public/?
      shouldWaitForJoin: false,
      shouldStartCall: false,
    })

    // Let the Agent wait a little before the Customer joins
    await customer_page.waitForTimeout(2000)

    const expectInitialEventsForCustomer = expectCFInitialEvents(
      customer_page,
      []
    )
    await customer_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.start()
    })
    await expectInitialEventsForCustomer

    // 5 seconds' call
    await customer_page.waitForTimeout(5000)

    console.log('Expect to have received audio...')
    await expectTotalAudioEnergyToBeGreaterThan(agent_page, 0.15)
    await expectTotalAudioEnergyToBeGreaterThan(customer_page, 0.15)

    // Attach final listeners
    const customerFinalEvents = expectCFFinalEvents(customer_page)
    const agentFinalEvents = expectCFFinalEvents(agent_page)

    console.log('Test done - hanging up customer')

    await customer_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.hangup()
    })

    console.log('Test done - hanging up agent')

    await agent_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.hangup()
    })

    await Promise.all([customerFinalEvents, agentFinalEvents])

    console.log('Test done -', agent_customer_static_scripts_desc)
  })
})

const agent_customer_external_url_desc =
  'CallCall Agent/Customer interaction, cXML with external URL'
test.describe(agent_customer_external_url_desc, () => {
  const external_url_for_cxml = process.env.EXTERNAL_URL_FOR_CXML

  const cXMLExternalURLAgent = {
    primary_request_url: external_url_for_cxml,
  }
  const cXMLExternalURLCustomer = {
    primary_request_url: external_url_for_cxml,
  }

  // const test_uuid = `${uuid()}`

  test('agent and customer should dial an address linked to a cXML script with external URL and expect to join a Conference', async ({
    createCustomPage,
    resource,
  }) => {
    // Agent
    const agent_page = await createCustomPage({ name: '[agent_page]' })
    await agent_page.goto(SERVER_URL)

    const agentResourceName = `e2e_${uuid()}`
    const agent_resource_data = await resource.createcXMLExternalURLResource({
      name: agentResourceName,
      contents: cXMLExternalURLAgent,
    })

    expect(agent_resource_data.cxml_webhook?.id).toBeDefined()

    await createCFClient(agent_page)

    await dialAddress(agent_page, {
      address: `/public/${agentResourceName}`, // or /public/?
      shouldWaitForJoin: false,
      shouldStartCall: false,
    })

    const expectInitialEventsForAgent = expectCFInitialEvents(agent_page, [])
    await agent_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.start()
    })

    console.log('Address dialled by Agent...')
    expectInitialEventsForAgent
    console.log('After CF Initial events for agent...')

    console.log('--------- creating customer ------------------')
    // Customer
    const customer_page = await createCustomPage({ name: '[customer_page]' })
    await customer_page.goto(SERVER_URL)

    const customerResourceName = `e2e_${uuid()}`
    const customer_resource_data = await resource.createcXMLExternalURLResource(
      {
        name: customerResourceName,
        contents: cXMLExternalURLCustomer,
      }
    )

    expect(customer_resource_data.id).toBeDefined()
    const resource_addresses = await getResourceAddresses(
      customer_resource_data.id
    )
    const allowed_addresses: string[] = resource_addresses.data.map(
      (address: { id: any }) => address.id ?? ''
    )

    console.log('Allowed addresses: ', allowed_addresses, ' <---------------')

    await createGuestCFClient(customer_page, {
      allowed_addresses: allowed_addresses,
    })

    await dialAddress(customer_page, {
      address: `/public/${customerResourceName}`, // or /public/?
      shouldWaitForJoin: false,
      shouldStartCall: false,
    })

    // Let the Agent wait a little before the Customer joins
    await new Promise((r) => setTimeout(r, 2000))

    const expectInitialEventsForCustomer = expectCFInitialEvents(
      customer_page,
      []
    )
    await customer_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.start()
    })
    await expectInitialEventsForCustomer

    // 5 seconds' call
    await customer_page.waitForTimeout(5000)

    console.log('Expect to have received audio...')
    await expectTotalAudioEnergyToBeGreaterThan(agent_page, 0.15)
    await expectTotalAudioEnergyToBeGreaterThan(customer_page, 0.15)

    // Attach final listeners
    const customerFinalEvents = expectCFFinalEvents(customer_page)
    const agentFinalEvents = expectCFFinalEvents(agent_page)

    console.log('Test done - hanging up customer')

    await customer_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.hangup()
    })

    console.log('Test done - hanging up agent')

    await agent_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.hangup()
    })

    await Promise.all([customerFinalEvents, agentFinalEvents])
    console.log('Test done -', agent_customer_external_url_desc)
  })
})

// TODO: Enable when ready
// const customer_stream_desc = 'CallCall Customer connecting to stream'
// test.describe(customer_stream_desc, () => {
//   test('customer should dial an address linked to a cXML script connecting to a conference with stream', async ({
//     createCustomPage,
//     resource,
//   }) => {

//     const conference_name = `e2e_${uuid()}`
//     const stream_url = `${process.env.CXML_STREAM_URL}`

//     const cXMLScriptCustomerContent = {
//      call_handler_script: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference addStream="true" streamUrl="${stream_url}">${conference_name}</Conference></Dial></Response>`
//    }

//     console.log('--------- creating customer ------------------')
//     // Customer
//     const customer_page = await createCustomPage({ name: '[customer_page]' })
//     await customer_page.goto(SERVER_URL)

//     const customerResourceName = `e2e_${uuid()}`
//     const customer_resource_data = await resource.createcXMLScriptResource({
//       name: customerResourceName,
//       contents: cXMLScriptCustomerContent,
//     })

//     expect(customer_resource_data.id).toBeDefined()
//     const resource_addresses = await getResourceAddresses(customer_resource_data.id)
//     const allowed_addresses: string[] = resource_addresses.data.map((address: { id: any }) => address.id ?? '')

//     console.log("Allowed addresses: ", allowed_addresses, " <---------------")

//     await createGuestCFClient(customer_page, { allowed_addresses: allowed_addresses})

//     await dialAddress(customer_page, {
//       address: `/private/${customerResourceName}`, // or /public/?
//       shouldWaitForJoin: false,
//       shouldStartCall: false
//     })

//     const expectInitialEventsForCustomer = expectCFInitialEvents(customer_page, [])
//     await customer_page.evaluate(async () => {
//       // @ts-expect-error
//       const call = window._callObj

//       await call.start()
//     })
//     await expectInitialEventsForCustomer

//     // 10 seconds' call
//     await customer_page.waitForTimeout(10000)

//     console.log("Expect to have received some audio...")
//     await expectTotalAudioEnergyToBeGreaterThan(customer_page, 0.01)

//     // Attach final listeners
//     const customerFinalEvents = expectCFFinalEvents(customer_page)

//     console.log("Test done - hanging up customer")

//     await customer_page.evaluate(async () => {
//       // @ts-expect-error
//       const call = window._callObj

//       await call.hangup()
//     })

//     await customerFinalEvents
//     console.log("Test done -", customer_stream_desc)
//   })
// })
