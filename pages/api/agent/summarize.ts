import { getCurrentContext, putContext } from '@/agent/lib/context'
import { memoryPutItem } from '@/agent/lib/memory'
import { withSession } from '@/agent/lib/session'
import { AgentApiRequest, AgentMemoryItem, AgentMessage, AgentMessageType, SummaryInputMessage } from '@/agent/lib/types'
import { compose, getResponseInputItem, withMethod } from '@/agent/lib/utils'
import { openAiApiKey } from '@/lib/config'
import { NextApiResponse, NextApiHandler } from 'next'
import OpenAI from 'openai'

const openAi = new OpenAI({ apiKey: openAiApiKey })
const SUMMARY_PROMPT = `Your task is to analyze messages, group and summarize them by topics.

Basic Rules:
- Each message consists of a user's question and an agent's answer.
- Group related messages that discuss the same topic.
- For each group:
  - Write a summary that accurately reflects the key points.
  - Add tags, which must be meaningful keywords relevant to the topic.
  - Add related message indices which starts from 0.

Tagging Guidelines:
1. Include important named entities and keywords in the tags:
   - Product or service names (e.g. OpenAI, React, GPT-4)
   - Libraries, APIs, or technical tools (e.g. JSON Schema, useEffect)
   - Topics or task categories (e.g. Scrolling, Authentication, Validation)
2. Use 2 to 5 tags per group, prioritizing specificity over generality.
3. Avoid vague or generic tags like "question", "info", or "topic".

Special Rule:
- If a group's topic is trivial or factual (e.g. current time, weather, definitions), add the tag "!ignore".

Language Rule:
- Write each summary in the language used by the majority of messages in that group.`

function getAllSummaryInputMessageList(messages: AgentMessage[]): SummaryInputMessage[] {
    const summaryMessage = new Array<SummaryInputMessage>()
    let userMessage: string | null = null
    for (const message of messages) {
        switch (message.type) {
            case AgentMessageType.AGENT:
                summaryMessage.push({ user: userMessage, agent: message.content, timestamp: message.timestamp })
                userMessage = null
                break
            case AgentMessageType.USER:
                userMessage = message.content
                break
        }
    }
    return summaryMessage
}

const TARGET_MESSAGE_TIME_MILLIS = 12 * 60 * 60 * 1000

function getTargetSummaryInputMessageList(timestamp: number, messages: SummaryInputMessage[]): SummaryInputMessage[] {
    return messages.filter((message) => (timestamp - message.timestamp) > TARGET_MESSAGE_TIME_MILLIS)
}

function getRemainingMessageList(timestamp: number, messages: AgentMessage[]): AgentMessage[] {
    if (!messages || messages.length === 0) {
        return []
    }
    const lastTimestamp = messages.reduce(
        (timestamp, message) => !message.timestamp
            ? timestamp
            : Math.max(message.timestamp, timestamp),
        0
    )
    if (timestamp - lastTimestamp > TARGET_MESSAGE_TIME_MILLIS) {
        return []
    }
    let messageIndex = messages.findIndex(
        (message) => message.timestamp && timestamp - message.timestamp <= TARGET_MESSAGE_TIME_MILLIS
    )
    while (messageIndex >= 0) {
        const messageTimestamp = messages[messageIndex].timestamp
        if (messages[messageIndex].type === AgentMessageType.USER) {
            break
        }
        --messageIndex;
    }
    return messages.slice(Math.max(0, messageIndex))
}

export default (
    compose(
        withSession(),
        withMethod('POST')
    )(
        async (req: AgentApiRequest, res: NextApiResponse) => {
            const nowTimestamp = Date.now()
            const context = await getCurrentContext(req.session.id)
            const summaryInputMessages = getTargetSummaryInputMessageList(nowTimestamp, getAllSummaryInputMessageList(context.messages))
            if (summaryInputMessages.length === 0) {
                return res.status(200).json([])
            }

            const response = await openAi.responses.create({
                model: 'gpt-4o-mini',
                input: [
                    { role: 'system', content: SUMMARY_PROMPT },
                    { role: 'user', content: JSON.stringify(summaryInputMessages) }
                ],
                text: {
                    format: {
                        type: 'json_schema',
                        name: 'conversation_summary',
                        schema: {
                            type: 'object',
                            properties: {
                                summary_list: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            summary: {
                                                type: 'string',
                                                description: 'The summary of specific topic group.'
                                            },
                                            indices: {
                                                type: 'array',
                                                items: { type: 'number' },
                                                description: 'Message indices of specific topic group.'
                                            },
                                            tags: {
                                                type: 'array',
                                                items: { type: 'string' },
                                                description: 'The tags of specific topic group.'
                                            }
                                        },
                                        required: ['summary', 'indices', 'tags'],
                                        additionalProperties: false
                                    }
                                }
                            },
                            required: ['summary_list'],
                            additionalProperties: false
                        },
                        strict: true
                    }
                }
            })
            const results: any = []
            for (const output of response.output || []) {
                if (output.type !== 'message') {
                    console.warn(`ignore invalid output type ${output.type}: ${output}`)
                    continue
                }
                for (const content of output.content || []) {
                    if (content.type !== 'output_text') {
                        console.warn(`ignore invalid content type ${content.type}: ${content}`)
                        continue
                    }
                    try {
                        results.push(...JSON.parse(content.text).summary_list)
                    } catch (e) {
                        console.warn(`failed convert output to JSON: ${e}`)
                    }
                }
            }
            
            const memoryItems = []
            for (const result of results) {
                const memoryItem: AgentMemoryItem = {
                    content: result.summary,
                    tags: result.tags,
                }
                for (const index of result.indices) {
                    const summaryInputMessage = summaryInputMessages[index]
                    if (!memoryItem.startTimestamp) {
                        memoryItem.startTimestamp = summaryInputMessage.timestamp
                    }
                    memoryItem.endTimestamp = summaryInputMessage.timestamp
                }
                memoryItems.push(memoryItem)
            }
            memoryPutItem(req.session.id, memoryItems)
            context.messages = getRemainingMessageList(nowTimestamp, context.messages)
            putContext(context)
            
            return res.status(200).json(results)
        }
    )
) as NextApiHandler