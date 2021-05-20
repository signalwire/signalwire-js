import { useEffect, useState, useRef } from 'react'
import { Video } from '@signalwire/web'
import { useAppDispatch } from './AppController'
import { MCU } from './MCU'

interface VideoWidgetProps {
  client: Video.Client
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
  const audioMuted = useRef<boolean>(false)
  const videoMuted = useRef<boolean>(false)

  const [call] = useState(() => {
    return client.rooms.makeCall({
      destinationNumber: roomName,
      callerName: userName,
      audio: true,
      video: true,
      // TODO:
      callerNumber: 'john@doe.com',
    })
  })
  const dispatch = useAppDispatch()

  useEffect(() => {
    const roomStarted = (params: any) => {
      console.log('room.started', JSON.stringify(params, null, 2))
    }
    const roomSubscribed = () => {
      setStatus('ready')
    }
    const roomEnded = (params: any) => {
      console.log('room.ended', JSON.stringify(params, null, 2))
    }
    const rtcTrack = (event: RTCTrackEvent) => {
      console.log('RTCTrackEvent', event)
      setStream(event.streams[0])
    }
    const memberUpdated = (params: any) => {
      console.log('memberUpdated', JSON.stringify(params, null, 2))
      const { member } = params
      if (member?.id === call.memberId) {
        const { updated = [] } = member
        if (updated.includes('audio_muted')) {
          audioMuted.current = member.audio_muted
        }
        if (updated.includes('video_muted')) {
          videoMuted.current = member.video_muted
        }
      }
    }

    call.on('room.started', roomStarted)
    call.on('room.subscribed', roomSubscribed)
    call.on('room.ended', roomEnded)
    call.on('track', rtcTrack)
    call.on('member.updated', memberUpdated)

    call.invite()

    return () => {
      call.off('room.started', roomStarted)
      call.off('room.subscribed', roomSubscribed)
      call.off('room.ended', roomEnded)
      call.off('track', rtcTrack)
      call.off('member.updated', memberUpdated)
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
              const promise = audioMuted.current
                ? call.audioUnmute()
                : call.audioMute()
              try {
                await promise
                audioMuted.current = !audioMuted.current
              } catch (error) {
                console.error('Toggle Audio', error)
              }
            }}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          >
            🎤 <span className='ml-3'>Toggle Audio</span>
          </button>

          <button
            onClick={async () => {
              const promise = videoMuted.current
                ? call.videoUnmute()
                : call.videoMute()
              try {
                await promise
                videoMuted.current = !videoMuted.current
              } catch (error) {
                console.error('Toggle Video', error)
              }
            }}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-500 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
          >
            🖥 <span className='ml-3'>Toggle Video</span>
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
