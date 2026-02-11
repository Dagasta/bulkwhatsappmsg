class CampaignWorker {
    constructor(supabase, waManager) {
        this.supabase = supabase;
        this.waManager = waManager;
        this.activeCampaigns = new Map();
        this.queue = [];
        this.processing = false;
    }

    /**
     * Start the campaign worker
     */
    start() {
        console.log('🚀 Campaign Worker started');
        this.processPendingCampaigns();

        // Check for new campaigns every 10 seconds
        setInterval(() => {
            this.processPendingCampaigns();
        }, 10000);
    }

    /**
     * Process pending campaigns from database
     */
    async processPendingCampaigns() {
        try {
            const { data: campaigns, error } = await this.supabase
                .from('campaigns')
                .select('*')
                .eq('status', 'pending')
                .limit(10);

            if (error) throw error;

            if (campaigns && campaigns.length > 0) {
                console.log(`📋 Found ${campaigns.length} pending campaigns`);

                for (const campaign of campaigns) {
                    if (!this.activeCampaigns.has(campaign.id)) {
                        this.processCampaign(campaign);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Process pending campaigns error:', error);
        }
    }

    /**
     * Process a single campaign
     */
    async processCampaign(campaign) {
        const campaignId = campaign.campaignId || campaign.id;
        const userId = campaign.userId || campaign.user_id;

        console.log(`🚀 Starting campaign: ${campaignId}`);

        this.activeCampaigns.set(campaignId, true);

        try {
            // Update campaign status to processing
            await this.supabase
                .from('campaigns')
                .update({
                    status: 'processing',
                    started_at: new Date().toISOString()
                })
                .eq('id', campaignId);

            // Parse contacts
            const contacts = typeof campaign.contacts === 'string'
                ? JSON.parse(campaign.contacts)
                : campaign.contacts;

            const message = campaign.message;
            const mediaUrl = campaign.mediaUrl || campaign.media_url;
            const delay = campaign.delay || 3000;

            let successCount = 0;
            let failCount = 0;

            // Send messages to each contact
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                const phoneNumber = contact.phone || contact;

                try {
                    console.log(`📤 Sending to ${phoneNumber} (${i + 1}/${contacts.length})`);

                    await this.waManager.sendMessage(userId, phoneNumber, message, mediaUrl);

                    successCount++;

                    // Update progress
                    await this.supabase
                        .from('campaigns')
                        .update({
                            sent_count: successCount,
                            progress: Math.round((i + 1) / contacts.length * 100)
                        })
                        .eq('id', campaignId);

                    // Anti-ban delay
                    await this.sleep(delay);

                } catch (error) {
                    console.error(`❌ Failed to send to ${phoneNumber}:`, error.message);
                    failCount++;
                }
            }

            // Update campaign as completed
            await this.supabase
                .from('campaigns')
                .update({
                    status: 'completed',
                    sent_count: successCount,
                    failed_count: failCount,
                    completed_at: new Date().toISOString(),
                    progress: 100
                })
                .eq('id', campaignId);

            console.log(`✅ Campaign ${campaignId} completed: ${successCount} sent, ${failCount} failed`);

        } catch (error) {
            console.error(`❌ Campaign ${campaignId} error:`, error);

            // Update campaign as failed
            await this.supabase
                .from('campaigns')
                .update({
                    status: 'failed',
                    error: error.message,
                    completed_at: new Date().toISOString()
                })
                .eq('id', campaignId);

        } finally {
            this.activeCampaigns.delete(campaignId);
        }
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = CampaignWorker;
