require('dotenv').config();
const { sendEmail } = require('./utils/sendEmail');

async function test() {
    try {
        console.log('Sending test email...');
        const info = await sendEmail({
            to: 'abhijithsura68@gmail.com',
            subject: 'Test Email',
            html: '<p>This is a test email.</p>',
            text: 'This is a test email.'
        });
        console.log('Success:', info);
    } catch (err) {
        console.error('Failed to send email:', err);
    }
}

test();
