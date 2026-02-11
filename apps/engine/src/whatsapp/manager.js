const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

class WhatsAppManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.sessions = new Map(); // Map of userId -> socket instance
        this.initializingSessions = new Set(); // Track sessions being initialized to avoid duplicates
        this.logger = pino({ level: 'silent' }); // Silent logger
    }

    /**
     * ✅ Protocol 1: Version Lock (Fixes 405 Errors)
     * ALWAYS use stable version. Never use "latest" or it will disconnect instantly.
     */
    getStableVersion() {
        return [2, 2413, 1];
    }

    /**
     * ✅ Protocol 2: Ghost Killer (Fixes Stuck Sessions)
     * Delete corrupted sessions before starting new ones
     */
    async killGhostSession(userId) {
        const sessionPath = path.join(__dirname, '../../sessions', userId);

        if (fs.existsSync(sessionPath)) {
            console.log(`🗑️  Killing ghost session for user: ${userId}`);
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
    }

    /**
     * Create a new WhatsApp session
     */
    async createSession(userId) {
        try {
            console.log(`🔵 [1/7] Starting session creation for: ${userId}`);

            // If a session already exists and is connected, don't recreate it
            const existingSock = this.sessions.get(userId);
            if (existingSock && existingSock.user) {
                console.log(`✅ Active session already exists for ${userId}, skipping re-init`);
                return {
                    qrCode: null,
                    status: 'connected'
                };
            }

            // If initialization is already in progress, avoid starting another one
            if (this.initializingSessions.has(userId)) {
                console.log(`⏳ Session initialization already in progress for ${userId}`);
                return {
                    qrCode: null,
                    status: 'initializing'
                };
            }

            this.initializingSessions.add(userId);

            // Protocol 2: Kill any existing ghost sessions on disk
            if (this.sessions.has(userId)) {
                console.log(`⚠️  Session already exists for ${userId}. Destroying...`);
                await this.destroySession(userId);
            }

            await this.killGhostSession(userId);
            console.log(`🔵 [2/7] Ghost sessions cleared`);

            const sessionPath = path.join(__dirname, '../../sessions', userId);

            // Create session directory
            if (!fs.existsSync(sessionPath)) {
                fs.mkdirSync(sessionPath, { recursive: true });
            }
            console.log(`🔵 [3/7] Session directory ready: ${sessionPath}`);

            // Ensure a tracking row exists in Supabase for this user
            try {
                await this.supabase.from('whatsapp_sessions').upsert({
                    user_id: userId,
                    status: 'initializing',
                    qr_code: null,
                    phone_number: null,
                    updated_at: new Date().toISOString()
                });
                console.log(`🔵 [3.5/7] Supabase session row upserted (initializing) for ${userId}`);
            } catch (dbError) {
                console.error(`❌ Failed to upsert initial session row for ${userId}:`, dbError);
            }

            // Load auth state
            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
            console.log(`🔵 [4/7] Auth state loaded`);

            // Get latest Baileys version (logged for visibility)
            const { version } = await fetchLatestBaileysVersion();
            console.log(`🔵 [5/7] Baileys version (fetched): ${version.join('.')}`);

            // Create WhatsApp socket
            const sock = makeWASocket({
                version: this.getStableVersion(), // Protocol 1: Stable version
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger)
                },
                printQRInTerminal: true, // Enable terminal QR for debugging
                logger: this.logger,
                browser: ['BulkWaMsg', 'Chrome', '10.0'],
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                qrTimeout: 60000
            });
            console.log(`🔵 [6/7] WhatsApp socket created`);

            let qrCodeData = null;
            let isConnected = false;

            // Handle connection updates
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                console.log(`🔵 Connection update:`, { connection, hasQR: !!qr });

                // Generate QR Code and push to Supabase
                if (qr) {
                    console.log(`📱 QR Code RAW DATA RECEIVED for user: ${userId}`);
                    qrCodeData = await qrcode.toDataURL(qr);
                    console.log(`✅ QR Code converted to DataURL (length: ${qrCodeData.length})`);

                    try {
                        await this.supabase.from('whatsapp_sessions').upsert({
                            user_id: userId,
                            status: 'waiting_qr',
                            qr_code: qrCodeData,
                            phone_number: null,
                            updated_at: new Date().toISOString()
                        });
                        console.log(`✅ QR Code stored in Supabase for user: ${userId}`);
                    } catch (dbError) {
                        console.error(`❌ Failed to store QR in Supabase for ${userId}:`, dbError);
                    }
                }

                // Handle connection state
                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    const reason = lastDisconnect?.error?.output?.statusCode;

                    console.log(`❌ Connection closed for ${userId}. Reason: ${reason}`);

                    if (reason === 405) {
                        console.log('🔴 ERROR 405: Version Mismatch. Using stable version...');
                    }

                    if (shouldReconnect) {
                        console.log(`🔄 Reconnecting ${userId}...`);
                        setTimeout(() => this.createSession(userId), 3000);
                    } else {
                        console.log(`🚪 User ${userId} logged out. Cleaning session...`);
                        await this.destroySession(userId);
                        this.initializingSessions.delete(userId);
                    }
                }

                if (connection === 'open') {
                    console.log(`✅ Connection established for user: ${userId}`);
                    isConnected = true;
                    this.initializingSessions.delete(userId);

                    // Update Supabase
                    await this.supabase.from('whatsapp_sessions').upsert({
                        user_id: userId,
                        status: 'connected',
                        qr_code: null,
                        phone_number: sock.user?.id?.split(':')[0] || null,
                        updated_at: new Date().toISOString()
                    });
                }
            });

            // Save credentials on update
            sock.ev.on('creds.update', saveCreds);

            // Store session
            this.sessions.set(userId, sock);
            console.log(`🔵 [7/7] Session stored, non-blocking initialization in progress...`);

            // Return immediately – QR and status will be pushed via Supabase & terminal
            return {
                qrCode: qrCodeData,
                status: isConnected ? 'connected' : 'initializing'
            };

        } catch (error) {
            console.error(`❌ Create session error for ${userId}:`, error);
            this.initializingSessions.delete(userId);
            throw error;
        }
    }

    /**
     * Get session status
     */
    async getSessionStatus(userId) {
        const sock = this.sessions.get(userId);

        if (!sock) {
            return { connected: false, message: 'No active session' };
        }

        const isConnected = sock.user ? true : false;

        return {
            connected: isConnected,
            phoneNumber: sock.user?.id?.split(':')[0] || null,
            name: sock.user?.name || null
        };
    }

    /**
     * Send a message
     */
    async sendMessage(userId, phoneNumber, message, mediaUrl = null) {
        try {
            const sock = this.sessions.get(userId);

            if (!sock || !sock.user) {
                throw new Error('WhatsApp not connected');
            }

            // Format phone number to JID
            const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;

            let result;

            if (mediaUrl) {
                // Send media message
                result = await sock.sendMessage(jid, {
                    image: { url: mediaUrl },
                    caption: message
                });
            } else {
                // Send text message
                result = await sock.sendMessage(jid, {
                    text: message
                });
            }

            console.log(`✅ Message sent to ${phoneNumber}`);
            return result;

        } catch (error) {
            console.error(`❌ Send message error:`, error);
            throw error;
        }
    }

    /**
     * Destroy a session
     */
    async destroySession(userId) {
        try {
            const sock = this.sessions.get(userId);

            if (sock) {
                await sock.logout();
                this.sessions.delete(userId);
            }

            await this.killGhostSession(userId);

            // Update Supabase
            await this.supabase.from('whatsapp_sessions').update({
                status: 'disconnected',
                qr_code: null,
                updated_at: new Date().toISOString()
            }).eq('user_id', userId);

            console.log(`🗑️  Session destroyed for user: ${userId}`);

        } catch (error) {
            console.error(`❌ Destroy session error:`, error);
            throw error;
        }
    }

    /**
     * Destroy all sessions (for shutdown)
     */
    async destroyAllSessions() {
        console.log('🗑️  Destroying all sessions...');

        for (const [userId] of this.sessions) {
            await this.destroySession(userId);
        }
    }

    /**
     * Get active session count
     */
    getActiveSessionCount() {
        return this.sessions.size;
    }

    /**
     * Get socket for user
     */
    getSocket(userId) {
        return this.sessions.get(userId);
    }
}

module.exports = WhatsAppManager;
