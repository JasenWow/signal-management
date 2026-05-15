import { Switch, Route, useParams } from 'react-router-dom'
import { Layout } from './pages/layout'
import { MessageShowPage } from './pages/message/show'
import { TagsListPage } from './pages/tags/list'

function LayoutWithMessageId() {
  const { messageId } = useParams<{ messageId: string }>()
  void messageId
  return (
    <Layout>
      <MessageShowPage />
    </Layout>
  )
}

function LayoutHome() {
  return (
    <Layout>
      <MessageShowPage />
    </Layout>
  )
}

export default function App() {
  return (
    <Switch>
      <Route exact path="/" render={() => <LayoutHome />} />
      <Route path="/tags" render={() => <Layout><TagsListPage /></Layout>} />
      <Route path="/:messageId" render={() => <LayoutWithMessageId />} />
    </Switch>
  )
}
