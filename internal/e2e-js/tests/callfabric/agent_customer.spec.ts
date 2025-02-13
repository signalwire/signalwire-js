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
  expectPageReceiveAudio,
  getResourceAddresses,
} from '../../utils'

test.describe('CallFabric Agent/Customer interaction, cXML scripts', () => {

  const cXMLScriptAgentContent = {
    call_handler_script: '<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference>4567486</Conference></Dial></Response>'
  }
  const cXMLScriptCustomerContent = {
    call_handler_script: '<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference>4567486</Conference></Dial></Response>'
  }

  test('agent and customer should dial an address linked to a cXML script and expect to join a Conference', async ({
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

    await agent_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

//      await call.start()
      call.start()
    })
  
    console.log("Address dialled by Agent...")
    // const expectInitialEventsForAgent = expectCFInitialEvents(agent_page, [])
    // console.log("After CF Initial events for agent...")



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

    // Time to retrieve the cXML script address(es)
    const resource_addresses = await getResourceAddresses(customer_resource_data.id)
    const allowed_addresses: string[] = resource_addresses.data.map((address: { id: any }) => address.id ?? '')

    console.log("Allowed addresses: ", allowed_addresses, " <---------------")

    await createGuestCFClient(customer_page, { allowed_addresses: allowed_addresses})

    // Dial the resource address
    await dialAddress(customer_page, {
      address: `/private/${customerResourceName}`, // or /public/?
      shouldWaitForJoin: false,
      shouldStartCall: false,
      dialOptions: { logLevel: 'debug', debug: { logWsTraffic: true }}
    })

    await customer_page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })

    console.log("Address dialled by Customer...")
    // const expectInitialEventsForCustomer = expectCFInitialEvents(customer_page, [])
    // console.log("After CF Initial events for customer...")




    //    await expectInitialEventsForAgent
//    await expectInitialEventsForCustomer





    console.log("Expect to receive audio...")
    await expectPageReceiveAudio(agent_page)
    await expectPageReceiveAudio(customer_page)

    console.log("Expect final events...")
    await expectCFFinalEvents(agent_page)
    await expectCFFinalEvents(customer_page)

    console.log("Should do something or hang up...")
    // hangup???
  })
})
