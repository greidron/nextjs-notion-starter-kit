import * as React from 'react'
import cs from 'classnames'
import { Session } from 'next-auth'
import { BiDotsVerticalRounded } from '@react-icons/all-files/bi/BiDotsVerticalRounded'

export function UserProfile({
    session,
} : {
    session: Session
}) {
    return <div className={cs('agent-user-profile')}>
        <div className={cs('agent-user-profile')}>
        {
            session?.user?.image
            ? <img src={session.user.image} className={cs('icon')} />
            : <div className={cs('icon', 'background-block')} />
        }
        <span className={cs('name')}>{session?.user?.name}</span>
        </div>
        <div className={cs('agent-user-profile')}>
            <button className={cs('menu-button')}>
                <BiDotsVerticalRounded />
            </button>
        </div>
    </div>
}