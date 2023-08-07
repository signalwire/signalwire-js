import type { FastifyRequest, FastifyReply } from 'fastify'

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
