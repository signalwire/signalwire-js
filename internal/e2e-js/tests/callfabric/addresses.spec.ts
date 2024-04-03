import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient } from '../../utils'

test.describe('Addresses', () => {
  test('query multiple addresses and single address', async ({
    createCustomVanillaPage,
  }) => {
    const page = await createCustomVanillaPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    const { address, addressToCompare } = await page.evaluate(async () => {
      // @ts-expect-error
      const client = window._client

      const addresses = await client.addresses.getAddresses()

      const addressToCompare = addresses[0]

      const address = await client.addresses.getAddress({ addressId: addressToCompare.id })
      return { address, addressToCompare }
    })

    expect(address.id).toEqual(addressToCompare.id)
  })
})
