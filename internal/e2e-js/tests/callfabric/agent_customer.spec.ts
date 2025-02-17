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


  // TODO: external URL approach


test.describe('CallFabric Agent/Customer interaction, static cXML scripts', () => {

  const conference_name = `e2e-cxml-script-conference_${uuid()}`

  // TODO: Dedicated callbacks
  const cXMLScriptAgentContent = {
    call_handler_script: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference>${conference_name}</Conference></Dial></Response>`
  }
  const cXMLScriptCustomerContent = {
    call_handler_script: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference>${conference_name}</Conference></Dial></Response>`
  }

  test('agent and customer should dial an address linked to a static cXML script and expect to join a Conference', async ({
    createCustomPage,
    resource,
  }) => {
    // Agent
    const agent_page = await createCustomPage({ name: '[agent_page]' })
    await agent_page.goto(SERVER_URL)

    const agentResourceName = `e2e-cxml-script-agent_${uuid()}`
    const agent_resource_data = await resource.createcXMLScriptResource({
      name: agentResourceName,
      contents: cXMLScriptAgentContent,
    })

    expect(agent_resource_data.cxml_application?.id).toBeDefined()

    await createCFClient(agent_page)

    await dialAddress(agent_page, {
      address: `/private/${agentResourceName}`, // or /public/?
      shouldWaitForJoin: false,
      shouldStartCall: false,
      dialOptions: { logLevel: 'debug', debug: { logWsTraffic: true }}
    })

    const expectInitialEventsForAgent = expectCFInitialEvents(agent_page, [])
    await agent_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })
  
    console.log("Address dialled by Agent...")
    expectInitialEventsForAgent
    console.log("After CF Initial events for agent...")

    console.log('--------- creating customer ------------------')
    // Customer
    const customer_page = await createCustomPage({ name: '[customer_page]' })
    await customer_page.goto(SERVER_URL)

    const customerResourceName = `e2e-cxml-script-customer_${uuid()}`
    const customer_resource_data = await resource.createcXMLScriptResource({
      name: customerResourceName,
      contents: cXMLScriptCustomerContent,
    })

    expect(customer_resource_data.id).toBeDefined()
    const resource_addresses = await getResourceAddresses(customer_resource_data.id)
    const allowed_addresses: string[] = resource_addresses.data.map((address: { id: any }) => address.id ?? '')

    console.log("Allowed addresses: ", allowed_addresses, " <---------------")

    await createGuestCFClient(customer_page, { allowed_addresses: allowed_addresses})

    await dialAddress(customer_page, {
      address: `/private/${customerResourceName}`, // or /public/?
      shouldWaitForJoin: false,
      shouldStartCall: false,
      dialOptions: { logLevel: 'debug', debug: { logWsTraffic: true }}
    })

    // Let the Agent wait a little before the Customer joins
    await new Promise((r) => setTimeout(r, 2000))

    const expectInitialEventsForCustomer = expectCFInitialEvents(customer_page, [])
    await customer_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })
    await expectInitialEventsForCustomer

    console.log("________ CALL IS IN PROGRESS ________________")

    // 5 seconds' call
    await new Promise((r) => setTimeout(r, 5000))

    console.log("Expect to have received audio...")
    await expectTotalAudioEnergyToBeGreaterThan(agent_page, 0.15)
    await expectTotalAudioEnergyToBeGreaterThan(customer_page, 0.15)

    console.log("Test done - hanging up customer")

    await customer_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.hangup()
    })

    console.log("Test done - hanging up agent")

    await agent_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.hangup()
    })

    // console.log("Expect final events for customer...")
    // await expectCFFinalEvents(customer_page)
    // console.log("Expect final events for agent...")
    // await expectCFFinalEvents(agent_page)
  })
})
