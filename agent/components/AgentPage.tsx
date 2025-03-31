import { ChatPage } from '@/agent/components/ChatPage'
import { Header } from '@/agent/components/Header'
import { Sidebar } from '@/agent/components/Sidebar'
import { LoginPage } from '@/agent/components/LoginPage'
import cs from 'classnames'
import { useEffect, useState } from 'react'
import { Session } from 'next-auth'
import { Bounce, ToastContainer } from 'react-toastify'

export default function AgentPage({ 
    session, 
    isDesktopScreen 
} : {
    session?: Session,
    isDesktopScreen?: boolean
}) {
  const [isShowSidebar, setIsShowSidebar] = useState(isDesktopScreen)
  const [wasDesktopScreen, setWasDesktopScreen] = useState(isDesktopScreen)
  
  useEffect(
    () => {
        if (!wasDesktopScreen && isDesktopScreen) {
            setIsShowSidebar(true)
        }
        setWasDesktopScreen(isDesktopScreen)
    },
    [isDesktopScreen]
  )

  const isShowSidebarCheckSession = isShowSidebar && session !== null
  return <>
    <ToastContainer
      position="bottom-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
      transition={Bounce}
    />
    <Sidebar session={session} isShowSidebar={isShowSidebarCheckSession} setIsShowSidebar={setIsShowSidebar} />
    <div id='agent-main' className={cs('agent-main', { open: isShowSidebarCheckSession })}>
      <Header 
        session={session} 
        isShowSidebar={isShowSidebar} 
        isDesktopScreen={isDesktopScreen}
        setIsShowSidebar={setIsShowSidebar}
      />
      {
        session != null
        ? <ChatPage />
        : <LoginPage />
      }
    </div>
  </>
}
