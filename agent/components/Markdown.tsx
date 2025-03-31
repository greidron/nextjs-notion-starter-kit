import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlight } from 'react-syntax-highlighter'
import { a11yDark as dark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

export function Markdown({
    content,
}: { 
    content: string
}) {
    return (
        <ReactMarkdown
            children={content}
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                        <SyntaxHighlight
                            style={dark}
                            language={match[1]}
                            PreTag='div'
                            {...props}
                        >
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlight>
                    ) : (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
            }}
        />
    );
}