import { AgentContext, AgentMessage, AgentMetering, AgentTokenUsage, AgentToolUsage } from './types'
import { Tiktoken } from 'js-tiktoken/lite'
import model from 'js-tiktoken/ranks/cl100k_base'
import { dataBase } from './storage'

const TIK_TOKEN_ENCODER = new Tiktoken(model)
const METERING_KEY_PREFIX = 'metering/'

export async function meteringGet(userId: string): Promise<AgentMetering> {
    return await dataBase.get(METERING_KEY_PREFIX + userId) || meteringCreate()
}

async function meteringPut(userId: string, metering: AgentMetering) {
    return await dataBase.set(METERING_KEY_PREFIX + userId, metering)
}

export async function meteringAdd(userId: string, tokenUsage?: AgentTokenUsage, toolUsage?: AgentToolUsage): Promise<boolean> {
    const metering = await meteringGet(userId)
    const now = Date.now()
    metering.meteringItems.push({
        tokenUsage: tokenUsage,
        toolUsage: toolUsage,
        startTimestamp: now,
        endTimestamp: now,
    })
    return await meteringPut(userId, metering)
}

function meteringCreate(): AgentMetering {
    return { meteringItems: [] }
}

export function meteringCountTokenOfMessage(messages: AgentMessage[]): number {
    return messages.reduce(
        (count, message) => count + TIK_TOKEN_ENCODER.encode(message.content).length,
        0
    )
}

export function meteringCountTokenOfContext(context: AgentContext): AgentTokenUsage {
    const inputTokenCount = meteringCountTokenOfMessage(context.messages)
    const outputTokenCount = meteringCountTokenOfMessage(context.processingMessages)
    return {
        total: inputTokenCount + outputTokenCount,
        input: inputTokenCount,
        output: outputTokenCount,
    }
}