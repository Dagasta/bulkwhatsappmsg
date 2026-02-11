/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['pkrvmqwgonxgsgwdhqve.supabase.co'],
    },
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_ENGINE_URL: process.env.NEXT_PUBLIC_ENGINE_URL,
    },
}

module.exports = nextConfig
