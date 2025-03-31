import { AgentContext, AgentMessage, AgentToolUsage, OpenAiAgentContext } from './types'
import { v6 as uuid } from 'uuid'
import { dataBase as cache } from './storage'

const CONTEXT_KEY_PREFIX = 'context/'
const CURRENT_CONTEXT_ID_KEY_PREFIX = CONTEXT_KEY_PREFIX + 'current/id/'

export async function getCurrentContext(userId: string) : Promise<AgentContext> {
    const currentContextId = await cache.get(CURRENT_CONTEXT_ID_KEY_PREFIX + userId)
    if (currentContextId) {
        return getContext(currentContextId)
    }
    const newId = uuid()
    const newContext = createContext(newId)
    await putContext(newContext)
    await cache.set(CURRENT_CONTEXT_ID_KEY_PREFIX + userId, newId)
    return newContext
}

export function getContext(id: string): Promise<AgentContext> {
    return cache.get(CONTEXT_KEY_PREFIX + id)
}

export function putContext(context: AgentContext): Promise<boolean> {
    context.processingMessages = null
    return cache.set(CONTEXT_KEY_PREFIX + context.id, context)
}

export function createContext(id: string): AgentContext {
    return { id, messages: [] }
}

export function initContext(
    context: AgentContext, 
    { 
        outputId
    }: {
        outputId: string
    }
) : AgentContext {
    context.outputId = outputId
    if (!context.messages || !Array.isArray(context.messages)) {
        context.messages = []
    }
    if (!context.processingMessages || !Array.isArray(context.processingMessages)) {
        context.processingMessages = []
    }
    context.info = null
    context.lastContentIndex = null 
    context.timestamp = Date.now()
    context.isStopProcessing = false
    context.toolUsage = {}
    return context
}

export function initOpenAiContext(context: AgentContext): OpenAiAgentContext {
    const openAiContext = context as OpenAiAgentContext
    openAiContext.toolMessages = []
    openAiContext.isFunctionCalling = false
    openAiContext.isStopProcessing = false
    return openAiContext
}

export function putContextProcessingMessage(context: AgentContext, ...messages: AgentMessage[]) {
    context.processingMessages.push(...messages)
}

export function putContextMessage(context: AgentContext, ...messages: AgentMessage[]) {
    context.messages.push(...messages)
}

export function updateContextLastContentIndex(context: AgentContext, index: number) {
    if (context.lastContentIndex && context.lastContentIndex >= index) {
        return
    }
    context.lastContentIndex = index
}

export function setFunctionCalling(context: OpenAiAgentContext, value: boolean) {
    context.isFunctionCalling = value
}

export function setContextStopProcessing(context: AgentContext, value: boolean) {
    context.isStopProcessing = value
}

export function contextUpdateToolUsage(context: AgentContext, toolName: string) {
    if (!context.toolUsage) {
        context.toolUsage = {}
    }
    if (!context.toolUsage[toolName]) {
        context.toolUsage[toolName] = 0
    }
    ++context.toolUsage[toolName]
}

export function contextGetToolUsage(context: AgentContext): AgentToolUsage {
    return context.toolUsage || {}
}