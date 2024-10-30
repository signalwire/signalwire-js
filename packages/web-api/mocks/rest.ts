import { http as rest, HttpResponse} from 'msw'

export const handlers = [
  rest.get(`*/video/rooms/:id`, async ({request: req, params, }) => {

    if (params.id === 'timeout') {
      await new Promise((r) => setTimeout(r, 100000))
    } else if (req.headers.get('authorization')?.includes('invalid')) {
      return HttpResponse.text('Unauthorized',
        {
          status: 401,
          statusText: 'Unauthorized',
        },
      )
    } else if (params.id === 'non-existing-id') {
      return HttpResponse.text('Not Found',
        {
          status: 404,
          statusText: 'Not Found',
        },
      )
    }

    return HttpResponse.json({
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
    
  }),
]
