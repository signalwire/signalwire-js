import type { FastifyRequest, FastifyReply } from 'fastify'
import fetch from 'node-fetch'

export const swLogoUrl = process.env.SWAIG_SDK_LOGO ??
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

export const fetchSWLogo = async () => {
  try {
    const response = await fetch(swLogoUrl)

    const buffer = await response.buffer()

    return buffer
  } catch (error) {
    console.log('Error fetching the logo', error)
    return
  }
}
