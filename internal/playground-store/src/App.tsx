import { useEffect, useRef } from 'react'
import './App.css'
import { MemberList } from './components/MemberList'
import { useCreateRoomSession, useRoomSession } from './hooks/useRoomSession'

const options = {
  host: 'relay.swire.io',
  token: import.meta.env.VITE_PROJECT_TOKEN as string,
  audio: true,
  video: true,
}

function App() {
  const rootEl = useRef<HTMLDivElement>(null)
  const [roomSession] = useRoomSession()
  const createRoomSession = useCreateRoomSession()

  useEffect(() => {
    createRoomSession({
      ...options,
      rootElement: rootEl.current!,
    })
  }, [])

  return (
    <div>
      {/* TODO: we don't have a react-way to identify if the underlying session is active or not since `roomSession.active` is not reactive */}
      <button
        onClick={() => {
          roomSession?.join()
        }}
      >
        Join
      </button>

      <button
        onClick={() => {
          // @ts-expect-error
          roomSession?.hangup()
        }}
      >
        Hangup
      </button>

      {/* If we conditionally render this element we can no longer read the roomSession from the store (???) */}
      <MemberList />
      <div ref={rootEl} />
    </div>
  )
}

export default App
