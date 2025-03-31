import AgentPage from '@/agent/components/AgentPage'
import { Session } from 'next-auth'
import { getSession } from 'next-auth/react'
import { useState, useEffect, useMemo } from 'react'

export const getServerSideProps = async ({ req }) => {
  return {
    props: {
      session: await getSession({ req })
    }
  }
}

export default function AgentApplication({
  session
} : {
  session?: Session
}) {
  const [windowSize, setWindowSize] = useState(null)
  const isDesktopScreen = windowSize && windowSize.width >= 768

  useEffect(
    () => {
      const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      handleResize()
      window.addEventListener('resize', handleResize)
    },
    []
  )
  return windowSize !== null
    ? <AgentPage session={session} isDesktopScreen={isDesktopScreen} />
    : null
}
