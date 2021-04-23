import { useEffect, useState } from 'react'
import { Client } from '@signalwire/web'

interface VideoWidgetProps {
  client: Client
  roomName: string
  userName: string
}

export const VideoWidget = ({
  client,
  roomName,
  userName,
}: VideoWidgetProps) => {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [call] = useState(() =>
    client.rooms.makeCall({
      destinationNumber: roomName,
      callerName: userName,
      audio: true,
      video: true,
      experimental: true,
      // TODO:
      callerNumber: 'john@doe.com',
    })
  )

  useEffect(() => {
    const roomStarted = (params: any) => {
      console.debug('room.started', params)
    }
    const roomSubscribed = () => {
      setStatus('ready')
    }
    const roomEnded = (params: any) => {
      console.debug('room.ended', params)
    }

    call.on('room.started', roomStarted)
    call.on('room.subscribed', roomSubscribed)
    call.on('room.ended', roomEnded)

    call.invite()

    return () => {
      call.off('room.started', roomStarted)
      call.off('room.subscribed', roomSubscribed)
      call.off('room.ended', roomEnded)
    }
  }, [call])

  if (status === 'ready') {
    return (
      <button
        onClick={async () => {
          await call.hangup()
          client.disconnect()
        }}
        className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
      >
        Hangup
      </button>
    )
  }

  return <h1>Calling...</h1>
}
