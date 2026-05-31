const axios = require('axios');

/**
 * Sends a generic JSON payload to a Slack Incoming Webhook URL.
 * Catches all errors to ensure the primary request flow remains uninterrupted.
 * 
 * @param {string} webhookUrl - Slack Incoming Webhook URL
 * @param {Object} payload - JSON payload structure (text or blocks)
 */
const sendSlackNotification = async (webhookUrl, payload) => {
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/services/')) {
        console.log('[Slack Webhook] skipped - invalid or unconfigured webhook URL');
        return;
    }

    try {
        const response = await axios.post(webhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000,
        });
        console.log(`[Slack Webhook] Post successful: Status ${response.status}`);
    } catch (err) {
        console.error('[Slack Webhook Error]: Failed to post alert:', err.response?.data || err.message);
    }
};

/**
 * Formats and dispatches a Slack Block Kit alert for a new campus job drive.
 */
const sendJobAlert = async (webhookUrl, job) => {
    const formattedDeadline = new Date(job.deadline).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const payload = {
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🚀 New Campus Job Drive Alert!',
                    emoji: true
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Company:* ${job.companyName}\n*Role:* *${job.role}*\n*CTC Package:* *${job.package} LPA*\n*Location:* ${job.location || 'Remote'}\n*Eligibility CGPA:* ${job.criteria?.minCGPA || 'All'}\n*Application Deadline:* ${formattedDeadline}`
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: '🎓 *Log in to your PlaceIQ Student Dashboard to apply in a single click.*'
                    }
                ]
            }
        ]
    };

    return sendSlackNotification(webhookUrl, payload);
};

/**
 * Formats and dispatches a Slack Block Kit alert when a student self-books an interview slot.
 */
const sendInterviewBookingAlert = async (webhookUrl, slot, student, interviewerName) => {
    const formattedTime = new Date(slot.dateTime).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const payload = {
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '📅 Interview Slot Scheduled!',
                    emoji: true
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Student Name:* ${student.name} (${student.email})\n*Assessment Round:* *${slot.roundName}*\n*Date & Time:* ${formattedTime}\n*Duration:* ${slot.duration || 45} mins\n*Interviewer:* ${interviewerName || 'Recruiter'}`
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Meeting Link:* <${slot.meetingLink}|Join Meeting Room>`
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: '💡 *Review parsed candidate fitment details & matching skills on your recruiter dashboard.*'
                    }
                ]
            }
        ]
    };

    return sendSlackNotification(webhookUrl, payload);
};

module.exports = {
    sendSlackNotification,
    sendJobAlert,
    sendInterviewBookingAlert,
};
