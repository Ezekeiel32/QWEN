import React from "react";

interface InstrumentSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  size?: number;
}

export default function InstrumentSwitch({ value, onChange, size = 48 }: InstrumentSwitchProps) {
  return (
    <svg
      width={size}
      height={size / 2}
      viewBox="0 0 48 24"
      style={{ cursor: "pointer", filter: "drop-shadow(0 0 8px #00ffe7)" }}
      onClick={() => onChange(!value)}
    >
      <rect x="2" y="4" width="44" height="16" rx="8" fill="#18181b" stroke="#00ffe7" strokeWidth="3" />
      <circle
        cx={value ? 36 : 12}
        cy="12"
        r="8"
        fill={value ? "#ffe066" : "#222"}
        stroke="#00ffe7"
        strokeWidth="2"
        filter={value ? "drop-shadow(0 0 12px #ffe066)" : undefined}
      />
    </svg>
  );
} 