const cron = require('node-cron');
const { fetchAndSaveRemotiveJobs } = require('./jobFetcher');
const Application = require('../models/Application');
const { sendRoundReminderEmail } = require('./sendEmail');

const startCronJobs = () => {
    // ─── Run immediately on server start ──────────────────
    console.log('[Cron] 🚀 Running initial job fetch on startup...');
    fetchAndSaveRemotiveJobs().catch(err =>
        console.error('[Cron] Initial fetch failed:', err.message)
    );

    // ─── Every 6 hours ────────────────────────────────────
    cron.schedule('0 */6 * * *', async () => {
        console.log('[Cron] ⏰ Scheduled job fetch running...');
        try {
            const result = await fetchAndSaveRemotiveJobs();
            console.log(`[Cron] ✅ Done: ${result.totalFetched} fetched, ${result.totalUpserted} saved`);
        } catch (err) {
            console.error('[Cron] ❌ Scheduled fetch failed:', err.message);
        }
    });

    // ─── Daily at 8:00 AM: Interview Reminders ────────────
    cron.schedule('0 8 * * *', async () => {
        console.log('[Cron] ⏰ Checking for upcoming interview rounds...');
        try {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Find applications with pending rounds scheduled in the next 24 hours
            const apps = await Application.find({
                'rounds': {
                    $elemMatch: {
                        status: 'scheduled',
                        scheduledAt: { $gte: now, $lte: tomorrow },
                        reminderSent: false,
                    }
                }
            }).populate('studentId', 'name email').populate('jobId', 'companyName role');

            let sentCount = 0;

            for (const app of apps) {
                for (const round of app.rounds) {
                    if (round.status === 'scheduled' && !round.reminderSent && round.scheduledAt >= now && round.scheduledAt <= tomorrow) {
                        try {
                            await sendRoundReminderEmail(app.studentId, app.jobId, round);
                            round.reminderSent = true;
                            sentCount++;
                        } catch (emailErr) {
                            console.error(`[Cron] ❌ Failed to send reminder to ${app.studentId.email}:`, emailErr.message);
                        }
                    }
                }
                await app.save(); // Save the reminderSent = true status
            }

            console.log(`[Cron] ✅ Sent ${sentCount} interview reminder emails.`);
        } catch (err) {
            console.error('[Cron] ❌ Reminder job failed:', err.message);
        }
    });

    console.log('[Cron] ✅ Cron jobs scheduled (Job Fetch 6h, Reminders 24h)');
};

module.exports = { startCronJobs };
