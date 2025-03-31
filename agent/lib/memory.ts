import { AgentMemory, AgentMemoryItem } from "./types";

import { dataBase } from './storage'

const MEMORY_KEY_PREFIX = 'memory/'

export async function memoryPutItem(userId: string, memoryItems: AgentMemoryItem[] ): Promise<boolean> {
    const memory = await memoryLoad(userId)
    memory.memoryItems.push(...memoryItems)
    return await memorySave(userId, memory)
}

function memoryCreate(): AgentMemory {
    return { memoryItems: [] }
}

async function memorySave(userId: string, memory: AgentMemory): Promise<boolean> {
    return dataBase.set(MEMORY_KEY_PREFIX + userId, memory)
}

async function memoryLoad(userId: string): Promise<AgentMemory> {
    return await dataBase.get(MEMORY_KEY_PREFIX + userId) || memoryCreate()
}