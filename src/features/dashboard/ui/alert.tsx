import React from "react";

interface AlertProps {
  type: "success" | "error" | "warn" | "info" | string;
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({ type, children, onClose }: AlertProps) {
  return (
    <div className={`alert alert-${type}`}>
      {children}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginRight: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            color: "inherit"
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
