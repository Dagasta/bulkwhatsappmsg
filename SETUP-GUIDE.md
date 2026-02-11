# 🚀 BulkWaMsg Enterprise - Setup Guide

## ✅ Step 1: Database Setup (IMPORTANT - Do this FIRST!)

1. **Go to Supabase**: https://supabase.com/dashboard/project/pkrvmqwgonxgsgwdhqve
2. **Click on "SQL Editor"** in the left sidebar
3. **Click "New Query"**
4. **Copy the ENTIRE contents** from: `packages/database/schema.sql`
5. **Paste into the SQL Editor**
6. **Click "Run"** to execute

This will create all the necessary tables:
- ✅ users
- ✅ whatsapp_sessions
- ✅ campaigns
- ✅ contacts
- ✅ message_logs
- ✅ engine_status
- ✅ engine_config

## ✅ Step 2: Start the Engine

1. Open a terminal in the project folder
2. Run:
```bash
START-ENGINE.bat
```

3. **WAIT** for the Ngrok URL to appear. It will look like:
```
🌐 Ngrok Tunnel: https://xxxx-xxx-xxx-xxx.ngrok-free.app
```

4. **COPY this URL!**

## ✅ Step 3: Update Frontend Configuration

1. Open: `apps/web/.env.local`
2. Find the line:
```
NEXT_PUBLIC_ENGINE_URL=http://localhost:2008
```
3. Replace with your Ngrok URL:
```
NEXT_PUBLIC_ENGINE_URL=https://xxxx-xxx-xxx-xxx.ngrok-free.app
```
4. **Save the file**

## ✅ Step 4: Start the Frontend

1. Open a **NEW terminal** (keep the engine running!)
2. Run:
```bash
START-FRONTEND.bat
```

3. Wait for Next.js to start
4. Open your browser to: **http://localhost:3000**

## 🎯 Using the Application

### Connect WhatsApp
1. Click **"Get Started"** or go to **/dashboard**
2. Click on the **"WhatsApp"** tab in the sidebar
3. Click **"Generate QR Code"**
4. Scan the QR code with your WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Tap **Menu** or **Settings**
   - Tap **Linked Devices**
   - Tap **Link a Device**
   - Scan the QR code

### Send Campaigns
1. Go to the **"Campaigns"** tab
2. Click **"New Campaign"**
3. Enter message and contacts
4. Click **"Send"**

## 🔧 Troubleshooting

### Engine won't start
- Make sure port 2008 is not in use
- Check your internet connection (Ngrok needs it)
- Verify Ngrok authtoken is correct in `.env`

### QR Code doesn't appear
- Check that the engine is running
- Verify the Ngrok URL in frontend `.env.local`
- Check browser console for errors

### WhatsApp disconnects
- This is normal during development
- Just regenerate the QR code and scan again

### Database errors
- Make sure you ran the SQL schema in Supabase
- Verify your Supabase keys are correct

## 🚀 Deploy to Production

### Engine (Keep Running 24/7)
Use PM2 to keep the engine running:
```bash
cd apps/engine
npm install pm2 -g
pm2 start src/index.js --name bulkwamsg-engine
pm2 save
pm2 startup
```

### Frontend (Deploy to Vercel)
1. Push code to GitHub (already done!)
2. Go to https://vercel.com
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ENGINE_URL` (use your Ngrok URL or VPS URL)
5. Deploy!

## 🎨 Features Implemented

✅ Cyber-Glassmorphism UI  
✅ WhatsApp QR Connection  
✅ Real-time Status Updates  
✅ Campaign Management  
✅ Anti-Crash Protocols  
✅ Keep-Alive Heartbeat  
✅ Ghost Session Killer  
✅ Version Locking  

## 📚 Next Features to Add

- [ ] User Authentication (Supabase Auth)
- [ ] Stripe Payment Integration
- [ ] Contact Import (CSV)
- [ ] Campaign Templates
- [ ] Advanced Analytics
- [ ] Message Scheduling
- [ ] Spintax Support
- [ ] Media Upload

---

**Need Help?** Check the logs in the terminal or contact support.
