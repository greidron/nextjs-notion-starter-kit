import { createPortal } from 'react-dom'
import cs from 'classnames'
import { ReactNode } from 'react'

export function Modal({ onClose, children }: { onClose: () => void, children?: ReactNode}) {
  return createPortal(
    <div className={cs('agent-modal-overlay')} onClick={onClose}>
      <div className={cs('agent-modal-panel')} onClick={(e) => e.stopPropagation()}>
        <div className={cs('agent-modal-body')}>
        {children}
        </div>
        <div className={cs('agent-modal-footer')}>
            <button className={cs('agent-modal-button')} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  )
}