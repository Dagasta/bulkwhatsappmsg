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
            // Protocol 2: Kill any existing ghost sessions
            if (this.sessions.has(userId)) {
                console.log(`⚠️  Session already exists for ${userId}. Destroying...`);
                await this.destroySession(userId);
            }

            await this.killGhostSession(userId);

            const sessionPath = path.join(__dirname, '../../sessions', userId);

            // Create session directory
            if (!fs.existsSync(sessionPath)) {
                fs.mkdirSync(sessionPath, { recursive: true });
            }

            // Load auth state
            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

            // Get latest Baileys version
            const { version } = await fetchLatestBaileysVersion();

            // Create WhatsApp socket
            const sock = makeWASocket({
                version: this.getStableVersion(), // Protocol 1: Stable version
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger)
                },
                printQRInTerminal: false,
                logger: this.logger,
                browser: ['BulkWaMsg', 'Chrome', '10.0'],
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                qrTimeout: 60000
            });

            let qrCodeData = null;
            let isConnected = false;

            // Handle connection updates
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                // Generate QR Code
                if (qr) {
                    console.log(`📱 QR Code generated for user: ${userId}`);
                    qrCodeData = await qrcode.toDataURL(qr);

                    // Save QR to Supabase
                    await this.supabase.from('whatsapp_sessions').upsert({
                        user_id: userId,
                        qr_code: qrCodeData,
                        status: 'waiting_qr',
                        updated_at: new Date().toISOString()
                    });
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
                    }
                }

                if (connection === 'open') {
                    console.log(`✅ Connection established for user: ${userId}`);
                    isConnected = true;

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

            // Wait for QR or connection
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (qrCodeData || isConnected) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 500);

                // Timeout after 30 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 30000);
            });

            return {
                qrCode: qrCodeData,
                status: isConnected ? 'connected' : 'waiting_qr'
            };

        } catch (error) {
            console.error(`❌ Create session error for ${userId}:`, error);
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
