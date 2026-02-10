import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogoPremium } from '../components/Logo'

// Animated Hero Text Component - Dario.io Style
const AnimatedHeroText = () => {
  const words = ['TRACK', 'MANAGE', 'ANALYZE', 'SIMPLIFY', 'AUTOMATE']
  const [visibleWords, setVisibleWords] = useState([])
  
  useEffect(() => {
    // Show words one by one with stagger
    words.forEach((word, index) => {
      setTimeout(() => {
        setVisibleWords(prev => [...prev, word])
      }, index * 150) // 150ms stagger between each word
    })
  }, [])
  
  return (
    <div className="flex flex-col items-center gap-0 leading-none">
      {words.map((word, index) => (
        <div 
          key={index}
          className={`transform transition-all duration-700 ${
            visibleWords.includes(word) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          }`}
          style={{ 
            transitionDelay: `${index * 100}ms`,
          }}
        >
          <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300 inline-block cursor-default">
            {word}
          </span>
        </div>
      ))}
    </div>
  )
}

// Feature Card Component with Professional Icons
const FeatureCard = ({ icon, title, description, gradient, delay }) => {
  return (
    <div 
      className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl p-6 sm:p-8 hover:border-white/30 hover:shadow-2xl transition-all duration-700 hover:scale-[1.03] cursor-pointer animate-smoothFadeIn"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-4 sm:mb-6 transition-all duration-500 group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 group-hover:bg-gradient-to-r group-hover:from-green-400 group-hover:to-emerald-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500">
        {title}
      </h3>
      <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
        {description}
      </p>
    </div>
  )
}

