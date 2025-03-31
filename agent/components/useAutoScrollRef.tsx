import { useEffect, useRef, useState, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export default function useAutoScrollRef<T extends HTMLElement>({
    smooth = true,
    nearRange = 20,
    delayInMillis = 100,
    maxDelayInMillis = 500,
}: {
    smooth?: boolean
    nearRange?: number
    delayInMillis?: number
    maxDelayInMillis?: number
} = {}) {
    const behavior = smooth? 'smooth' : 'auto'
    const ref = useRef<T>(null)
    const scrollHeight = useRef(0)
    const isFirstRender = useRef(true)
    const isFollow = useRef(true)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const [isAtTop, setIsAtTop] = useState(true)

    const handleScroll = useDebouncedCallback(
        useCallback(() => {
            const el = ref.current
            if (!el) return
    
            const scrollTop = el.scrollTop
            const scrollBottom = el.scrollHeight - scrollTop - el.clientHeight
    
            setIsAtTop(scrollTop <= nearRange)
            setIsAtBottom(scrollBottom <= nearRange)
        }, []),
        delayInMillis,
        { maxWait: maxDelayInMillis }
    )

    const scrollToBottom = useDebouncedCallback(
        useCallback(() => {
            const el = ref.current
            if (!el || isAtBottom) return
            el.scrollTo({ top: el.scrollHeight, behavior })
        }, [isAtBottom]),
        delayInMillis,
        { maxWait: maxDelayInMillis }
    )
    const scrollToTop = useDebouncedCallback(
        useCallback(() => {
            const el = ref.current
            if (!el || isAtTop) return
            el.scrollTo({ top: 0, behavior })
        }, [isAtTop]),
        delayInMillis,
        { maxWait: maxDelayInMillis }
    )
    const scrollToFollow = useDebouncedCallback(
        useCallback(() => {
            const el = ref.current
            if (!el || !isFollow.current || scrollHeight.current === el.scrollHeight) return
    
            el.scrollTo({ top: el.scrollHeight, behavior: isFirstRender.current? 'instant' : behavior })
            scrollHeight.current = el.scrollHeight
            isFirstRender.current = false
        }, [isAtBottom]),
        delayInMillis / 2,
        { maxWait: maxDelayInMillis / 2 }
    )

    useEffect(() => {
        const el = ref.current
        if (!el) return

        el.addEventListener('scroll', handleScroll)
        return () => el.removeEventListener('scroll', handleScroll)
    }, [handleScroll])

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const observer = new MutationObserver(scrollToFollow)
        observer.observe(el, {
            childList: true,
            subtree: true,
            characterData: true,
        })

        return () => observer.disconnect()
    }, [isAtBottom])

    return {
        ref,
        scrollToBottom,
        scrollToTop,
        setIsFollow: (value: boolean) => isFollow.current = value,
        isAtBottom,
        isAtTop,
        isFollow: isFollow.current,
    }
}
