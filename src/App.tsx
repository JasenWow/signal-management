import { Routes, Route, useParams } from 'react-router'
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
    <Routes>
      <Route path="/" element={<LayoutHome />} />
      <Route path="/tags" element={<Layout><TagsListPage /></Layout>} />
      <Route path="/:messageId" element={<LayoutWithMessageId />} />
    </Routes>
  )
}
