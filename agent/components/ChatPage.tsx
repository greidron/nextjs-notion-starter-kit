import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import cs from 'classnames'
import { AgentChatPageStatus, AgentEvent, AgentMessage, AgentMessageType, AgentResponse, AgentToolStatus, AgentToolStatusMap } from '../lib/types'
import { FaArrowUp } from '@react-icons/all-files/fa/FaArrowUp'
import { FaArrowDown } from '@react-icons/all-files/fa/FaArrowDown'
import { FaPaperPlane } from '@react-icons/all-files/fa/FaPaperPlane'
import { ChatMessage } from './ChatMessage'
import { toast } from 'react-toastify'
import useAutoScrollRef from './useAutoScrollRef'
import { camelCaseToWords } from '../lib/utils'

function InputTextArea({
    name,
    onChange,
    onFocused,
    onSubmit,
    placeholder,
    disabled,
}: {
    name?: string
    onChange: (value: string) => void,
    onFocused: (value: boolean) => void,
    onSubmit: () => void,
    placeholder?: string
    disabled?: boolean
}) {
    const divRef = useRef<HTMLDivElement>(null)
    const handleInput = (event) => {
        onChange && onChange(event.target.innerText)
    }
    const handleKeyDown = (event) => {
        if (event.altKey) {
            onFocused(true)
            if (event.keyCode === 13) {
                onSubmit()
            }
        }
    }
    useEffect(
        () => {
            if (divRef.current && disabled === true) {
                divRef.current.innerHTML = ''
            }
        }, 
        [disabled]
    )
    return <div 
        ref={divRef}
        contentEditable={!disabled}
        suppressContentEditableWarning 
        data-placeholder={placeholder}
        className={cs('agent-input-text-area')}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={() => onFocused(false)}
    >
    </div>
}

function ToolStatus({ statusMap }: { statusMap: AgentToolStatusMap }) {
    const AGENT_KEY = 'agent'
    if (Object.keys(statusMap).length === 0) {
        return null
    }
    if (statusMap[AGENT_KEY] && Object.keys(statusMap).length > 1) {
        statusMap[AGENT_KEY] = 'completed'
    }
    return <div className={cs('agent-tool-status')}>
    {
        Object.entries(statusMap).map(([tool, status]) => <ToolStatusLabel tool={tool} status={status} />)
    }
    </div>
 }

 function ToolStatusLabel({ tool, status }: { tool: string, status: AgentToolStatus }) {
    console.log('label', tool, status)
    switch (tool) {
        case 'agent':
            if (status !== 'completed') {
                return <p key={tool}>Preparing ...</p>
            }
        case 'web_search_call':
            switch (status) {
                case AgentToolStatus.IN_PROGRESS: return <p key={tool}>Web Searching ...</p>
            }
        default:
            switch (status) {
                case AgentToolStatus.PREPARE: return <p key={tool}>Preparing {camelCaseToWords(tool)} ...</p>
                case AgentToolStatus.IN_PROGRESS: return <p key={tool}>Processing {camelCaseToWords(tool)} ...</p>
            }
    }
    return null
 }


async function loadContext({
    setStatus,
    setMessages,
    setLastIndex,
}: {
    setStatus: Dispatch<SetStateAction<AgentChatPageStatus>>
    setMessages: Dispatch<SetStateAction<AgentMessage[]>>
    setLastIndex: Dispatch<SetStateAction<number>>
}) {
    setStatus(AgentChatPageStatus.LOADING)
    try {
        const response = await fetch('/api/agent/messages', { credentials: 'include' })
        if (!response.ok) {
            const data = await response.json()
            throw new Error(`cannot fetch messages: ${data?.error || 'unknown error'}`)
        }
        const messages = await response.json()
        setMessages(messages || [])
        setLastIndex(messages.length)
        setStatus(AgentChatPageStatus.READY)
    } catch (e) {
        toast.error(`failed to load context: ${e}`)
    }
}

