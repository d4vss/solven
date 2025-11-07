import React from "react";

interface SpinnerProps {
  progress: number; // 0–100
  size?: number; // diameter in px
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

export default function CircularSpinner({
  progress,
  size = 80,
  strokeWidth = 8,
  color = "#3b82f6",
  trackColor = "#e5e7eb",
}: SpinnerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.35s ease" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
