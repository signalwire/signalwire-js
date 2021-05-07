import { rest } from 'msw'
import { RoomResponse } from '../src/types'

export const handlers = [
  rest.get<RoomResponse>(`*/video/rooms/:id`, (req, res, ctx) => {
    if (req.headers.get('authorization')?.includes('invalid')) {
      return res(ctx.status(401))
    } else if (req.params.id === 'non-existing-id') {
      return res(ctx.status(404))
    }

    return res(
      ctx.json({
        id: '63df00d5-85a7-4633-82e2-6d61d8143dfb',
        name: 'karaoke_night',
        display_name: 'Mandatory Fun Activities',
        max_participants: 5,
        delete_on_end: false,
        starts_at: '2021-04-27T19:40:21Z',
        ends_at: '2021-04-27T19:55:21Z',
        created_at: '2021-04-27T19:35:21Z',
        updated_at: '2021-04-27T19:35:21Z',
      })
    )
  }),
]
