import { NextApiResponse } from 'next'
import { v6 as uuid } from 'uuid'
import { openAiApiKey } from '@/lib/config'
import OpenAI from 'openai'
import { getCurrentContext, initContext, initOpenAiContext, putContext, putContextMessage, putContextProcessingMessage, updateContextLastContentIndex } from '@/agent/lib/context'
import { AgentApiRequest, AgentContentType, AgentEvent, AgentInfo, AgentResponse, AgentTokenUsage, AgentToolStatus, OpenAiAgentContext, OpenAiAgentToolMessage } from '@/agent/lib/types'
import { AgentType, AgentMessageType, AgentContext } from '../../../agent/lib/types'
import { ResponseContentPartDoneEvent, ResponseFunctionToolCall, ResponseOutputItemAddedEvent, ResponseOutputItemDoneEvent, ResponseStreamEvent, Tool } from 'openai/resources/responses/responses.mjs'
import { compose, getResponseInputItem, withMethod } from '@/agent/lib/utils'
import { withSession } from '@/agent/lib/session'
import { schema as dateTimeToolSchema, default as dateTimeTool } from '@/agent/tools/dateTime'

const openAi = new OpenAI({ apiKey: openAiApiKey })

async function handler(req: AgentApiRequest, res: NextApiResponse) {
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Content-Encoding', 'none')
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.flushHeaders()

    let context: OpenAiAgentContext = null
    try {
        const originContext = await getCurrentContext(req.session.id)
        const prevMessages = [...originContext.messages]
        const model = req.body.model || 'gpt-4o-mini'
        const content = req.body.content
        const id = uuid()

        context = initOpenAiContext(initContext(originContext, { outputId: `out_${id}` }))
        putContextMessage(context, { type: AgentMessageType.USER, content, info: { id: `in_${id}` } })

        do {
            context.isFunctionCalling = false

            const stream = await openAi.responses.create({
                model: model,
                tools: [
                    { type: 'web_search_preview' },
                    dateTimeToolSchema
                ],
                input: prevMessages.map(getResponseInputItem)
                    .concat([{ role: 'user', content: content }])
                    .concat(context.toolMessages),
                stream: true,
            })

            for await (const event of stream) {
                handleEvent(context, res, event)
            }
        } while (context.isFunctionCalling)
    } catch (e) {
        context.error = e

        console.groupCollapsed('Cannot process chat request')
        console.log(`Error: ${e}`)
        console.trace()
        console.groupEnd()

        res.write(buildResponseData(AgentEvent.ERROR, { content: `${e}` }))
    } finally {
        try {
            if (context.processingMessages.length === 0) {
                const errorContent = `Cannot processing message: ${context.error || 'nothing processed'}`
                const contentIndex = (context.lastContentIndex !== null? context.lastContentIndex + 1 : 0)
                res.write(buildResponseData(AgentEvent.FINALIZE, {
                    contentType: AgentContentType.TEXT,
                    contentIndex,
                    content: errorContent,
                }))
                putContextProcessingMessage(
                    context,
                    {
                        type: AgentMessageType.AGENT,
                        contentType: AgentContentType.TEXT,
                        contentIndex,
                        content: errorContent,
                    }
                )
            }
            putContextMessage(context, ...context.processingMessages)
            await putContext(context)
        } catch (e) {
            console.groupCollapsed('Cannot save context')
            console.log(`Error: ${e}`)
            console.trace()
            console.groupEnd()

            res.write(buildResponseData(AgentEvent.ERROR, { content: `${e}` }))
        }

        res.write(buildResponseData(AgentEvent.END))
        res.end()
    }
}

function handleFunctionCalling(context: OpenAiAgentContext, res: NextApiResponse, toolMessage: ResponseFunctionToolCall) {
    context.toolMessages.push(toolMessage)
    res.write(buildResponseData(AgentEvent.TOOL, { type: toolMessage.name, status: AgentToolStatus.COMPLETED }))
    try {
        switch (toolMessage.name) {
            case 'dateTime':
                context.toolMessages.push({
                    type: 'function_call_output',
                    call_id: toolMessage.call_id,
                    output: JSON.stringify(dateTimeTool(JSON.parse(toolMessage.arguments))),
                    status: 'completed',
                })
                break
            default:
                throw new Error('unsupported tool')
        }
        context.isFunctionCalling = true
    } catch (e) {
        context.toolMessages.push({
            type: 'function_call_output',
            call_id: toolMessage.call_id,
            output: JSON.stringify({ error: `error while run tool '${toolMessage.name}': ${e}` }),
            status: 'incomplete',
        })
        res.write(buildResponseData(AgentEvent.TOOL, { type: toolMessage.name, status: AgentToolStatus.COMPLETED }))
        context.isFunctionCalling = false
    }
}

