import { useEffect, useState } from 'react'
import { Client } from '@signalwire/web'
import { useAppDispatch } from './AppController'
import { MCU } from './MCU'

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
  const [stream, setStream] = useState<MediaStream>()

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
  const dispatch = useAppDispatch()

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
    const rtcTrack = (event: RTCTrackEvent) => {
      console.debug('RTCTrackEvent', event)
      setStream(event.streams[0])
    }

    call.on('room.started', roomStarted)
    call.on('room.subscribed', roomSubscribed)
    call.on('room.ended', roomEnded)
    call.on('track', rtcTrack)

    call.invite()

    return () => {
      call.off('room.started', roomStarted)
      call.off('room.subscribed', roomSubscribed)
      call.off('room.ended', roomEnded)
    }
  }, [call])

  if (status === 'ready') {
    return (
      <div className='flex flex-col space-y-4'>
        {stream && <MCU stream={stream} />}

        <div className='grid grid-flow-col auto-cols-max gap-2'>
          <button
            onClick={async () => {
              await call.hangup()
              client.disconnect()
              dispatch({ type: 'reset' })
            }}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
          >
            Hangup
          </button>

          <button
            onClick={async () => {
              // TODO: logic for toggling mute/unmute
              call.bladeMute()
            }}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          >
            🔈 <span className='ml-3'>Audio Mute</span>
          </button>

          <button
            onClick={async () => {
              // TODO: logic for toggling mute/unmute
              call.bladeVideoMute()
            }}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-500 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
          >
            🖥 <span className='ml-3'>Video Mute</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <h1>
      📞 <span className='ml-3'>Calling...</span>
    </h1>
  )
}
