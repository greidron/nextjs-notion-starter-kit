import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import cs from 'classnames'
import { AgentChatPageStatus, AgentMessage, AgentMessageType } from '../lib/types';
import { ChatMessage } from './ChatMessage';

function InputTextArea({
    name,
    onChange, 
    placeholder,
    disabled,
}: {
    name?: string
    onChange: (value: string) => void,
    placeholder?: string
    disabled?: boolean
}) {
    const divRef = useRef<HTMLDivElement>(null)
    const handleInput = (event) => {
        onChange && onChange(event.target.innerText)
    }
    return <div 
        ref={divRef}
        contentEditable={!disabled}
        suppressContentEditableWarning 
        data-placeholder={placeholder}
        className={cs('agent-input-text-area')}
        onInput={handleInput}
    >
    </div>
}

function handleStatusChange({
    status,
    setStatus,
    messages,
    setMessages,
}: {
    status: AgentChatPageStatus
    setStatus: Dispatch<SetStateAction<AgentChatPageStatus>>
    messages: AgentMessage[]
    setMessages: Dispatch<SetStateAction<AgentMessage[]>>
}) {
    switch (status) {
        case AgentChatPageStatus.INIT:
            setStatus(AgentChatPageStatus.LOADING)
            fetch('/api/agent/messages')
                .then(async response => {
                    const messages = await response.json()
                    setMessages(messages)
                    setStatus(AgentChatPageStatus.READY)
                })
            break
    }
}

export function ChatPage(props) {
    const [status, setStatus] = useState<AgentChatPageStatus>(AgentChatPageStatus.INIT)
    const [messages, setMessages] = useState<AgentMessage[]>([])
    const [message, setMessage] = useState('')

    useEffect(
        () => handleStatusChange({ 
            status, 
            setStatus,
            messages,
            setMessages
        }),
        [status]
    )

    return <div className={cs('agent-content', 'agent-content-flex')}>
            <div className={cs('agent-content-chat')}>
            {messages.map((message, index) => (
                <ChatMessage 
                    key={index} 
                    isUserMessage={message.type === AgentMessageType.USER} 
                    {...message}
                />
            ))}
            </div>
            <div className={cs('agent-content-inputbox')}>
                <InputTextArea 
                    onChange={setMessage}
                    placeholder='여기에 메시지를 입력해주세요.'
                    disabled={status !== AgentChatPageStatus.READY}
                />
            </div>
        </div>
}