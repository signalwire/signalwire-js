import { Video } from '@signalwire/js'
import { useRef } from 'react'
import './App.css'
import { MemberList } from './components/MemberList'
import { useRoomSession } from './hooks/useRoomSession'
import { setRoomSession } from './store'

const options = {
  host: 'relay.swire.io',
  token: import.meta.env.VITE_PROJECT_TOKEN as string,
  audio: true,
  video: true,
}

function App() {
  const rootEl = useRef<HTMLDivElement>(null)
  const [roomSession] = useRoomSession()

  return (
    <div>
      {!roomSession && (
        <button
          onClick={() => {
            const room = new Video.RoomSession({
              ...options,
              rootElement: rootEl.current!,
            })
            setRoomSession(room.roomSessionId, room)
            room.join()
          }}
        >
          Join
        </button>
      )}

      {roomSession && (
        <button
          onClick={() => {
            // @ts-expect-error
            roomSession?.hangup()
          }}
        >
          Hangup
        </button>
      )}
      <MemberList />
      <div ref={rootEl} />
    </div>
  )
}

export default App
