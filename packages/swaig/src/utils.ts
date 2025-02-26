import type { FastifyRequest, FastifyReply } from 'fastify'

export const swLogoUrl =
  process.env.SWAIG_SDK_LOGO ??
  'https://developer.signalwire.com/landing-assets/images/logo.svg'

export async function validate(
  username: string,
  password: string,
  req: FastifyRequest,
  _reply: FastifyReply
) {
  if (
    (req.webHookUsername && req.webHookUsername !== username) ||
    (req.webHookPassword && req.webHookPassword !== password)
  ) {
    throw new Error('Unauthorized')
  }
}

export const fetchSWLogo = async (): Promise<Buffer | undefined> => {
  try {
    const response = await fetch(swLogoUrl)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Error fetching the logo', error)
    return undefined
  }
}
