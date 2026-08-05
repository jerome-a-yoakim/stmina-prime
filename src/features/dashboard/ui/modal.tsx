import React from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  large?: boolean;
}

export function Modal({ title, onClose, children, footer, large }: ModalProps) {
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${large ? "modal-lg" : ""}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
