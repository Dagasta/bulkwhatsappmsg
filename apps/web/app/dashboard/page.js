'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Send,
    QrCode,
    Users,
    BarChart3,
    Settings,
    Plus,
    Smartphone,
    Wifi,
    WifiOff,
    Zap
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import toast from 'react-hot-toast'

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('overview')
    const [whatsappStatus, setWhatsappStatus] = useState('disconnected')
    const [qrCode, setQrCode] = useState(null)
    const [stats, setStats] = useState({
        messagesSent: 0,
        activeCampaigns: 0,
        totalContacts: 0,
        successRate: 0
    })

    const supabase = createClientComponentClient()
    const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:2008'

    // Check WhatsApp status on load
    useEffect(() => {
        checkWhatsAppStatus()
    }, [])

    const checkWhatsAppStatus = async () => {
        try {
            const { data: session } = await supabase
                .from('whatsapp_sessions')
                .select('*')
                .eq('user_id', 'demo-user')
                .single()

            if (session?.status === 'connected') {
                setWhatsappStatus('connected')
            } else if (session?.qr_code) {
                setQrCode(session.qr_code)
                setWhatsappStatus('waiting_qr')
            }
        } catch (error) {
            console.error('Status check error:', error)
        }
    }

    const initializeWhatsApp = async () => {
        try {
            setWhatsappStatus('initializing')
            toast.loading('Initializing WhatsApp...', { id: 'init' })

            const response = await fetch(`${ENGINE_URL}/api/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'demo-user' })
            })

            const data = await response.json()

            if (data.success) {
                setQrCode(data.qrCode)
                setWhatsappStatus('waiting_qr')
                toast.success('QR Code generated! Scan to connect.', { id: 'init' })

                // Listen for connection
                listenForConnection()
            } else {
                throw new Error(data.error)
            }

        } catch (error) {
            console.error('Init error:', error)
            toast.error('Failed to initialize: ' + error.message, { id: 'init' })
            setWhatsappStatus('disconnected')
        }
    }

    const listenForConnection = () => {
        const channel = supabase
            .channel('whatsapp-status')
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'whatsapp_sessions',
                    filter: 'user_id=eq.demo-user'
                },
                (payload) => {
                    if (payload.new.status === 'connected') {
                        setWhatsappStatus('connected')
                        setQrCode(null)
                        toast.success('WhatsApp Connected! 🎉')
                    }
                }
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
    }

    return (
        <div className="min-h-screen">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 glass-card border-r border-white/10 p-6">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gradient">BulkWaMsg</h1>
                    <p className="text-white/50 text-sm">Enterprise Dashboard</p>
                </div>

                <nav className="space-y-2">
                    <NavItem
                        icon={<BarChart3 size={20} />}
                        label="Overview"
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                    />
                    <NavItem
                        icon={<Send size={20} />}
                        label="Campaigns"
                        active={activeTab === 'campaigns'}
                        onClick={() => setActiveTab('campaigns')}
                    />
                    <NavItem
                        icon={<Users size={20} />}
                        label="Contacts"
                        active={activeTab === 'contacts'}
                        onClick={() => setActiveTab('contacts')}
                    />
                    <NavItem
                        icon={<Smartphone size={20} />}
                        label="WhatsApp"
                        active={activeTab === 'whatsapp'}
                        onClick={() => setActiveTab('whatsapp')}
                    />
                    <NavItem
                        icon={<Settings size={20} />}
                        label="Settings"
                        active={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                    />
                </nav>

                {/* Status Indicator */}
                <div className="absolute bottom-6 left-6 right-6">
                    <div className="glass-card p-4">
                        <div className="flex items-center gap-3">
                            {whatsappStatus === 'connected' ? (
                                <>
                                    <Wifi className="text-cyber-blue animate-pulse" size={20} />
                                    <div>
                                        <p className="text-xs text-white/50">WhatsApp</p>
                                        <p className="pill-success">Connected</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="text-red-400" size={20} />
                                    <div>
                                        <p className="text-xs text-white/50">WhatsApp</p>
                                        <p className="pill-error">Offline</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h2 className="text-4xl font-bold mb-2">
                        {activeTab === 'overview' && 'Dashboard Overview'}
                        {activeTab === 'campaigns' && 'Campaign Manager'}
                        {activeTab === 'whatsapp' && 'WhatsApp Connection'}
                    </h2>
                    <p className="text-white/60">Manage your WhatsApp marketing campaigns</p>
                </motion.div>

                {/* Content based on active tab */}
                {activeTab === 'overview' && <OverviewTab stats={stats} />}
                {activeTab === 'campaigns' && <CampaignsTab />}
                {activeTab === 'whatsapp' && (
                    <WhatsAppTab
                        status={whatsappStatus}
                        qrCode={qrCode}
                        onConnect={initializeWhatsApp}
                    />
                )}
            </main>
        </div>
    )
}

function NavItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                    ? 'bg-gradient-to-r from-cyber-purple/20 to-purple-600/20 border border-cyber-purple/30 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    )
}

function OverviewTab({ stats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
                title="Messages Sent"
                value={stats.messagesSent}
                icon={<Send size={24} className="text-cyber-purple" />}
                trend="+12%"
            />
            <StatCard
                title="Active Campaigns"
                value={stats.activeCampaigns}
                icon={<Zap size={24} className="text-cyber-blue" />}
                trend="+5%"
            />
            <StatCard
                title="Total Contacts"
                value={stats.totalContacts}
                icon={<Users size={24} className="text-cyber-pink" />}
                trend="+23%"
            />
            <StatCard
                title="Success Rate"
                value={`${stats.successRate}%`}
                icon={<BarChart3 size={24} className="text-cyber-cyan" />}
                trend="+2%"
            />
        </div>
    )
}

function StatCard({ title, value, icon, trend }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-hover p-6"
        >
            <div className="flex items-center justify-between mb-4">
                {icon}
                <span className="pill-success">{trend}</span>
            </div>
            <h3 className="text-3xl font-bold mb-1">{value}</h3>
            <p className="text-white/60 text-sm">{title}</p>
        </motion.div>
    )
}

function CampaignsTab() {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Your Campaigns</h3>
                <button className="btn-neon flex items-center gap-2">
                    <Plus size={20} />
                    New Campaign
                </button>
            </div>

            <div className="glass-card p-6">
                <p className="text-white/60 text-center py-12">
                    No campaigns yet. Create your first campaign to get started!
                </p>
            </div>
        </div>
    )
}

function WhatsAppTab({ status, qrCode, onConnect }) {
    return (
        <div className="max-w-2xl">
            <div className="glass-card p-8 text-center">
                {status === 'disconnected' && (
                    <div>
                        <QrCode size={64} className="mx-auto mb-4 text-cyber-purple" />
                        <h3 className="text-2xl font-bold mb-2">Connect WhatsApp</h3>
                        <p className="text-white/60 mb-6">
                            Initialize your WhatsApp session to start sending messages
                        </p>
                        <button onClick={onConnect} className="btn-neon">
                            Generate QR Code
                        </button>
                    </div>
                )}

                {status === 'initializing' && (
                    <div>
                        <div className="animate-spin mx-auto mb-4">
                            <Zap size={64} className="text-cyber-purple" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Initializing...</h3>
                        <p className="text-white/60">Setting up your WhatsApp connection</p>
                    </div>
                )}

                {status === 'waiting_qr' && qrCode && (
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Scan QR Code</h3>
                        <div className="inline-block p-4 bg-white rounded-2xl">
                            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                        </div>
                        <p className="text-white/60 mt-4">
                            Open WhatsApp on your phone and scan this code
                        </p>
                    </div>
                )}

                {status === 'connected' && (
                    <div>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyber-blue/20 flex items-center justify-center">
                            <Wifi size={32} className="text-cyber-blue animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Connected! 🎉</h3>
                        <p className="text-white/60">
                            Your WhatsApp is ready to send messages
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
