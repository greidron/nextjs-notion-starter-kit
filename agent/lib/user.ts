import { dataBase } from '@/agent/lib/storage'
import { Account, Profile, User } from "next-auth";
import { AgentUser } from "./types";
import { allowedUserId } from '@/lib/config'

export function getUserId({ 
    user,
    account,
} : {
    user: User
    account: Account
}) : string {
    const provider = account?.provider || 'unknown'
    const accountId = account?.providerAccountId || user?.id
    return `${provider}:${accountId}`
}

function getAgentUser({ 
    user,
    account,
    profile,
} : {
    user: User
    account: Account
    profile: Profile
}) : AgentUser {
    return {
        id: getUserId({ user, account }),
        provider: account?.provider || 'unknown',
        name: user?.name,
        email: user?.email,
        image: user?.image,
    }
}

export function addUser({ 
    user,
    account,
    profile,
} : {
    user: User
    account: Account
    profile: Profile
}) : Promise<AgentUser> {
    const agentUser = getAgentUser({ user, account, profile })
    if (!allowedUserId.includes(agentUser.id)) {
        return Promise.reject(new Error('not allowed'))
    }
    return dataBase.set(`user/${user.id}`, agentUser)
        .then(() => Promise.resolve(agentUser))
}

export function getUser(id: string) : Promise<AgentUser> {
    return dataBase.get(id)
}