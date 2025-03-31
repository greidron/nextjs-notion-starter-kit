import * as React from 'react'
import cs from 'classnames'
import { Markdown } from './Markdown'

export function ChatMessage({
    isUserMessage,
    content
}: {
    isUserMessage?: boolean,
    content?: string
}) {
    return <div className={cs('agent-chat-message', {'bubble': isUserMessage})}>
        <div className={cs('content')}>
        {
            isUserMessage
            ? content
            : <Markdown content={content} />
        }
        </div>
    </div>
}