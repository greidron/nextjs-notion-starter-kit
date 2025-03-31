import * as React from 'react'
import cs from 'classnames'
import { HiOutlineMenuAlt2 } from '@react-icons/all-files/hi/HiOutlineMenuAlt2'
import { BiSidebar } from '@react-icons/all-files/bi/BiSidebar'
import { GoHubot } from '@react-icons/all-files/go/GoHubot'

export function Header({
    session,
    isShowSidebar,
    isDesktopScreen,
    setIsShowSidebar,
} : {
    session?: any
    isShowSidebar?: boolean
    isDesktopScreen?: boolean
    setIsShowSidebar?: React.Dispatch<React.SetStateAction<boolean>>
}) {
    return <div id='agent-header' className={cs('agent-header')}>
        <div className={cs('agent-header-navbar')}>
            <div className={cs('item')}>
                <button 
                    disabled={!session} 
                    className={cs('button')} 
                    onClick={() => setIsShowSidebar && setIsShowSidebar(!isShowSidebar)}
                >
                {
                    isDesktopScreen ? <BiSidebar /> : <HiOutlineMenuAlt2 />
                }
                </button>
            </div>
            <div>
                <div className={cs('title', 'button')}>
                    <GoHubot />
                </div>
            </div>
            <div className={cs('item')}></div>
        </div>
    </div>
}