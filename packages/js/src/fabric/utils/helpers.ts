interface EncodeAuthStateParams {
  authState?: string
  protocol?: string
  callId?: string
}

export const encodeAuthState = (params: EncodeAuthStateParams): string => {
  try {
    const json = JSON.stringify(params)
    let encoded: string

    // For Node JS environment
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      encoded = Buffer.from(json, 'utf-8').toString('base64')
    }
    // For Browser environment
    else if (
      typeof window !== 'undefined' &&
      window.btoa &&
      window.TextEncoder
    ) {
      const utf8Bytes = new TextEncoder().encode(json)
      let binary = ''
      utf8Bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      encoded = window.btoa(binary)
    } else {
      throw new Error('No suitable Base64 encoding method available.')
    }
    return encoded
  } catch (error) {
    throw new Error(
      `Encoding failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const decodeAuthState = (authState: string): EncodeAuthStateParams => {
  try {
    let json: string

    // For Node JS environment
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      json = Buffer.from(authState, 'base64').toString('utf-8')
    }
    // For Browser environment
    else if (
      typeof window !== 'undefined' &&
      window.atob &&
      window.TextDecoder
    ) {
      const binary = window.atob(authState)
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
      json = new TextDecoder().decode(bytes)
    } else {
      throw new Error('No suitable Base64 decoding method available.')
    }
    return JSON.parse(json)
  } catch (error) {
    throw new Error(
      `Decoding failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}
