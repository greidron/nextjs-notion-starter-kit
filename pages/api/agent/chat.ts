import { NextApiRequest, NextApiResponse } from 'next'
import { openAiApiKey } from '@/lib/config'
import OpenAI from 'openai'
import { getCurrentContext, putContext, putContextMessages } from '@/agent/lib/context'
import { AgentContentType, AgentEvent, AgentInfo, AgentMessage, AgentResponse } from '@/agent/lib/types'
import { AgentType, AgentMessageType, AgentContext } from '../../../agent/lib/types';
import { ResponseCompletedEvent, ResponseOutputItem, ResponseOutputItemDoneEvent, ResponseOutputMessage, ResponseOutputRefusal, ResponseOutputText, ResponseStreamEvent } from 'openai/resources/responses/responses.mjs'

const openAi = new OpenAI({ apiKey: openAiApiKey })

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Content-Encoding', 'none')
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.flushHeaders()

    try {
        const context = await getCurrentContext()
        const model = req.body.model || 'gpt-4o-mini'
        const content = req.body.content

        putContextMessages(context, { type: AgentMessageType.USER, content })

        const stream = await openAi.responses.create({
            model: model,
            tools: [ { type: "web_search_preview" } ],
            input: [{ role: 'user', content: content }],
            stream: true,
        })
        for await (const event of stream) {
            handleEvent(context, res, event)
        }
        await putContext(context)

        res.write(buildResponseData(AgentEvent.END))

        res.end()
    } catch (e) {
        console.groupCollapsed("Error processing chat request")
        console.log(`Error: ${e}`)
        console.trace()
        console.groupEnd()

        res.write(buildResponseData(AgentEvent.ERROR, { content: `${e}` }))
    }
    res.end()
}

function handleEvent(context: AgentContext, res: NextApiResponse, event: ResponseStreamEvent) {
    if (event.type.startsWith('response.web_search_call.')) {
        res.write(buildResponseData(AgentEvent.TOOL, { content: event.type }))
        return
    }
    switch (event.type) {
        case 'response.created':
            {
                const info: AgentInfo = {
                    type: AgentType.OPEN_AI,
                    id: event?.response?.id,
                    model: event?.response?.model,
                }
                res.write(buildResponseData(AgentEvent.BEGIN, { info }))
                context.info = info
            }
            break
        case 'response.output_text.delta':
            res.write(buildResponseData(AgentEvent.DELTA, {content: event.delta, contentIndex: event.content_index}))
            break
        case 'response.completed':
            {
                const completedEvent = event as ResponseCompletedEvent
                completedEvent?.response?.output.forEach(
                    (output, index) => handleCompletedOutput(context, res, event, output, index)
                )
            }
            break
        default:
            console.log(`ignore event type ${event.type}: ${JSON.stringify(event)}`)
            break
    }
}

function handleCompletedOutput(
    context: AgentContext, 
    res: NextApiResponse, 
    event: ResponseStreamEvent, 
    output: ResponseOutputItem,
    index: number
) {
    switch (output.type) {
        case 'message': {
            const messageOutput = output as ResponseOutputMessage
            for (const item of messageOutput.content) {
                handleCompletedOutputItem(context, res, event, output, item, index)
            }
            break
        }
        default:
            console.log(`unknown event output type ${output.type}: ${JSON.stringify(output)}`)
            break
    }
}

function handleCompletedOutputItem(
    context: AgentContext, 
    res: NextApiResponse, 
    event: ResponseStreamEvent, 
    output: ResponseOutputItem,
    item: ResponseOutputText | ResponseOutputRefusal,
    index: number
) {
    switch (item.type) {
        case 'output_text':
            res.write(
                buildResponseData(
                    AgentEvent.FINALIZE, { 
                        contentType: AgentContentType.TEXT,
                        contentIndex: index,
                        content: item.text
                    }
                )
            )
            putContextMessages(
                context, { 
                    type: AgentMessageType.AGENT, 
                    content: item.text, 
                    contentIndex: index,
                    info: context.info,
                }
            )
            break
        case 'refusal':
            break
        default:
            console.log(`unknown event output item type: ${JSON.stringify(item)}`)
            break
    }
}

function buildResponse(
    event: AgentEvent, 
    {
        contentType,
        contentIndex,
        content,
        errorMessage,
        info,
    }: {
        contentType?: AgentContentType
        contentIndex?: number
        content?: string
        errorMessage?: string
        info?: AgentInfo
    }
): AgentResponse {
    return { 
        event,
        contentType,
        contentIndex, 
        content, 
        errorMessage, 
        info
    }
}

function buildResponseData(event: AgentEvent, payload: any = {}): string {
    return `data: ${JSON.stringify(buildResponse(event, payload))}\n\n`
}