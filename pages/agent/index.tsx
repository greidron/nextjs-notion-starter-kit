import { ChatPage } from '@/agent/components/ChatPage'
import { Header } from '@/agent/components/Header'
import { Sidebar } from '@/agent/components/Sidebar'
import { LoginPage } from '@/agent/components/LoginPage'
import { getSession, SessionProvider } from 'next-auth/react'
import cs from 'classnames'

export const getServerSideProps = async ({ req }) => {
  return {
    props: {
      session: await getSession({ req })
    }
  }
}

export default function AgentApplication({ session }) {
  return <>
    <Sidebar session={session} />
    <div id='agent-main' className={cs('agent-main')}>
      <Header session={session} />
      {
        session != null
        ? <ChatPage />
        : <LoginPage />
      }
    </div>
  </>
}
