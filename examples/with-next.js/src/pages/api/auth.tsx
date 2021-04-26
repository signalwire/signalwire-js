import { NextApiRequest, NextApiResponse } from 'next'

const assertRequiredParams = (body: NextApiRequest['body']) => {
  if (!body.room_name || !body.user_name) {
    return false
  }

  return true
}

const DEFAULT_HOST = process.env.SPACE_HOST || 'dev.swire.io'
const baseUrl = `https://${DEFAULT_HOST}`
const SCOPES = [
  'conference.self.audio_mute',
  'conference.self.audio_unmute',
  'conference.self.video_mute',
  'conference.self.video_unmute',
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

    const authCreds = `${process.env.PROJECT_ID}:${process.env.PROJECT_TOKEN}`

    const response = await fetch(`${baseUrl}/api/video/room_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(authCreds).toString('base64')}`,
      },
      body: JSON.stringify({
        ...reqBody,
        scopes: SCOPES,
      }),
    })

    if (!response.ok) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Unauthorized',
      })
    }

    const data = await response.json()

    res.status(200).json({
      data: {
        ...data,
        projectId: process.env.PROJECT_ID,
      },
    })
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message })
  }
}

export default handler
