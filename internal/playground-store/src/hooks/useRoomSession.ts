import { useEffect, useState } from 'react'
import { Video } from '@signalwire/js'
import { onRoomSessionReady, setRoomSession } from '../store'

export const useCreateRoomSession = (options: any) => {
  const [roomSession] = useState<Video.RoomSession>(
    () => new Video.RoomSession(options)
  )

  useEffect(() => {
    setRoomSession(roomSession.roomSessionId, roomSession)
  }, [])

  return roomSession
}

export const useRoomSession = (): [Video.RoomSession | undefined] => {
  const [roomSession, setRoomSession] = useState<Video.RoomSession>()
  useEffect(() => {
    onRoomSessionReady().then((room) => {
      setRoomSession(room)
    })
  }, [])

  return [roomSession]
}

export const useMemberListUpdated = () => {
  // Video.VideoMemberListUpdatedParams
  const [data, setData] = useState<any>()
  const [roomSession] = useRoomSession()

  useEffect(() => {
    if (roomSession) {
      roomSession.on('memberList.updated', (data) => {
        setData(data)
      })
    }
  }, [roomSession])

  return data
}
