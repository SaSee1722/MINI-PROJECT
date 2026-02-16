import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { LogoPremium } from '../components/Logo'
import { 
  Zap, 
  Shield, 
  BarChart3, 
  Clock, 
  Globe, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Smartphone,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  Sparkles
} from 'lucide-react'

// Custom hook for Intersection Observer
const useScrollReveal = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        if (options.once) observer.unobserve(entry.target)
      }
    }, { threshold: 0.1, ...options })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [options])

  return [ref, isVisible]
}

// Counting Stats Animation
const Counter = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0)
  const [ref, isVisible] = useScrollReveal({ once: true })

  useEffect(() => {
    if (!isVisible) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const currentCount = progress * end
      setCount(end % 1 === 0 ? Math.floor(currentCount) : currentCount.toFixed(1))
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [isVisible, end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

// Animated Feature Card
const FeatureCard = ({ icon: Icon, title, description, color, delay }) => {
  const [ref, isVisible] = useScrollReveal({ once: true })
  
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500/10',
      hoverBg: 'group-hover:bg-emerald-500/20',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-400'
    },
    blue: {
      bg: 'bg-blue-500/10',
      hoverBg: 'group-hover:bg-blue-500/20',
      border: 'border-blue-500/20',
      icon: 'text-blue-400'
    },
    purple: {
      bg: 'bg-purple-500/10',
      hoverBg: 'group-hover:bg-purple-500/20',
      border: 'border-purple-500/20',
      icon: 'text-purple-400'
    }
  }

  const theme = colorClasses[color] || colorClasses.emerald

  return (
    <div 
      ref={ref}
      className={`group relative p-8 rounded-[2rem] bg-[#0a0a0a] border border-white/10 hover:border-${color === 'emerald' ? 'emerald' : color === 'blue' ? 'blue' : 'purple'}-500/30 transition-all duration-700 overflow-hidden ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`absolute -top-10 -right-10 w-32 h-32 ${theme.bg} rounded-full blur-3xl ${theme.hoverBg} transition-all duration-700`}></div>
      <div className={`w-14 h-14 rounded-2xl ${theme.bg} flex items-center justify-center mb-6 border ${theme.border} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
        <Icon className={theme.icon} size={28} />
      </div>
      <h3 className="text-xl font-black text-white mb-4 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
        {title}
      </h3>
      <p className="text-gray-500 font-medium leading-relaxed group-hover:text-gray-400 transition-colors">
        {description}
      </p>
    </div>
  )
}

// Stats Component
const StatsSection = () => {
  const stats = [
    { label: 'Tracking Accuracy', value: 99.9, suffix: '%', icon: Award },
    { label: 'Sync Latency', value: 0.2, suffix: 's', icon: Zap },
    { label: 'Time Saved Daily', value: 45, suffix: 'm', icon: Clock },
    { label: 'Active Deployments', value: 12, suffix: '+', icon: Globe },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
      {stats.map((stat, i) => (
        <div key={i} className="text-center group">
          <div className="flex justify-center mb-4">
             <stat.icon size={20} className="text-emerald-500/50 group-hover:text-emerald-400 group-hover:scale-125 transition-all duration-500" />
          </div>
          <div className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-1">
            <Counter end={stat.value} suffix={stat.suffix} />
          </div>
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30 selection:text-emerald-400 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[150px] transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)` }}
        ></div>
        <div 
          className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[150px] transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${-mousePos.x * 0.05}px, ${-mousePos.y * 0.05}px)` }}
        ></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'py-4 bg-black/80 backdrop-blur-xl border-b border-white/5' : 'py-8'}`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
              <LogoPremium size="default" />
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter">SMART</span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] group-hover:text-emerald-400 transition-colors">PRESENCE</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {[
              { label: 'Vision', id: 'vision' },
              { label: 'Technology', id: 'technology' },
              { label: 'Impact', id: 'impact' },
              { label: 'Access', id: 'access' }
            ].map((item) => (
              <button 
                key={item.label} 
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all hover:tracking-[0.4em]"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="group relative px-6 py-3 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 overflow-hidden">
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section id="vision" className="pt-60 pb-40 overflow-hidden">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-10 animate-smoothSlideUp">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Sparkles size={12} />
                Institutional Intelligence v4.0
              </span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl md:text-[10rem] font-black tracking-tighter leading-[0.95] sm:leading-[0.85] mb-8 sm:mb-12 animate-smoothSlideUp relative group">
              <span className="inline-block hover:scale-[1.02] hover:-rotate-1 transition-transform cursor-default">ATTENDANCE</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 animate-gradient">EVOLVED.</span>
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </h1>

            <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl font-medium leading-relaxed mb-16 animate-smoothSlideUp" style={{ animationDelay: '200ms' }}>
              A high-performance ecosystem designed for modern academic institutions.
              <span className="text-white"> Real-time tracking. </span>
              <span className="text-emerald-400"> Deep analytics. </span>
              No friction.
            </p>

            <div className="max-w-3xl mx-auto mb-16 sm:mb-24 px-6 sm:px-8 py-8 sm:py-10 bg-[#0a0a0a] border border-white/10 rounded-3xl sm:rounded-[3rem] animate-smoothSlideUp relative group backdrop-blur-sm shadow-2xl" style={{ animationDelay: '300ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]"></div>
              <p className="relative z-10 text-gray-400 font-medium leading-relaxed italic text-base sm:text-lg group-hover:text-gray-200 transition-colors">
                "Our vision is to bridge the gap between administrative overhead and academic excellence through seamless, transparent, and intelligent presence tracking."
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-smoothSlideUp" style={{ animationDelay: '400ms' }}>
              <Link to="/signup" className="w-full sm:w-auto px-12 py-6 bg-white text-black rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-emerald-500/20 active:scale-95">
                Deploy Now
                <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-12 py-6 bg-white/[0.05] border border-white/10 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-white/[0.1] hover:border-white/20 transition-all backdrop-blur-md">
                Explore Core
              </button>
            </div>
          </div>
        </section>

        {/* Intelligence Specs Section */}
        <section id="technology" className="py-40 border-y border-white/5 relative bg-white/[0.01]">
          <div className="container mx-auto px-6">
            <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-10">
              <div className="max-w-xl">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter mb-6 uppercase">
                   Engineered for<br />
                   <span className="text-4xl sm:text-5xl md:text-7xl text-emerald-500 italic animate-pulse">Precision.</span>
                </h2>
                <p className="text-gray-500 font-medium text-base sm:text-lg leading-relaxed">
                  We've rebuilt the core attendance logic from the ground up to support high-traffic environments while maintaining millisecond-level responsiveness.
                </p>
              </div>
              <div className="flex-shrink-0 group">
                <div className="p-8 bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] backdrop-blur-md hover:border-emerald-500/40 transition-all duration-500 shadow-xl">
                   <div className="flex items-center gap-8">
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Architecture</p>
                        <p className="text-lg font-black text-white">Cloud-Native Sync</p>
                      </div>
                      <div className="w-[1px] h-10 bg-white/10 group-hover:h-12 group-hover:bg-emerald-500/30 transition-all"></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Engine</p>
                        <p className="text-lg font-black text-white">Real-Time Core</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={BarChart3}
                title="Deep Intelligence"
                description="Go beyond counts. Extract behavioral trends, period patterns, and department-wide insights with a single tap."
                color="emerald"
                delay={0}
              />
              <FeatureCard 
                icon={Smartphone}
                title="Staff Empowerment"
                description="Staff dashboards optimized for speed. Handle thousands of logs with zero overhead using our simplified logic."
                color="blue"
                delay={200}
              />
              <FeatureCard 
                icon={Shield}
                title="Zero-Protocol Security"
                description="Multi-layer data protection prevents tampering. Every entry is logged with precise temporal metadata."
                color="purple"
                delay={400}
              />
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section id="impact" className="py-40 bg-black relative">
          <div className="container mx-auto px-6 mb-24 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-16 uppercase relative inline-block group">
              Quantifiable<br />
              <span className="text-emerald-500 group-hover:text-blue-400 transition-colors duration-1000">Impact.</span>
              <div className="absolute -bottom-4 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
            </h2>
            <StatsSection />
          </div>
        </section>

        {/* Access Section (Workflow) */}
        <section id="access" className="py-40 border-t border-white/5 relative overflow-hidden group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rotate-12 scale-150"></div>
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-32">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-4 animate-pulse">The Protocol</p>
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">
                Three steps to total<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500 animate-gradient">Control.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
              <div className="hidden lg:block absolute top-[60px] left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0"></div>
              
              {[
                { id: '01', title: 'Provision Class', desc: 'Initialize your institutional structure. Import students and subjects via CSV or manual entry in seconds.', icon: Layers },
                { id: '02', title: 'Execute Session', desc: 'Staff mark presence live. Real-time synchronization ensures no data is lost even on unstable networks.', icon: Zap },
                { id: '03', title: 'Extract Intel', desc: 'Generate PDF reports, export intelligence feeds for Deans, and track growth metrics automatically.', icon: FileText }
              ].map((step, i) => (
                <div key={i} className="relative group/step flex flex-col items-center lg:items-start text-center lg:text-left hover:-translate-y-4 transition-transform duration-500">
                   <div className="w-24 h-24 rounded-[2rem] bg-[#0a0a0a] border border-white/10 flex items-center justify-center mb-10 group-hover/step:bg-emerald-500 group-hover/step:border-emerald-500 group-hover/step:rotate-12 transition-all duration-700 relative z-10 shadow-2xl">
                      <step.icon size={32} className="text-emerald-400 group-hover/step:text-black transition-colors duration-500" />
                      <div className="absolute -top-6 -right-6 text-5xl font-black text-white/5 transition-opacity italic group-hover/step:opacity-20">{step.id}</div>
                   </div>
                   <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase group-hover/step:text-emerald-400 transition-colors">{step.title}</h3>
                   <p className="text-gray-500 font-medium leading-relaxed max-w-sm group-hover/step:text-gray-400 transition-colors">
                     {step.desc}
                   </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner Section */}
        <section className="py-40">
          <div className="container mx-auto px-6">
             <div className="relative p-16 md:p-32 rounded-[4rem] bg-[#0a0a0a] border border-white/10 overflow-hidden group hover:border-emerald-500/30 transition-all duration-700 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
                   <div className="max-w-2xl text-center lg:text-left">
                      <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter mb-8 sm:mb-10 leading-[1] sm:leading-[0.85] uppercase">
                        Ready to deploy<br />
                        <span className="text-emerald-500 italic">Smart Presence?</span>
                      </h2>
                      <p className="text-gray-400 text-lg sm:text-xl font-medium tracking-tight mb-10 sm:mb-12">
                        Join modern departments elevating their administrative standards today. No credit card required to start.
                      </p>
                      <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                         {['Vercel Optimized', 'Privacy First', 'SSL Certified', 'Cloud Sync'].map(tag => (
                           <div key={tag} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-3 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-300">
                             <CheckCircle2 size={14} className="text-emerald-500" />
                             {tag}
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="flex-shrink-0 animate-bounce-slow mt-8 lg:mt-0">
                      <Link to="/signup" className="relative px-12 sm:px-20 py-6 sm:py-10 bg-emerald-500 hover:bg-emerald-400 text-black text-sm sm:text-base font-black uppercase tracking-[0.3em] rounded-3xl sm:rounded-[2.5rem] transition-all shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:scale-[1.05] active:scale-95 flex items-center gap-4 group/btn overflow-hidden">
                        <span className="relative z-10">Activate Hub</span>
                        <ChevronRight size={24} className="group-hover/btn:translate-x-3 transition-transform relative z-10" />
                        <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-20 transition-opacity"></div>
                      </Link>
                   </div>
                </div>
             </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-32 border-t border-white/5 relative z-10 bg-[#020202]">
        <div className="container mx-auto px-6 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
            <div className="flex flex-col items-center lg:items-start gap-6">
              <Link to="/" className="flex items-center gap-4 group">
                <LogoPremium size="default" className="group-hover:rotate-12 transition-transform" />
                <div className="text-left">
                  <span className="text-2xl font-black tracking-tighter block text-white">SMART PRESENCE</span>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest tracking-[0.3em]">Institutional Core</span>
                </div>
              </Link>
              <p className="text-gray-600 text-sm max-w-xs font-medium italic">"Crafting digital ecosystems with precision and institutional intelligence."</p>
            </div>

            <div className="flex flex-col items-center lg:items-end group">
              <div className="px-8 py-6 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-md hover:border-emerald-500/30 transition-all duration-500 flex flex-col items-center lg:items-end">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-3 animate-pulse">DESIGNED & ENGINEERED BY</span>
                <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase relative">
                  SALABADESHWARAN.S
                  <div className="absolute -bottom-2 right-0 w-1/2 h-[2px] bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-right"></div>
                </h2>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-8 h-[1px] bg-white/10"></div>
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em]">MINI PROJECT v4.0</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em]">© 2025 ALL PROTOCOLS RESERVED.</span>
            <div className="flex items-center gap-4">
               {['Language: EN', 'Status: Operational'].map(stat => (
                 <div key={stat} className="px-4 py-2 bg-white/5 rounded-lg text-[8px] font-black text-gray-600 uppercase tracking-widest border border-white/5">
                   {stat}
                 </div>
               ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Embedded Styles for smooth animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes smoothSlideUp {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes smoothFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-smoothSlideUp {
          animation: smoothSlideUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-smoothFadeIn {
          animation: smoothFadeIn 1.2s ease-out forwards;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 300% 300%;
          animation: gradientMove 6s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b981; border-radius: 2px; }
      `}} />
    </div>
  )
}

export default LandingPage
