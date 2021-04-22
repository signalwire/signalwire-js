import { configureStore } from '@signalwire/core'
import { useAppState } from '../components/AppController'
import { JoinWidget } from '../components/JoinWidget'
import Layout from '../components/Layout'

const Steps = () => {
  const state = useAppState()

  if (state.status === 'authorized') {
    return <h1>👋</h1>
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