async function startProcessing({
    message,
    setStatus,
    setMessage,
    lastIndex,
    setLastIndex,
    messages,
    setMessages,
    setToolStatusMap,
}: {
    message: string
    setStatus: Dispatch<SetStateAction<AgentChatPageStatus>>
    setMessage: Dispatch<SetStateAction<string>>
    lastIndex: number
    setLastIndex: Dispatch<SetStateAction<number>>
    messages: AgentMessage[]
    setMessages: Dispatch<SetStateAction<AgentMessage[]>>
    setToolStatusMap: Dispatch<SetStateAction<AgentToolStatusMap>>
}) {
    setStatus(AgentChatPageStatus.PROCESSING)
    const modifiedMessages = [...messages]
    const userMessage: AgentMessage = { type: AgentMessageType.USER, content: message }
    modifiedMessages.push(userMessage)
    ++lastIndex
    setMessages(modifiedMessages)
    setMessage('')
    
    try {
        const response = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify({ content: message }),
            credentials: 'include',
        })
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let partialData = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            partialData += decoder.decode(value);
            const lines = partialData.split('\n');
            partialData = lines.pop() || '';
            for (const line of lines) {
                if (!line.startsWith('data:')) {
                    continue
                }
                const response = JSON.parse(line.substring(5).trim()) as AgentResponse;
                switch (response.event) {
                    case AgentEvent.BEGIN:
                        userMessage.timestamp = response.timestamp
                        break
                    case AgentEvent.ADD:
                        setToolStatusMap({})
                        while (modifiedMessages.length <= lastIndex + response.contentIndex) {
                            modifiedMessages.push({ type: AgentMessageType.AGENT, content: '' })
                        }
                        setMessages([...modifiedMessages])
                        break
                    case AgentEvent.DELTA:
                        if (modifiedMessages.length <= lastIndex + response.contentIndex) {
                            toast.error(`invalid content delta with index: ${response.contentIndex}`)
                            continue
                        }
                        modifiedMessages[lastIndex + response.contentIndex].content += response.content
                        setMessages([...modifiedMessages])
                        break
                    case AgentEvent.FINALIZE:
                        {
                            if (modifiedMessages.length <= lastIndex + response.contentIndex) {
                                toast.error(`invalid content finalize with index: ${response.contentIndex}`)
                                continue
                            }
                            const message = modifiedMessages[lastIndex + response.contentIndex]
                            message.content = response.content
                            message.info = response.info
                            message.timestamp = response.timestamp
                            setMessages([...modifiedMessages])
                        }
                        break
                    case AgentEvent.INFO:
                        for (let index = lastIndex; index < modifiedMessages.length; ++index) {
                            modifiedMessages[index].info = response.info
                        }
                        break
                    case AgentEvent.END:
                        setMessages([...modifiedMessages])
                        setLastIndex(modifiedMessages.length)
                        setToolStatusMap({})
                        break
                    case AgentEvent.TOOL:
                        setToolStatusMap((prevMap) => ({ ...prevMap, [response?.tool?.type]: response?.tool?.status }))
                        break
                    case AgentEvent.ERROR:
                        if (response.errorMessage) {
                            toast.error(response.errorMessage)
                        }
                        break
                }
            }
        }
        setStatus(AgentChatPageStatus.READY)
    } catch (e) {
        toast.error(`failed to processing message: ${e}`)
        setTimeout(
            () => {
                setMessages([...modifiedMessages])
                setLastIndex(modifiedMessages.length)
                setStatus(AgentChatPageStatus.READY)
            }, 
            1000
        )
    }
}

export function ChatPage(props) {
    const [status, setStatus] = useState<AgentChatPageStatus>(AgentChatPageStatus.INIT)
    const [messages, setMessages] = useState<AgentMessage[]>([])
    const [lastIndex, setLastIndex] = useState<number>(0)
    const [message, setMessage] = useState('')
    const [focused, setFocused] = useState(false)
    const [toolStatusMap, setToolStatusMap] = useState<AgentToolStatusMap>({})
    const {
        ref: contentRef, 
        isAtTop, isAtBottom,
        setIsFollow, scrollToTop, scrollToBottom
    } = useAutoScrollRef<HTMLDivElement>()

    useEffect(() => { loadContext({ setStatus, setMessages, setLastIndex }) }, [])
    const handleCopy = (event) => {
        event.preventDefault()
        event.clipboardData.setData("text/plain", window.getSelection().toString())
    }
    const handleFocused = useCallback(
        (value: boolean) => {
            if (value === focused) {
                return
            }
            setFocused(value)
        },
        [focused]
    )
    const handleSubmit = useCallback(
        () => {
            setFocused(false)
            setIsFollow(isAtBottom)
            startProcessing({ message, setStatus, setMessage, lastIndex, setLastIndex, messages, setMessages, setToolStatusMap })
        },
        [isAtBottom, message, lastIndex, messages]
    )
    return <div className={cs('agent-content', 'agent-content-flex')}>
            <div ref={contentRef} onCopy={handleCopy} className={cs('agent-content-chat')}>
            {
                messages && messages.map((message, index) => (
                    <ChatMessage 
                        key={index} 
                        isUserMessage={message.type === AgentMessageType.USER} 
                        {...message}
                    />
                ))
            }
                <ToolStatus statusMap={toolStatusMap} />
            </div>
            <div className={cs('agent-content-inputbox')}>
                <InputTextArea 
                    onChange={setMessage}
                    onSubmit={handleSubmit}
                    onFocused={handleFocused}
                    placeholder='여기에 메시지를 입력해주세요.'
                    disabled={status !== AgentChatPageStatus.READY}
                />
                <div className={cs('agent-content-inputbox-control')}>
                    <div></div>
                    <div>
                        <button 
                            className={cs('submit-button', { focused })}
                            disabled={status !== AgentChatPageStatus.READY || message.trim().length === 0}
                            onClick={handleSubmit}
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
                {
                    (!isAtBottom && status === AgentChatPageStatus.READY)
                    && (
                        <div className={cs('agent-content-control', 'no-scroll-trigger')}>
                        {
                            !isAtTop && (
                                <button className={cs('control-button')} onClick={scrollToTop}>
                                    <FaArrowUp />
                                </button>
                            )
                        }
                        {
                            !isAtBottom && (
                                <button className={cs('control-button')} onClick={scrollToBottom}>
                                    <FaArrowDown />
                                </button>
                            )
                        }
                        </div>
                    )
                }
            </div>
        </div>
}