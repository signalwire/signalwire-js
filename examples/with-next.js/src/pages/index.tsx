import { configureStore } from '@signalwire/core'
import { JoinWidget } from '../components/JoinWidget'
import Layout from '../components/Layout'

const IndexPage = () => {
  return (
    <Layout title='Home | Next.js + VideoSDK Example'>
      <h1>👋</h1>

      <JoinWidget />
    </Layout>
  )
}

export default IndexPage
