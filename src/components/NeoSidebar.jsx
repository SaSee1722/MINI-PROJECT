import React from 'react'
import { Home, BarChart3, Users, FileText, Settings } from 'lucide-react'

const Item = ({ icon: Icon, active = false }) => (
  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-neo-muted text-white' : 'bg-black/30 text-neo-subtext'} border border-neo-border`}> 
    <Icon size={22} />
  </div>
)

const NeoSidebar = ({ className = '' }) => {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <Item icon={Home} active />
      <Item icon={BarChart3} />
      <Item icon={Users} />
      <Item icon={FileText} />
      <Item icon={Settings} />
    </div>
  )
}

export default NeoSidebar