import { cache } from './storage'
import GitHubProvider from 'next-auth/providers/github'
import { githubAppClientId, githubAppClientSecret, nextAuthSecret } from '@/lib/config'
import { addUser, getUserId } from '@/agent/lib/user'
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { AgentApiRequest, AgentSession, UnaryOperator } from './types'

const SESSION_PREFIX = 'session'

export function setCredentialData({ id, clientIp }): Promise<boolean> {
    return cache.set(`${SESSION_PREFIX}/${id}`, { clientIp })
}

export function getCredentialData(id: string): Promise<any> {
    return cache.get(`${SESSION_PREFIX}/${id}`)
}

export async function getSession(req: NextApiRequest, res: NextApiResponse): Promise<AgentSession | null> {
    const session = await getServerSession(req, res, getAuthOptions(req))
    if (session === null) {
      return null
    }
    return { ...session, id: getUserId(session) }
}

export function withSession(): UnaryOperator<NextApiHandler> {
  return (handler: NextApiHandler) => async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res)
    if (!session) {
      return res.status(401).json({ error: 'cannot access to the API' })
    }
    (req as AgentApiRequest).session = session
    return handler(req, res)
  }
}
 
export function getAuthOptions(req: NextApiRequest) {
    const clientIp = req.headers["x-forwarded-for"] || (req as any).ip
    return {
        secret: nextAuthSecret,
        providers: [
          GitHubProvider({
            clientId: githubAppClientId,
            clientSecret: githubAppClientSecret,
          }),
        ],
        callbacks: {
          async signIn({ user, account, profile }) {
            try {
              await addUser({ user, account, profile })
              return true
            } catch (e) {
              return false
            }
          },
          async jwt({ token, user, account }) {
            if (user && account) {
              const id = getUserId({ user, account })
              token.id = id
              return setCredentialData({ id, clientIp }).then(() => token)
            }
            return token
          },
          async session({ session, token }) {
            const credentialData = await getCredentialData(token.id as string)
            return credentialData && credentialData.clientIp === clientIp ? session : null
          },
        },
        pages: {
          signIn: "/agent",
        },
      }
}