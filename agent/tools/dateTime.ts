import { FunctionTool } from "openai/resources/responses/responses.mjs"

export const schema: FunctionTool = {
    type: 'function',
    name: 'dateTime',
    description: 'Retrieve current date and time',
    parameters: {
        type: 'object',
        properties: {
            timeZone: {
                type: 'string',
                description: 'IANA timezone string'
            }
        },
        required: [
            'timeZone'
        ],
        additionalProperties: false
    },
    strict: true
}

export default function dateTime({ timeZone }: { timeZone: string }) {
    const currentDateTime = new Intl.DateTimeFormat(
        'en-US', 
        {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }
    ).format(new Date())
    return { dateTime: currentDateTime }
}