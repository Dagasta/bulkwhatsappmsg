'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
    const supabase = createClientComponentClient()
    const router = useRouter()

    const [mode, setMode] = useState('login') // 'login' | 'signup'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || !password) {
            toast.error('Please enter email and password.')
            return
        }

        try {
            setLoading(true)
            toast.loading(mode === 'login' ? 'Logging in...' : 'Creating account...', { id: 'auth' })

            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                toast.success('Account created. You can now log in.', { id: 'auth' })
                setMode('login')
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                if (!data.session) {
                    throw new Error('No session returned from Supabase.')
                }
                toast.success('Welcome back!', { id: 'auth' })
                router.push('/dashboard')
            }
        } catch (error) {
            console.error('Auth error:', error)
            toast.error(error.message || 'Authentication failed', { id: 'auth' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-card p-8 w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 text-center"
                >
                    <h1 className="text-3xl font-bold text-gradient mb-2">BulkWaMsg</h1>
                    <p className="text-white/60 text-sm">
                        {mode === 'login' ? 'Log in to your dashboard' : 'Create your BulkWaMsg account'}
                    </p>
                </motion.div>

                <div className="flex gap-2 mb-6">
                    <button
                        className={`flex-1 py-2 rounded-xl text-sm ${mode === 'login' ? 'btn-neon' : 'bg-white/5 text-white/60'}`}
                        onClick={() => setMode('login')}
                    >
                        Login
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-xl text-sm ${mode === 'signup' ? 'btn-neon' : 'bg-white/5 text-white/60'}`}
                        onClick={() => setMode('signup')}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-1">Email</label>
                        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                            <Mail size={16} className="text-white/40" />
                            <input
                                type="email"
                                className="flex-1 bg-transparent outline-none text-sm"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1">Password</label>
                        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                            <Lock size={16} className="text-white/40" />
                            <input
                                type="password"
                                className="flex-1 bg-transparent outline-none text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-neon mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    )
}

