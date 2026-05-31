const { google } = require('googleapis');

/**
 * Inserts an event into the primary calendar using Google Service Account JWT auth,
 * and requests creation of a Google Meet videoconference room.
 */
const createGoogleCalendarEvent = async ({
    studentEmail,
    recruiterEmail,
    dateTime,
    duration,
    subject,
    description
}) => {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey || serviceAccountEmail === 'your_service_account_email') {
        console.log('[Google Calendar API] skipped - credentials not configured in .env file');
        return null;
    }

    try {
        // Clean the private key to handle single-line PEM storage format in .env files
        const formattedKey = privateKey.replace(/\\n/g, '\n');

        const auth = new google.auth.JWT(
            serviceAccountEmail,
            null,
            formattedKey,
            ['https://www.googleapis.com/auth/calendar']
        );

        const calendar = google.calendar({ version: 'v3', auth });

        const startTime = new Date(dateTime);
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

        const event = {
            summary: subject,
            description: description,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'Asia/Kolkata'
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'Asia/Kolkata'
            },
            attendees: [
                { email: studentEmail },
                { email: recruiterEmail }
            ],
            conferenceData: {
                createRequest: {
                    requestId: `placeiq-meet-${Date.now()}`,
                    conferenceSolutionKey: {
                        type: 'hangoutMeeting'
                    }
                }
            }
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1
        });

        const meetLink = response.data.conferenceData?.entryPoints?.find(
            ep => ep.entryPointType === 'video'
        )?.uri || '';

        console.log(`[Google Calendar] Insert success: ${response.data.htmlLink}`);
        if (meetLink) {
            console.log(`[Google Calendar] Google Meet link: ${meetLink}`);
        }

        return {
            calendarLink: response.data.htmlLink || '',
            googleMeetLink: meetLink || ''
        };
    } catch (err) {
        console.error('[Google Calendar API Error]:', err.message);
        return null;
    }
};

module.exports = {
    createGoogleCalendarEvent
};
