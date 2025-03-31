import { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlight } from 'react-syntax-highlighter'
import { a11yDark as dark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import parse from 'html-react-parser'
import DOMPurify from 'dompurify'
import rehypeRaw from 'rehype-raw'

function CodeComponent({ inline, className, ...props }) {
    if (inline) {
        return <SimpleCode className={className} {...props}  />
    }
    if (className === 'language-svg') {
        return <Svg content={String(props.children)} />
    }
    const match = /language-(\w+)/.exec(className || '')
    return match
        ? (
            <SyntaxHighlight
                style={dark}
                language={match[1]}
                PreTag='div'
                {...props}
            >
                {String(props.children).replace(/\n$/, '')}
            </SyntaxHighlight>
        )
        : (
            <SimpleCode className={className} {...props}  />
        )
}

function Svg({
    content
}: {
    content?: string
}) {
    return <>{parse(DOMPurify.sanitize(content, { USE_PROFILES: { svg: true } }))}</>
}

function SimpleCode({
    className, 
    children, 
    ...props
}: {
    className?: string,
    children?: ReactNode
}) {
    return <code className={className} {...props}>
        {children}
    </code>
}

export function Markdown({
    content,
}: { 
    content: string
}) {
    return (
        <ReactMarkdown rehypePlugins={[rehypeRaw]}
            children={content}
            components={{
                code: CodeComponent,
            }}
        />
    );
}