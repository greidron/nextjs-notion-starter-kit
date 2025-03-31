import * as React from 'react'
import cs from 'classnames'

export function ChatMessage({
    isUserMessage,
    content
}: {
    isUserMessage?: boolean,
    content?: string
}) {
    return <div className={cs('agent-chat-message', {'bubble': isUserMessage})}>
        <div className={cs('content')}>
        {content}
        </div>
    </div>
}