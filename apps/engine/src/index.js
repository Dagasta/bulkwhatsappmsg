require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const ngrok = require('ngrok');
const cron = require('node-cron');

// Import WhatsApp manager
const WhatsAppManager = require('./whatsapp/manager');
const CampaignWorker = require('./workers/campaign-worker');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
// Prefer dedicated engine env vars, but gracefully fall back to NEXT_PUBLIC_* for local dev
const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE =
    process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE (or NEXT_PUBLIC_* for local dev).');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Initialize WhatsApp Manager
const waManager = new WhatsAppManager(supabase);

// Initialize Campaign Worker
const campaignWorker = new CampaignWorker(supabase, waManager);

// ============================================
// 🔥 HEALTH CHECK & HEARTBEAT
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        activeSessions: waManager.getActiveSessionCount()
    });
});

// Keep-Alive Heartbeat (Every 60 seconds)
cron.schedule('*/60 * * * * *', async () => {
    try {
        await supabase.from('engine_status').upsert({
            id: 1,
            status: 'alive',
            active_sessions: waManager.getActiveSessionCount(),
            last_heartbeat: new Date().toISOString()
        });
        console.log('💓 Heartbeat sent');
    } catch (error) {
        console.error('❌ Heartbeat failed:', error.message);
    }
});

// ============================================
// 🔥 WHATSAPP INSTANCE ENDPOINTS
// ============================================

// ✅ Initialize WhatsApp Session (Generate QR)
app.post('/api/init', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId required' });
        }

        console.log(`🚀 API CALL: Initializing session for user: ${userId}`);

        // Fire-and-forget: start session creation in background.
        // The client can fetch QR/status via /api/qr/:userId (engine reads from DB).
        waManager.createSession(userId).catch((err) => {
            console.error(`❌ Background createSession failed for ${userId}:`, err);
        });

        res.json({
            success: true,
            status: 'initializing',
            message: 'Session initialization started'
        });

    } catch (error) {
        console.error('❌ API ERROR:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Failed to initialize WhatsApp session'
        });
    }
});

// Get QR/DB session state (backend-authoritative, bypasses client RLS issues)
app.get('/api/qr/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('status, qr_code, phone_number, updated_at')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.json({
                success: true,
                status: 'disconnected',
                qrCode: null
            });
        }

        res.json({
            success: true,
            status: data.status || 'disconnected',
            qrCode: data.qr_code || null,
            phoneNumber: data.phone_number || null,
            updatedAt: data.updated_at || null
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Session Status
app.get('/api/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const status = await waManager.getSessionStatus(userId);

        res.json({
            success: true,
            status
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Disconnect Session
app.post('/api/disconnect/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await waManager.destroySession(userId);

        res.json({
            success: true,
            message: 'Session disconnected successfully'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 🔥 CAMPAIGN ENDPOINTS
// ============================================

// Send Campaign Messages (instant or scheduled)
app.post('/api/campaign/send', async (req, res) => {
    try {
        const { userId, campaignId, contacts, message, mediaUrl, delay, scheduleAt } = req.body;

        if (!userId || !contacts || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const effectiveCampaignId = campaignId || `instant-${Date.now()}`;

        console.log(`📤 Starting campaign ${effectiveCampaignId} for user ${userId}`);

        const payload = {
            userId,
            campaignId: effectiveCampaignId,
            contacts,
            message,
            mediaUrl,
            delay: delay || 3000
        };

        // If scheduleAt is provided and in the future, schedule in-memory
        if (scheduleAt) {
            const when = new Date(scheduleAt).getTime();
            const now = Date.now();
            const waitMs = when - now;

            if (waitMs > 0) {
                console.log(`⏰ Scheduling campaign ${effectiveCampaignId} in ${Math.round(waitMs / 1000)}s`);
                setTimeout(() => {
                    campaignWorker.processCampaign(payload);
                }, waitMs);
            } else {
                console.log(`⚠️ scheduleAt is in the past, sending immediately for campaign ${effectiveCampaignId}`);
                campaignWorker.processCampaign(payload);
            }
        } else {
            // Instant send
            campaignWorker.processCampaign(payload);
        }

        res.json({
            success: true,
            message: scheduleAt ? 'Campaign scheduled' : 'Campaign initiated',
            campaignId: effectiveCampaignId
        });

    } catch (error) {
        console.error('❌ Campaign error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Campaign Status
app.get('/api/campaign/status/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;

        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            campaign: data
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 🔥 SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 2008;

app.listen(PORT, async () => {
    console.log('\n🚀 ============================================');
    console.log(`🚀 BulkWaMsg Engine LIVE on PORT: ${PORT}`);
    console.log('🚀 ============================================\n');

    // Start Ngrok tunnel
    try {
        // Set authtoken first
        await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);

        const url = await ngrok.connect(PORT);

        console.log(`🌐 Ngrok Tunnel: ${url}`);
        console.log('🌐 Use this URL in your Vercel frontend\n');

        // Save Ngrok URL to Supabase
        await supabase.from('engine_config').upsert({
            id: 1,
            ngrok_url: url,
            updated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Ngrok failed:', error.message);
        console.log('⚠️  Running without Ngrok tunnel');
    }

    // Start campaign worker
    campaignWorker.start();
    console.log('✅ Campaign Worker: ACTIVE\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await waManager.destroyAllSessions();
    await ngrok.kill();
    process.exit(0);
});

module.exports = app;
