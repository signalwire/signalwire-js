import { useCallback, useEffect, useState } from 'react'
import { Video } from '@signalwire/js'
import { onRoomSessionReady, setRoomSession } from '../store'

export const useCreateRoomSession = () => {
  return useCallback((options) => {
    const room = new Video.RoomSession(options)
    setRoomSession(room.roomSessionId, room)
  }, [])
}

export const useRoomSession = (): [Video.RoomSession | undefined] => {
  const [roomSession, setRoomSession] = useState<Video.RoomSession>()

  useEffect(() => {
    onRoomSessionReady({
      destroyCallback: () => {
        setRoomSession(undefined)
      },
    }).then((room) => {
      console.log('Room Session Ready')
      setRoomSession(room)
    })
  }, [])

  return [roomSession]
}

export const useMemberListUpdated = () => {
  // TODO: Missing Video.VideoMemberListUpdatedParams from js package
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
