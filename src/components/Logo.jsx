import React from 'react'

// Modern Professional Logo for Smart Presence
const Logo = ({ size = 'default', variant = 'full', className = '' }) => {
  const sizes = {
    small: { width: 32, height: 32, text: 'text-lg' },
    default: { width: 48, height: 48, text: 'text-2xl' },
    large: { width: 64, height: 64, text: 'text-3xl' },
    xlarge: { width: 80, height: 80, text: 'text-4xl' }
  }

  const { width, height, text } = sizes[size] || sizes.default

  // Icon Only Variant - Bold and Visible
  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        <svg
          width={width}
          height={height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Solid Background Circle - High Visibility */}
          <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" filter="url(#glow)" />
          
          {/* White Checkmark - Bold and Clear */}
          <path
            d="M 30 48 L 42 62 L 70 32"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    )
  }

  // Minimal Variant (Just SP)
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg ${className}`} style={{ width, height }}>
        <span className={`${text} font-black text-black`}>SP</span>
      </div>
    )
  }

  // Full Logo with Text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <div className="relative" style={{ width, height }}>
        <svg
          width={width}
          height={height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
            <linearGradient id="accentGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="glowFull">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <circle cx="50" cy="50" r="48" fill="url(#logoGradientFull)" opacity="0.1" />
          
          <g transform="translate(50, 50)">
            <circle cx="0" cy="-8" r="10" fill="url(#logoGradientFull)" />
            <path
              d="M -15 15 Q -15 5, 0 5 Q 15 5, 15 15 L 15 20 L -15 20 Z"
              fill="url(#logoGradientFull)"
            />
            
            <path
              d="M -8 8 L -3 13 L 12 -5"
              stroke="url(#accentGradientFull)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#glowFull)"
            />
          </g>

          <circle cx="20" cy="20" r="3" fill="#10b981" opacity="0.6" />
          <circle cx="80" cy="80" r="3" fill="#34d399" opacity="0.6" />
          <circle cx="80" cy="20" r="2" fill="#6ee7b7" opacity="0.4" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex flex-col leading-none">
        <span className={`${text} font-black tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent`}>
          SMART
        </span>
        <span className={`${text} font-black tracking-tight text-white`}>
          PRESENCE
        </span>
      </div>
    </div>
  )
}

// Alternative Logo Design - Geometric Style
export const LogoGeometric = ({ size = 'default', className = '' }) => {
  const sizes = {
    small: 32,
    default: 48,
    large: 64,
    xlarge: 80
  }

  const dimension = sizes[size] || sizes.default

  return (
    <div className={`relative ${className}`} style={{ width: dimension, height: dimension }}>
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="geoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Hexagon Base */}
        <path
          d="M 50 5 L 85 27.5 L 85 72.5 L 50 95 L 15 72.5 L 15 27.5 Z"
          fill="url(#geoGradient)"
          opacity="0.2"
        />
        
        {/* Inner Hexagon */}
        <path
          d="M 50 15 L 75 30 L 75 70 L 50 85 L 25 70 L 25 30 Z"
          stroke="url(#geoGradient)"
          strokeWidth="3"
          fill="none"
        />

        {/* Checkmark */}
        <path
          d="M 35 50 L 45 60 L 65 35"
          stroke="#10b981"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  )
}

// Alternative Logo Design - Modern Minimal
export const LogoModern = ({ size = 'default', className = '' }) => {
  const sizes = {
    small: 32,
    default: 48,
    large: 64,
    xlarge: 80
  }

  const dimension = sizes[size] || sizes.default

  return (
    <div className={`relative ${className}`} style={{ width: dimension, height: dimension }}>
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="modernGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
        </defs>

        {/* Rounded Square */}
        <rect
          x="10"
          y="10"
          width="80"
          height="80"
          rx="20"
          fill="url(#modernGradient)"
        />

        {/* Letter S */}
        <path
          d="M 35 30 Q 50 25, 65 30 Q 70 35, 65 40 L 50 50 L 35 60 Q 30 65, 35 70 Q 50 75, 65 70"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Letter A (checkmark style) */}
        <path
          d="M 40 65 L 50 75 L 70 50"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.8"
        />
      </svg>
    </div>
  )
}

export default Logo
