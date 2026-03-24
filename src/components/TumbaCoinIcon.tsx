interface TumbaCoinIconProps {
  size?: number;
  className?: string;
}

export default function TumbaCoinIcon({ size = 24, className = "" }: TumbaCoinIconProps) {
  const id = `tc-${size}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Outer glow ring */}
      <circle cx="32" cy="32" r="31" fill="none" stroke={`url(#glow-${id})`} strokeWidth="1" opacity="0.5" />

      {/* Coin base */}
      <circle cx="32" cy="32" r="29" fill={`url(#base-${id})`} />

      {/* Inner rim */}
      <circle cx="32" cy="32" r="25" fill="none" stroke={`url(#rim-${id})`} strokeWidth="1.5" opacity="0.6" />

      {/* Shine highlight */}
      <ellipse cx="22" cy="18" rx="14" ry="10" fill="white" opacity="0.08" />

      {/* T letter — bold premium monogram */}
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        fill={`url(#letter-${id})`}
      >
        T
      </text>

      {/* Edge detail dots */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 32 + 27 * Math.cos(rad);
        const y = 32 + 27 * Math.sin(rad);
        return <circle key={angle} cx={x} cy={y} r="0.8" fill="#f0abfc" opacity="0.4" />;
      })}

      <defs>
        <radialGradient id={`base-${id}`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="40%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#701a75" />
        </radialGradient>
        <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#a21caf" />
        </linearGradient>
        <linearGradient id={`letter-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdf4ff" />
          <stop offset="100%" stopColor="#f0abfc" />
        </linearGradient>
        <linearGradient id={`glow-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e040fb" />
          <stop offset="100%" stopColor="#a21caf" />
        </linearGradient>
      </defs>
    </svg>
  );
}
