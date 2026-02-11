# BulkWaMsg Enterprise 💎

> The **Ultimate WhatsApp Marketing SaaS** - High-End, Free to Run, Crash-Proof

## 🏗️ Architecture

### Split-Stack Design
- **Frontend**: Next.js 14 on Vercel (Free Tier)
- **Backend Engine**: Node.js + Express + Baileys (Local/VPS + Ngrok)
- **Database**: Supabase (Free Tier)

## 🚀 Quick Start

### 1. Installation
```bash
# Run the installation script
INSTALL.bat
```

### 2. Database Setup
1. Go to your Supabase project: https://supabase.com
2. Navigate to SQL Editor
3. Copy and paste the SQL from `packages/database/schema.sql`
4. Run the SQL to create all tables

### 3. Start the Engine
```bash
START-ENGINE.bat
```
**Important**: Wait for the Ngrok URL to appear in the console!

### 4. Update Frontend Config
After the engine starts, copy the Ngrok URL and update:
```
apps/web/.env.local
NEXT_PUBLIC_ENGINE_URL=https://your-ngrok-url.app
```

### 5. Start the Frontend
```bash
START-FRONTEND.bat
```

### 6. Open the App
Navigate to: http://localhost:3000

## 🛡️ Anti-Crash Protocols

### ✅ Protocol 1: Version Lock
- Fixed version: `[2, 2413, 1]`
- Prevents 405 errors from WhatsApp servers

### ✅ Protocol 2: Ghost Killer
- Automatically deletes corrupted sessions
- Fresh start on every connection

### ✅ Protocol 3: Keep-Alive Heartbeat
- Pings Supabase every 60 seconds
- Real-time engine status monitoring

## 📂 Project Structure

```
/bulkwamsg-ultimate
├── /apps
│   ├── /web (Next.js Frontend - Deploy to Vercel)
│   └── /engine (Node.js Backend - Local/VPS)
├── /packages
│   └── /database (Supabase Schema)
├── INSTALL.bat
├── START-ENGINE.bat
└── START-FRONTEND.bat
```

## 🎨 Design Features

- **Cyber-Glassmorphism UI**
- **Deep Space Blue/Purple Gradients**
- **Framer Motion Animations**
- **Real-time Status Updates**
- **Mobile Responsive**

## 🔐 Environment Variables

### Engine (.env)
```
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE=your_key
PORT=2008
NGROK_AUTHTOKEN=your_token
```

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_ENGINE_URL=http://localhost:2008
```

## 🚀 Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy!

### Engine (VPS/Local)
```bash
cd apps/engine
npm install pm2 -g
pm2 start src/index.js --name bulkwamsg-engine
pm2 save
pm2 startup
```

## 📊 Features

- ✅ WhatsApp QR Connection
- ✅ Bulk Message Sending
- ✅ Campaign Management
- ✅ Contact Management
- ✅ Real-time Analytics
- ✅ Anti-Ban Technology
- ✅ Smart Scheduling
- ✅ Media Support

## 🛠️ Tech Stack

- Next.js 14 (App Router)
- Node.js + Express
- @whiskeysockets/baileys
- Supabase
- TailwindCSS
- Framer Motion
- PM2
- Ngrok

## 📝 Important Notes

1. **Always start the Engine first** before the Frontend
2. **Update the Ngrok URL** in frontend .env after engine starts
3. **Never commit** .env files to Git
4. **Database schema** must be run in Supabase before starting

## 🎯 Next Steps

1. Add user authentication
2. Implement Stripe billing
3. Add campaign templates
4. Build analytics dashboard
5. Add spintax support

## 💻 Development

```bash
# Install dependencies
npm install

# Start both (development)
npm run dev

# Build for production
npm run build
```

## 🔗 Links

- GitHub: https://github.com/Dagasta/bulkwhatsappmsg
- Supabase: https://supabase.com
- Vercel: https://vercel.com

---

**Built with ❤️ and AI**