// Stats Counter Component
const StatsCounter = ({ end, label, suffix = '' }) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = end / steps
    const stepDuration = duration / steps
    
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, stepDuration)
    
    return () => clearInterval(timer)
  }, [end])
  
  return (
    <div className="text-center animate-smoothFadeIn">
      <div className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
        {count}{suffix}
      </div>
      <div className="text-gray-400 text-sm sm:text-base uppercase tracking-wide">{label}</div>
    </div>
  )
}

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/80 backdrop-blur-lg border-b border-white/10' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-300 group">
              <LogoPremium size="default" />
              <div className="flex flex-col leading-none">
                <span className="text-lg sm:text-xl font-black tracking-tighter group-hover:text-emerald-400 transition-colors">SMART</span>
                <span className="text-xs sm:text-sm font-bold tracking-widest text-gray-500 group-hover:text-white transition-colors">PRESENCE</span>
              </div>
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              <Link 
                to="/login" 
                className="px-4 sm:px-6 py-2 sm:py-2.5 text-white hover:text-green-400 transition-colors duration-300 font-semibold text-sm sm:text-base"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-green-500/50 text-sm sm:text-base"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-float-delayed"></div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-2 sm:mb-3 animate-smoothFadeIn tracking-tight">
              Let's
            </h1>
            <div className="my-4 sm:my-6">
              <AnimatedHeroText />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mt-2 sm:mt-3 animate-smoothFadeIn tracking-tight" style={{ animationDelay: '800ms' }}>
              Attendance
            </h1>
          </div>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed animate-smoothFadeIn" style={{ animationDelay: '1000ms' }}>
            The modern way to track, manage, and analyze attendance. 
            <span className="text-white font-semibold"> Powerful.</span>
            <span className="text-green-400 font-semibold"> Simple.</span>
            <span className="text-emerald-400 font-semibold"> Smart.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 animate-smoothFadeIn" style={{ animationDelay: '1200ms' }}>
            <Link 
              to="/signup" 
              className="w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-base sm:text-lg transition-all duration-500 hover:scale-105 shadow-2xl hover:shadow-green-500/50"
            >
              Get Started
            </Link>
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/40 rounded-xl font-bold text-base sm:text-lg transition-all duration-500 hover:scale-105"
            >
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 sm:gap-12 mt-16 sm:mt-24 max-w-3xl mx-auto">
            <StatsCounter end={99} label="Accuracy" suffix="%" />
            <StatsCounter end={50} label="Time Saved" suffix="%" />
            <StatsCounter end={24} label="Support" suffix="/7" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 animate-smoothFadeIn">
              Everything you need.
              <br />
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                Nothing you don't.
              </span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto animate-smoothFadeIn" style={{ animationDelay: '200ms' }}>
              Powerful features designed to make attendance management effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard
              icon={
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Real-time Analytics"
              description="Get instant insights with interactive charts and detailed reports. Track trends and make data-driven decisions."
              gradient="from-green-500/20 to-emerald-600/20"
              delay={0}
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="Lightning Fast"
              description="Mark attendance in seconds with our intuitive interface. Bulk operations and smart shortcuts save time."
              gradient="from-blue-500/20 to-cyan-600/20"
              delay={200}
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              title="Secure & Private"
              description="Enterprise-grade security with encrypted data storage. Your information is always safe and protected."
              gradient="from-purple-500/20 to-pink-600/20"
              delay={400}
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
              title="Mobile Ready"
              description="Access from anywhere, any device. Responsive design ensures perfect experience on all screens."
              gradient="from-orange-500/20 to-amber-600/20"
              delay={600}
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
              title="Smart Automation"
              description="AI-powered features automate repetitive tasks. Focus on what matters while we handle the rest."
              gradient="from-teal-500/20 to-cyan-600/20"
              delay={800}
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              }
              title="Growth Insights"
              description="Identify patterns and trends with advanced analytics. Improve attendance rates with actionable insights."
              gradient="from-emerald-500/20 to-green-600/20"
              delay={1000}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
              Simple. Powerful. Effective.
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="space-y-12 sm:space-y-20">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 animate-slideInFromLeft">
              <div className="flex-1 order-2 md:order-1">
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-8 sm:p-12 border border-green-500/30">
                  <div className="text-6xl sm:text-8xl font-bold text-green-500/30 mb-4">01</div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Sign Up & Setup</h3>
                  <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
                    Create your account in seconds. Add departments, classes, and students with our easy import tools.
                  </p>
                </div>
              </div>
              <div className="flex-1 order-1 md:order-2">
                <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 flex items-center justify-center">
                  <svg className="w-32 h-32 sm:w-40 sm:h-40 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 animate-slideInFromRight">
              <div className="flex-1">
                <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 flex items-center justify-center">
                  <svg className="w-32 h-32 sm:w-40 sm:h-40 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-8 sm:p-12 border border-blue-500/30">
                  <div className="text-6xl sm:text-8xl font-bold text-blue-500/30 mb-4">02</div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Mark Attendance</h3>
                  <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
                    Quick and intuitive attendance marking. Period-wise tracking with bulk operations for efficiency.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 animate-slideInFromLeft">
              <div className="flex-1 order-2 md:order-1">
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-8 sm:p-12 border border-purple-500/30">
                  <div className="text-6xl sm:text-8xl font-bold text-purple-500/30 mb-4">03</div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Analyze & Report</h3>
                  <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
                    Generate detailed reports, track trends, and gain insights. Export data in multiple formats.
                  </p>
                </div>
              </div>
              <div className="flex-1 order-1 md:order-2">
                <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 flex items-center justify-center">
                  <svg className="w-32 h-32 sm:w-40 sm:h-40 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-3xl p-8 sm:p-16 text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
                Ready to get started?
              </h2>
              <p className="text-gray-400 text-base sm:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto">
                Join thousands of institutions already using Smart Attendance to streamline their operations.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <Link 
                  to="/signup" 
                  className="w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-base sm:text-lg transition-all duration-500 hover:scale-105 shadow-2xl hover:shadow-green-500/50"
                >
                  Get Started
                </Link>
                <Link 
                  to="/login" 
                  className="w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-5 bg-white text-black hover:bg-gray-200 rounded-xl font-bold text-base sm:text-lg transition-all duration-500 hover:scale-105"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoPremium size="default" />
              <span className="text-lg font-bold">SMART PRESENCE</span>
            </div>
            <div className="text-gray-400 text-sm sm:text-base text-center md:text-left">
              © 2025 Smart Presence. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
