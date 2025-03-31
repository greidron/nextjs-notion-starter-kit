import { useEffect, useRef, useState } from 'react'
import cs from 'classnames'
import { FiGithub } from '@react-icons/all-files/fi/FiGithub'
import { signIn } from 'next-auth/react';
import { ChatMessage } from './ChatMessage';

function InputTextArea({  
    name,
    onChange, 
    placeholder 
}: {
    name?: string
    onChange: (value: string) => void,
    placeholder?: string
}) {
    const divRef = useRef<HTMLDivElement>(null)
    const handleInput = (event) => {
        onChange && onChange(event.target.innerText)
    }
    return <div 
        ref={divRef}
        contentEditable 
        suppressContentEditableWarning 
        data-placeholder={placeholder}
        className={cs('agent-input-text-area')}
        onInput={handleInput}
    >
    </div>
}

export function ChatPage(props) {
    const [message, setMessage] = useState('')
    return <div className={cs('agent-content', 'agent-content-flex')}>
            <div className={cs('agent-content-chat')}>
            </div>
            <div className={cs('agent-content-inputbox')}>
                <InputTextArea onChange={setMessage} placeholder='여기에 메시지를 입력해주세요.' />
            </div>
        </div>
}