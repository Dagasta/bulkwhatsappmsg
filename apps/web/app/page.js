'use client'

import { motion } from 'framer-motion'
import { Zap, Shield, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="min-h-screen">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-bold text-gradient"
                    >
                        BulkWaMsg
                    </motion.div>

                    <div className="flex gap-4">
                        <Link href="/login">
                            <button className="px-6 py-2 rounded-xl border border-white/20 hover:bg-white/5 transition-all">
                                Login
                            </button>
                        </Link>
                        <Link href="/dashboard">
                            <button className="btn-neon">
                                Get Started
                            </button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="container mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-6xl md:text-8xl font-bold mb-6">
                            <span className="text-gradient">Ultimate</span>
                            <br />
                            WhatsApp Marketing
                        </h1>

                        <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto mb-12">
                            Enterprise-grade bulk messaging platform with AI-powered anti-ban technology.
                            Send thousands of messages. Zero bans. Infinite scale.
                        </p>

                        <div className="flex gap-4 justify-center">
                            <Link href="/dashboard">
                                <button className="btn-neon text-lg px-8 py-4">
                                    Launch Dashboard
                                    <Zap className="inline ml-2" size={20} />
                                </button>
                            </Link>

                            <button className="px-8 py-4 rounded-xl border border-white/20 hover:bg-white/5 transition-all text-lg">
                                Watch Demo
                            </button>
                        </div>
                    </motion.div>

                    {/* Floating Cards */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-20"
                    >
                        <FeatureCard
                            icon={<Zap className="text-cyber-purple" size={32} />}
                            title="Lightning Fast"
                            description="Send 1000+ messages per hour"
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={<Shield className="text-cyber-blue" size={32} />}
                            title="Anti-Ban Shield"
                            description="Advanced protocols prevent detection"
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={<Clock className="text-cyber-pink" size={32} />}
                            title="Smart Scheduling"
                            description="Queue campaigns for optimal delivery"
                            delay={0.3}
                        />
                        <FeatureCard
                            icon={<TrendingUp className="text-cyber-cyan" size={32} />}
                            title="Real-time Analytics"
                            description="Track every message, every second"
                            delay={0.4}
                        />
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 mt-20">
                <div className="container mx-auto px-6 text-center text-white/50">
                    <p>© 2026 BulkWaMsg Enterprise. Built with ❤️ and AI.</p>
                </div>
            </footer>
        </div>
    )
}

function FeatureCard({ icon, title, description, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="glass-card-hover p-6 animate-float"
            style={{ animationDelay: `${delay}s` }}
        >
            <div className="mb-4">{icon}</div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-white/60">{description}</p>
        </motion.div>
    )
}
