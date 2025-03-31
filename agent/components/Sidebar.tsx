import * as React from 'react'
import cs from 'classnames'
import { Session } from 'next-auth'
import { UserProfile } from './UserProfile'

export function Sidebar({
    session,
    isShowSidebar,
    setIsShowSidebar,
} : {
    session?: Session
    isShowSidebar?: boolean
    setIsShowSidebar?: React.Dispatch<React.SetStateAction<boolean>>
}) {
    return <>
        <div className={cs('agent-sidebar', { open: isShowSidebar })}>
            <div className={cs('agent-sidebar-section')}></div>
            <div className={cs('agent-sidebar-section')}>
                <UserProfile session={session} />
            </div>
        </div>
        <div
            className={cs('agent-sidebar-overlay', { open: isShowSidebar })} 
            onClick={() => setIsShowSidebar && setIsShowSidebar(false)}
        />
    </>
}