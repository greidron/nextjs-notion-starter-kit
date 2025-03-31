import * as React from 'react'
import cs from 'classnames'
import { FiGithub } from '@react-icons/all-files/fi/FiGithub'
import { signIn } from 'next-auth/react';


function LoginButton({ iconComponent: IconComponent, label, onClick = null, className = null }) {
    return <button onClick={onClick} className={cs('agent-login-button', className)}>
        <IconComponent />
        <span>
            Continue with {label}
        </span>
    </button>
}

export function LoginPage(props) {
    return <div className={cs('agent-content', 'agent-content-single')}>
            <div style={{display: 'flex'}}>
                <LoginButton 
                    iconComponent={FiGithub} 
                    label='Github' 
                    className={cs('agent-login-github-button')}
                    onClick={() => signIn("github")}
                />
            </div>
        </div>
}