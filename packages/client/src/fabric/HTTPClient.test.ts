import { HTTPClient } from './HTTPClient'

describe('HTTPClient', () => {
  it('should return the host value from the token ch header', () => {
    const client = new HTTPClient({
      token:
        'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiY2giOiJwdWMuc3dpcmUuaW8iLCJ0eXAiOiJTQVQifQ..WI4IT6Bny7lfcU8-.lV5QlKfnONM-5FGwmkllyv747du_UB2nLGqGz3WcB4jemGjofhCzLDhJIiMzp7_xtVjHkV-K2DxiiftxWEgwo3cMn3Eo8ICqA0tZ227tGVEuOztOopsmM3CAMUDej5aovPyznw6grkQ3e7VbzwByDFxs0rS9__c1_bZrAHET1PE8AmigjN35ggY2axEHhSpo7P-vtS321Nv4qURQIococCkWhcUIr0NIbOzTDMJqGLfP2AWSFOtVd9tuyamGMZ0tSUC-JICaS-A4-JdHpKLHbaRn6XTyYj0CKeW1DdrI7uvcglVVN2ooLyWAtv__1MnGdnBoDuXKgzqd2JuiCcN3oIYLt9I3bEu2PWPu1nxumP1aJpk6VXrci0x_nRamRtr9zjVsjzK3RdhYY5Gi1q6Pf1UZvNAPv1-hF1vgthG_QLs-T76HCRm6AN0r_wS97xvBAFbSZ5rCbUR2_1fMG4YOz8dfrlF19WIzY7zaAhMhXiuX.AMbl6Ha3VmKkD40vuz3q6Q',
    })
    expect(client.httpHost).toEqual('fabric.swire.io')
  })

  it('should return the host value from the host option', () => {
    const client = new HTTPClient({
      host: 'server.custom.io',
      token:
        'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiY2giOiJwdWMuc3dpcmUuaW8iLCJ0eXAiOiJTQVQifQ..WI4IT6Bny7lfcU8-.lV5QlKfnONM-5FGwmkllyv747du_UB2nLGqGz3WcB4jemGjofhCzLDhJIiMzp7_xtVjHkV-K2DxiiftxWEgwo3cMn3Eo8ICqA0tZ227tGVEuOztOopsmM3CAMUDej5aovPyznw6grkQ3e7VbzwByDFxs0rS9__c1_bZrAHET1PE8AmigjN35ggY2axEHhSpo7P-vtS321Nv4qURQIococCkWhcUIr0NIbOzTDMJqGLfP2AWSFOtVd9tuyamGMZ0tSUC-JICaS-A4-JdHpKLHbaRn6XTyYj0CKeW1DdrI7uvcglVVN2ooLyWAtv__1MnGdnBoDuXKgzqd2JuiCcN3oIYLt9I3bEu2PWPu1nxumP1aJpk6VXrci0x_nRamRtr9zjVsjzK3RdhYY5Gi1q6Pf1UZvNAPv1-hF1vgthG_QLs-T76HCRm6AN0r_wS97xvBAFbSZ5rCbUR2_1fMG4YOz8dfrlF19WIzY7zaAhMhXiuX.AMbl6Ha3VmKkD40vuz3q6Q',
    })
    expect(client.httpHost).toEqual('fabric.custom.io')
  })

  it('should base the host value from default value', () => {
    const client = new HTTPClient({
      token:
        'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwidHlwIjoiU0FUIn0..HV7ITWNVgpVAXymg.7SchDC_tOtLy860sMcSpLhBjN1oBHU8ImVc6sZJBGSyDSflZoGi4sVogyK47R9sNaWS0zNBKZFBNfoFE3AeHZTIgcMgYZqS3kUsdLxZv6dNuHvO_pXOJns5OWf2B5MSHyQrNrVv-WDAaFTo2q4AIHitn5o05SEEoEB8zz52BCfFb9NmuN5MpQHH9GZBcBpRAc-fbKLgG17GqYIpRfoGCgzpvcWOCa_Auwfz9WUdSvjEcO6ZDkOsUJVx6N5oA003gwbdWtX4gMU-lBWKSmkN8o6XTPjfn5wV9X5stdA_A_n4K2qW6gtySdxBZMoP3SrY-t0VKDE00l8Yoy7-e8sV7YH4dXSPfMxvEmhYcHiQIF9je5Urwgy6dwMCVi9KaSCBniHeD9-LK--E2gXeCPCFTN5dpvOtyYidXSRAJbeeGM_iaDnphV9-10dpAMtWcFxtxOxZzzpCgG_w30r6_6wMvGNXrIY0NFgQy1w1371s3mmZs.8uiq7Gl0W4YQHYniuBetoA',
    })
    expect(client.httpHost).toEqual('fabric.signalwire.com')
  })
})
