import { cache } from './storage'

const SESSION_PREFIX = 'session'

export function setCredentialData({ id, clientIp }): Promise<boolean> {
    return cache.set(`${SESSION_PREFIX}/${id}`, { clientIp })
}

export function getCredentialData(id: string): Promise<any> {
    return cache.get(`${SESSION_PREFIX}/${id}`)
}