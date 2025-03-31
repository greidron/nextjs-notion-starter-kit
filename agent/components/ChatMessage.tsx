import { useState } from 'react'
import cs from 'classnames'
import { Markdown } from './Markdown'
import { formatDateOrTime } from '../lib/utils'
import { FaInfo } from '@react-icons/all-files/fa/FaInfo'
import { Modal } from './Modal'
import { AgentInfo } from '../lib/types'

export function ChatMessage({
    isUserMessage,
    content,
    timestamp,
    info,
}: {
    isUserMessage?: boolean,
    content?: string
    timestamp?: number
    info?: AgentInfo
}) {
    const [isShowTooltip, setIsShowTooltip] = useState<boolean>(false)
    const [isShowInfoModal, setIsShowInfoModal] = useState<boolean>(false)
    const handleShowInfoModal = () => {
        setIsShowTooltip(false)
        setIsShowInfoModal(true)
    }
    return <div
        className={cs('agent-chat-message', {'bubble': isUserMessage})}
        onMouseEnter={() => setIsShowTooltip(true)}
        onMouseLeave={() => setIsShowTooltip(false)}
    >
        <div className={cs('row')}>
            <div className={cs('content')}>
            {
                isUserMessage
                ? content
                : <Markdown content={content} />
            }
            </div>
        </div>
        <div className={cs('footer')}>
            <div className={cs('timestamp')}>
            {
                timestamp
                    ? formatDateOrTime(timestamp)
                    : '⠀'
            }
            </div>
            {
                isShowTooltip && (
                    <div className={cs('tooltip')}>
                    {
                        !isUserMessage && (
                            <button onClick={handleShowInfoModal}><FaInfo /></button>
                        )
                    }
                    </div>
                )
            }
        </div>
        {
            isShowInfoModal && (
                <Modal onClose={() => setIsShowInfoModal(false)}>
                {JSON.stringify(info)}
                </Modal>
            )
        }
    </div>
}