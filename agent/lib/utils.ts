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

export function camelCaseToWords(str: string) {
    return str.replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (s: string) => s.toUpperCase())
}

const DATE_TIME_OPTIONS : Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
}

export function formatDateOrTime(epochMillis) {
  const inputDate = new Date(epochMillis)
  const now = new Date()

  const isToday =
    inputDate.getFullYear() === now.getFullYear() &&
    inputDate.getMonth() === now.getMonth() &&
    inputDate.getDate() === now.getDate();

  return isToday
    ? inputDate.toLocaleTimeString(undefined, DATE_TIME_OPTIONS)
    : inputDate.toLocaleString(undefined, DATE_TIME_OPTIONS)
}