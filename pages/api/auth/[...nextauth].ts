import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { githubAppClientId, githubAppClientSecret } from '@/lib/config'
import { addUser, getUserId } from '@/agent/lib/user'
import { setCredentialData, getCredentialData } from '@/agent/lib/session';
import { type NextApiRequest, type NextApiResponse } from 'next';

export default async function authorize(req: NextApiRequest, res: NextApiResponse) {
  const clientIp = req.headers["x-forwarded-for"] || req.ip
  return await NextAuth(req, res, {
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
  })
}
