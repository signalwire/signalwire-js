import { Client, createSession } from '@signalwire/web'
import { useEffect, useState } from 'react'
import { useAppState } from '../components/AppController'
import { JoinWidget } from '../components/JoinWidget'
import Layout from '../components/Layout'

const Steps = () => {
  const state = useAppState()
  const [client, setClient] = useState<Client>()

  useEffect(() => {
    if (state.status === 'authorized' && !client) {
      createSession({
        host: 'relay.swire.io',
        project: state.projectId,
        token: state.token,
        autoConnect: true,
        onReady: async () => {
          console.debug('Session Ready')
        },
      }).then((c) => {
        setClient(c)
      })
    }
  }, [state])

  if (state.status === 'authorized') {
    if (client) {
      return <div>Client ready! {console.log(client)}</div>
    }

    return <h1>💈 Connecting</h1>
  }

  return <JoinWidget />
}

const IndexPage = () => {
  return (
    <Layout title='Home | Next.js + VideoSDK Example'>
      <Steps />
    </Layout>
  )
}

export default IndexPage
