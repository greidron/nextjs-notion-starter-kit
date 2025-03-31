import { AgentContext, AgentMessage } from "./types"
import { v6 as uuid } from "uuid"
import { dataBase as cache } from "./storage"

const CONTEXT_KEY_PREFIX = 'context/'
const CURRENT_CONTEXT_ID_KEY = CONTEXT_KEY_PREFIX + 'current/id'

export async function getCurrentContext() : Promise<AgentContext> {
    const currentContextId = await cache.get(CURRENT_CONTEXT_ID_KEY)
    if (currentContextId) {
        return getContext(currentContextId)
    }
    const newId = uuid()
    const newContext = createContext(newId)
    await putContext(newContext)
    await cache.set(CURRENT_CONTEXT_ID_KEY, newId)
    return newContext
}

export function getContext(id: string): Promise<AgentContext> {
    return cache.get(CONTEXT_KEY_PREFIX + id)
}

export function putContext(context: AgentContext): Promise<boolean> {
    return cache.set(CONTEXT_KEY_PREFIX + context.id, context)
}

export function createContext(id: string): AgentContext {
    return { id, messages: [] }
}

export function putContextMessages(context: AgentContext, ...messages: AgentMessage[]) {
    if (!context.messages) {
        context.messages = []
    }
    context.messages.push(...messages)
}