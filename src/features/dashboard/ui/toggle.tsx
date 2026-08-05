import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <div className="toggle-wrap">
      <label className="toggle">
        <input
          type="checkbox"
          checked={!!checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-sl" />
      </label>
      <span className={checked ? "tl-yes" : "tl-no"}>{checked ? "نعم" : "لا"}</span>
    </div>
  );
}
