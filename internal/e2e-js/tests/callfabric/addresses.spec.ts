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

      const response = await client.address.getAddresses()
      const addressToCompare = response.data[0]

      const address = await client.address.getAddress({ addressId: addressToCompare.id })
      return { address, addressToCompare }
    })

    expect(address.id).toEqual(addressToCompare.id)
  })
})
