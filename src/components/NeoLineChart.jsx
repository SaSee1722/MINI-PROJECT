import React, { useMemo } from 'react'

const NeoLineChart = ({ attendanceData = [], total = 1, className = '' }) => {
  const chartData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
      const dayRecords = attendanceData.filter(a => a.date === dateStr)
      const agg = new Map()
      for (const r of dayRecords) {
        const id = r.student_id
        if (!id) continue
        const prev = agg.get(id) || 'unmarked'
        const curr = r.status
        let next = prev
        if (curr === 'present') next = 'present'
        else if (curr === 'on_duty' && prev !== 'present') next = 'on_duty'
        else if (curr === 'absent' && prev !== 'present' && prev !== 'on_duty') next = 'absent'
        agg.set(id, next)
      }
      let present = 0
      let absent = 0
      for (const v of agg.values()) {
        if (v === 'present') present++
        else if (v === 'absent') absent++
      }
      const presentPct = total > 0 ? Math.round((present / total) * 100) : 0
      const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0
      days.push({ date: dateStr, day: dayName, present: presentPct, absent: absentPct })
    }
    return days
  }, [attendanceData, total])

  const pointsPresent = chartData.map((d, i) => ({ x: (i * 60) + 20, y: 180 - (d.present / 100) * 160 }))
  const pointsAbsent = chartData.map((d, i) => ({ x: (i * 60) + 20, y: 180 - (d.absent / 100) * 160 }))
  const pathPresent = pointsPresent.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const pathAbsent = pointsAbsent.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const lastIdx = chartData.length - 1
  const lastX = pointsPresent[lastIdx]?.x || 0
  const lastY = pointsPresent[lastIdx]?.y || 0
  const lastVal = chartData[lastIdx]?.present || 0

  return (
    <div className={`bg-neo-surface border border-neo-border rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-lg font-bold">Trend</h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full text-xs bg-black/30 border border-neo-border text-white">High</span>
          <span className="px-2 py-1 rounded-full text-xs text-neo-subtext">Medium</span>
          <span className="px-2 py-1 rounded-full text-xs text-neo-subtext">Low</span>
        </div>
      </div>
      <svg className="w-full h-56" viewBox="0 0 420 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="limeLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbff4d" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#cbff4d" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="violetLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b084ff" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#b084ff" stopOpacity="1"/>
          </linearGradient>
        </defs>
        <line x1="0" y1="60" x2="420" y2="60" stroke="rgba(255,255,255,0.08)" />
        <line x1="0" y1="110" x2="420" y2="110" stroke="rgba(255,255,255,0.08)" />
        <line x1="0" y1="160" x2="420" y2="160" stroke="rgba(255,255,255,0.08)" />
        <path d={pathPresent} stroke="url(#limeLine)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathAbsent} stroke="url(#violetLine)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="22" fill="#0f131a" stroke="#cbff4d" strokeWidth="3" />
        <text x={lastX} y={lastY} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize="12" fontWeight="700">{lastVal}%</text>
        {chartData.map((d, i) => (
          <text key={i} x={pointsPresent[i].x} y={195} textAnchor="middle" fill="#9aa3b2" fontSize="10">{d.day}</text>
        ))}
      </svg>
      
    </div>
  )
}

export default NeoLineChart