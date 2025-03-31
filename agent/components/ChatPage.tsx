import * as React from 'react'
import cs from 'classnames'
import { FiGithub } from '@react-icons/all-files/fi/FiGithub'
import { signIn } from 'next-auth/react';

export function ChatPage(props) {
    return <div className={cs('agent-content', 'agent-content-single')}>
            <div style={{display: 'flex'}}>
                <div>LOGGED IN</div>
            </div>
        </div>
}