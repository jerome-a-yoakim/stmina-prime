import React from "react";

interface ProgBarProps {
  pct: number;
  color?: string;
}

export function ProgBar({ pct, color }: ProgBarProps) {
  return (
    <div className="prog-wrap">
      <div
        className="prog"
        style={{ width: `${pct}%`, background: color || "var(--indigo)" }}
      />
    </div>
  );
}
