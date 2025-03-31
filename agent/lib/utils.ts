import { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { AgentMessage, AgentMessageType, Function, UnaryOperator } from "./types";
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

export function getResponseInputItem(message: AgentMessage): ResponseInputItem {
    switch(message.type) {
        case AgentMessageType.AGENT:
            return { role: 'assistant', content: message.content }
        case AgentMessageType.USER:
            return { role: 'user', content: message.content }
        default:
            return { role: 'system', content: message.content }
    }
}

export function withMethod(...methods: string[]): UnaryOperator<NextApiHandler> {
    return (handler: NextApiHandler) => (req: NextApiRequest, res: NextApiResponse) => {
        if (!methods.includes(req.method)) {
            return res.status(405).json({ error: `method ${req.method} is not allowed` })
        }
        return handler(req, res)
    }
}

export function compose<T, R>(...funcs: Function<any, any>[]): Function<T, R> {
    return (initialValue: T): R => {
        return funcs.reduceRight((accumulator, func) => func(accumulator), initialValue)
    }
}