function handleEvent(context: AgentContext, res: NextApiResponse, event: ResponseStreamEvent) {
    switch (event.type) {
        case 'response.created':
            {
                const info: AgentInfo = {
                    type: AgentType.OPEN_AI,
                    id: context.outputId,
                    model: event?.response?.model,
                }
                res.write(buildResponseData(AgentEvent.BEGIN, { info }))
                context.info = info
            }
            break
        case 'response.in_progress':
            res.write(buildResponseData(AgentEvent.TOOL, { tool: { type: 'agent', status: AgentToolStatus.PREPARE } }))
            break
        case 'response.output_item.added':
            handleOutputItemAdded(context, res, event)
            break
        case 'response.output_item.done':
            handleOutputItemDone(context, res, event)
            break
        case 'response.content_part.added':
            while (context.processingMessages.length <= event.content_index) {
                context.processingMessages.push({ type: AgentMessageType.AGENT, content: '' })
            }
            res.write(buildResponseData(AgentEvent.ADD, {contentIndex: event.content_index}))

            updateContextLastContentIndex(context, event.content_index)
            break
        case 'response.output_text.delta':
            {
                if (context.processingMessages.length <= event.content_index) {
                    res.write(buildResponseData(AgentEvent.ERROR, { content: `invalid content index ${event.content_index}` }))
                    return
                }
                const message = context.processingMessages[event.content_index]
                message.content += event.delta
                message.contentIndex = event.content_index
                res.write(buildResponseData(AgentEvent.DELTA, {content: event.delta, contentIndex: event.content_index}))

                updateContextLastContentIndex(context, event.content_index)
            }
            break
        case 'response.content_part.done':
            if (context.processingMessages.length <= event.content_index) {
                res.write(buildResponseData(AgentEvent.ERROR, { content: `invalid content index ${event.content_index}` }))
                return
            }
            handleCompletedContentPart(context, res, event)
            updateContextLastContentIndex(context, event.content_index)
            break
        case 'response.completed':
            {
                const response = event?.response
                const usage = response?.usage
                const tokenUsage = {
                    total: usage?.total_tokens || 0,
                    input: usage?.input_tokens || 0,
                    inputCached: usage?.input_tokens_details?.cached_tokens || 0,
                    output: usage?.output_tokens || 0,
                }
                const infoWithTokenUsage = { ...context.info, tokenUsage }
                for (const message of context.processingMessages) {
                    message.info = infoWithTokenUsage
                }
                res.write(buildResponseData(AgentEvent.INFO, { info: infoWithTokenUsage }))
            }
            break
        default:
            console.log(`ignore event type ${event.type}: ${JSON.stringify(event)}`)
            break
    }
}

function handleOutputItemAdded(
    context: AgentContext, 
    res: NextApiResponse, 
    event: ResponseOutputItemAddedEvent
) {
    switch (event.item.type) {
        case 'web_search_call':
            res.write(buildResponseData(AgentEvent.TOOL, { tool: { type: event.item.type, status: getAgentToolStatus(event.item.status) } }))
            break
        case 'function_call':
            res.write(buildResponseData(AgentEvent.TOOL, { tool: { type: event.item.name, status: AgentToolStatus.PREPARE } }))
            break
        default:
            console.log(`ignore output item added: ${event.item.type}`)
            break
    }
}

function handleOutputItemDone(
    context: AgentContext, 
    res: NextApiResponse, 
    event: ResponseOutputItemDoneEvent
) {
    switch (event.item.type) {
        case 'web_search_call':
            res.write(buildResponseData(AgentEvent.TOOL, { tool: { type: event.item.type, status: getAgentToolStatus(event.item.status) } }))
            break
        case 'function_call':
            handleFunctionCalling(context as OpenAiAgentContext, res, event.item)
            break
        default:
            console.log(`ignore output item done: ${event.item.type}`)
            break
    }
}

function getAgentToolStatus(status: string) {
    switch (status) {
        case 'in_progress': return AgentToolStatus.IN_PROGRESS
        case 'completed': return AgentToolStatus.COMPLETED
        default: return AgentToolStatus.UNKNOWN
    }
}

function handleCompletedContentPart(
    context: AgentContext, 
    res: NextApiResponse, 
    event: ResponseContentPartDoneEvent
) {
    const part = event?.part
    switch (part.type) {
        case 'output_text':
            {
                const message = context.processingMessages[event.content_index]
                message.content = part.text
                message.contentIndex = event.content_index
                message.info = context.info
                res.write(
                    buildResponseData(
                        AgentEvent.FINALIZE, { 
                            contentType: AgentContentType.TEXT,
                            contentIndex: event.content_index,
                            content: part.text,
                            info: context.info
                        }
                    )
                )
                updateContextLastContentIndex(context, event.content_index)
            }
            break
        case 'refusal':
            break
        default:
            console.log(`unknown event content part type: ${JSON.stringify(event)}`)
            break
    }
}

function buildResponseData(event: AgentEvent, payload: any = {}): string {
    return `data: ${JSON.stringify({ ...payload, event })}\n\n`
}

export default compose(
    withSession(),
    withMethod('POST')
)(handler)