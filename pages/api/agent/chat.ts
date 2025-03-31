import { NextApiResponse } from 'next'
import { v6 as uuid } from 'uuid'
import { openAiApiKey } from '@/lib/config'
import OpenAI from 'openai'
import { getCurrentContext, initContext, initOpenAiContext, putContext, putContextMessage, putContextProcessingMessage, setContextStopProcessing, setFunctionCalling, updateContextLastContentIndex, contextUpdateToolUsage, contextGetToolUsage } from '@/agent/lib/context'
import { AgentApiRequest, AgentContentType, AgentEvent, AgentInfo, AgentToolStatus, OpenAiAgentContext } from '@/agent/lib/types'
import { AgentType, AgentMessageType, AgentContext } from '../../../agent/lib/types'
import { ResponseContentPartDoneEvent, ResponseFunctionToolCall, ResponseInputItem, ResponseOutputItemAddedEvent, ResponseOutputItemDoneEvent, ResponseStreamEvent, Tool } from 'openai/resources/responses/responses.mjs'
import { compose, getResponseInputItem, withMethod } from '@/agent/lib/utils'
import { withSession } from '@/agent/lib/session'
import { schema as dateTimeToolSchema, default as dateTimeTool } from '@/agent/tools/dateTime'
import { schema as drawChartToolSchema, default as drawChartTool } from '@/agent/tools/drawChart'
import { meteringAdd, meteringCountTokenOfContext } from '@/agent/lib/metering'

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
        putContextMessage(
            context,
            { 
                type: AgentMessageType.USER, 
                content, 
                info: { id: `in_${id}` },
                timestamp: context.timestamp,
            }
        )

        do {
            setFunctionCalling(context, false)
            const stream = await openAi.responses.create({
                model: model,
                tools: [
                    dateTimeToolSchema,
                    drawChartToolSchema,
                    { type: 'web_search_preview' },
                ],
                input: prevMessages.map(getResponseInputItem)
                    .concat({ role: 'user', content: content })
                    .concat(context.toolMessages),
                stream: true,
                tool_choice: 'auto',
                parallel_tool_calls: false,
            })

            for await (const event of stream) {
                handleEvent(context, res, event)
                if (context.isStopProcessing) {
                    console.warn(`stop processing on event: ${event.type}`)
                    break
                }
            }
        } while (context.isFunctionCalling)
    } catch (e) {
        context.error = e

        console.groupCollapsed('Cannot process chat request')
        console.error(`Error: ${e}`)
        console.trace()
        console.groupEnd()

        res.write(buildResponseData(AgentEvent.ERROR, { errorMessage: `${e}` }))
    } finally {
        try {
            const tokenUsage = meteringCountTokenOfContext(context)
            const toolUsage = contextGetToolUsage(context)
            const agentInfo = { ...context.info, tokenUsage, toolUsage }
            meteringAdd(req.session.id, tokenUsage, toolUsage)

            res.write(buildResponseData(AgentEvent.INFO, { info: agentInfo }))

            if (context.processingMessages.length === 0) {
                const timestamp = Date.now()
                const errorContent = `Cannot processing message: ${context.error || 'nothing processed'}`
                const contentIndex = (context.lastContentIndex !== null? context.lastContentIndex + 1 : 0)
                res.write(buildResponseData(AgentEvent.FINALIZE, {
                    contentType: AgentContentType.TEXT,
                    contentIndex,
                    content: errorContent,
                    timestamp,
                }))
                putContextProcessingMessage(
                    context,
                    {
                        type: AgentMessageType.AGENT,
                        contentType: AgentContentType.TEXT,
                        contentIndex,
                        content: errorContent,
                        timestamp,
                    }
                )
            }

            for (const message of context.processingMessages) {
                message.info = agentInfo
            }

            putContextMessage(context, ...context.processingMessages)
            await putContext(context)
        } catch (e) {
            console.groupCollapsed('Cannot save context')
            console.error(`Error: ${e}`)
            console.trace()
            console.groupEnd()

            res.write(buildResponseData(AgentEvent.ERROR, { errorMessage: `${e}` }))
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
            case 'drawChart':
                context.toolMessages.push({
                    type: 'function_call_output',
                    call_id: toolMessage.call_id,
                    output: drawChartTool(JSON.parse(toolMessage.arguments)),
                    status: 'completed',
                })
                break
            default:
                throw new Error('unsupported tool')
        }
        setFunctionCalling(context, true)
        contextUpdateToolUsage(context, toolMessage.name)
    } catch (e) {
        const errorMessage = `error while run tool '${toolMessage.name}': ${e}`

        console.groupCollapsed('Cannot process chat request')
        console.error(`Error: ${errorMessage}`)
        console.trace()
        console.groupEnd()

        context.toolMessages.push({
            type: 'function_call_output',
            call_id: toolMessage.call_id,
            output: JSON.stringify({ error: errorMessage }),
            status: 'incomplete',
        })
        res.write(buildResponseData(AgentEvent.ERROR, { errorMessage }))
        res.write(buildResponseData(AgentEvent.TOOL, { type: toolMessage.name, status: AgentToolStatus.COMPLETED }))
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
                res.write(buildResponseData(AgentEvent.BEGIN, { info, timestamp: context.timestamp }))
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
                    res.write(buildResponseData(AgentEvent.ERROR, { errorMessage: `invalid content index ${event.content_index}` }))
                    return
                }
                const message = context.processingMessages[event.content_index]
                message.content += event.delta
                message.contentIndex = event.content_index
                res.write(buildResponseData(AgentEvent.DELTA, {content: event.delta, contentIndex: event.content_index}))

                updateContextLastContentIndex(context, event.content_index)
            }
            break
        case 'response.output_text.done':
            break
        case 'response.content_part.done':
            if (context.processingMessages.length <= event.content_index) {
                res.write(buildResponseData(AgentEvent.ERROR, { errorMessage: `invalid content index ${event.content_index}` }))
                return
            }
            handleCompletedContentPart(context, res, event)
            updateContextLastContentIndex(context, event.content_index)
            break
        default:
            console.debug(`ignore event type ${event.type}: ${JSON.stringify(event)}`)
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
            // FIXME
            if (context.processingMessages.length > 0) {
                console.warn(`repeated web search call: ${event.item.id}`)
                setContextStopProcessing(context, true)
                return
            }
            res.write(buildResponseData(AgentEvent.TOOL, { tool: { type: event.item.type, status: getAgentToolStatus(event.item.status) } }))
            break
        case 'function_call':
            res.write(buildResponseData(AgentEvent.TOOL, { tool: { type: event.item.name, status: AgentToolStatus.PREPARE } }))
            break
        default:
            console.debug(`ignore output item added: ${event.item.type}`)
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
            contextUpdateToolUsage(context, 'web_search_call')
            break
        case 'function_call':
            handleFunctionCalling(context as OpenAiAgentContext, res, event.item)
            break
        default:
            console.debug(`ignore output item done: ${event.item.type}`)
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
                const timestamp = Date.now()
                const message = context.processingMessages[event.content_index]
                message.content = part.text
                message.contentIndex = event.content_index
                message.info = context.info
                message.timestamp = timestamp
                res.write(
                    buildResponseData(
                        AgentEvent.FINALIZE, { 
                            contentType: AgentContentType.TEXT,
                            contentIndex: event.content_index,
                            content: part.text,
                            info: context.info,
                            timestamp,
                        }
                    )
                )
                updateContextLastContentIndex(context, event.content_index)
            }
            break
        case 'refusal':
            break
        default:
            console.debug(`unknown event content part type: ${JSON.stringify(event)}`)
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