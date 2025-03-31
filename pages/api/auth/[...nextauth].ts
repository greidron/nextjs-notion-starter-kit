import NextAuth from 'next-auth';
import { type NextApiRequest, type NextApiResponse } from 'next'
import { getAuthOptions } from '@/agent/lib/session'

export default async function authorize(req: NextApiRequest, res: NextApiResponse) {
  return await NextAuth(req, res, getAuthOptions(req))
}
