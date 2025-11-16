import React from 'react'

const NeoCard = ({ title, subtitle, right, children, className = '' }) => {
  return (
    <div className={`bg-neo-surface border border-neo-border rounded-2xl shadow-neo p-6 ${className}`}>
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-white text-lg font-bold">{title}</h3>}
            {subtitle && <p className="text-neo-subtext text-sm mt-1">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export default NeoCard