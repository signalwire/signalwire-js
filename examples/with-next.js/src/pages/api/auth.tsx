import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@signalwire/node'

const assertRequiredParams = (body: NextApiRequest['body']) => {
  if (!body.room_name || !body.user_name) {
    return false
  }

  return true
}

const SCOPES = [
  'room.self.audio_mute',
  'room.self.audio_unmute',
  'room.self.video_mute',
  'room.self.video_unmute',
]

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const reqBody = JSON.parse(req.body)

    if (!assertRequiredParams(reqBody)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing required body params',
      })
    }

    try {
      const client = createClient({
        projectId: process.env.PROJECT_ID as string,
        projectToken: process.env.PROJECT_TOKEN as string,
      })

      const roomInfo = await client.createRoom({
        name: reqBody.room_name,
      })

      const vrt = await client.createVRT({
        roomName: roomInfo.name,
        userName: reqBody.user_name,
        scopes: SCOPES,
      })

      res.status(200).json({
        data: vrt,
      })
    } catch (e) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Unauthorized',
      })
    }
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message })
  }
}

export default handler
