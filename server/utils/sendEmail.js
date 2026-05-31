const axios = require('axios');
const ics = require('ics');

// ─── Base email sender using Brevo API ────────────────────
const sendEmail = async ({ to, subject, html, text, attachments }) => {
    // We will use BREVO_API_KEY if available, otherwise fallback to the SMTP pass they provided
    const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_PASS;

    if (!apiKey || apiKey === 'your_brevo_login_email') {
        console.log(`📧 [Email skipped - configure Brevo API Key] To: ${to} | Subject: ${subject}`);
        return;
    }

    try {
        const response = await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: {
                    name: process.env.EMAIL_FROM_NAME || 'Smart Placement Tracker',
                    email: process.env.EMAIL_FROM || 'noreply@smartplacement.com'
                },
                to: [
                    {
                        email: to
                    }
                ],
                subject: subject,
                htmlContent: html,
                textContent: text || html.replace(/<[^>]*>/g, ''),
                ...(attachments && { attachment: attachments }),
            },
            {
                headers: {
                    'accept': 'application/json',
                    'api-key': apiKey,
                    'content-type': 'application/json'
                }
            }
        );

        console.log(`✅ Email sent via Brevo API: Message ID ${response.data.messageId} → ${to}`);
        return response.data;
    } catch (error) {
        console.error('❌ Brevo API Error:', error.response?.data || error.message);
        throw new Error('Failed to send email via Brevo API');
    }
};

// ─── Email Templates ──────────────────────────────────────

/** Welcome email after registration */
const sendWelcomeEmail = async (user) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #f97316; font-size: 28px; margin: 0;">Smart Placement Tracker</h1>
        <p style="color: #94a3b8; margin-top: 8px;">Your Career, Managed Smartly</p>
      </div>
      <h2 style="color: #e2e8f0;">Welcome, ${user.name}! 🎉</h2>
      <p style="color: #94a3b8; line-height: 1.6;">
        Your account has been created successfully. You can now log in and start exploring placement opportunities.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/login" 
           style="background: #f97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Go to Dashboard
        </a>
      </div>
    </div>`;

    return sendEmail({ to: user.email, subject: 'Welcome to Smart Placement Tracker 🎓', html });
};

/** Email sent when Admin verifies the account */
const sendAccountVerifiedEmail = async (user) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #f97316; font-size: 28px; margin: 0;">Smart Placement Tracker</h1>
      </div>
      <h2 style="color: #22c55e;">Account Verified! ✅</h2>
      <p style="color: #94a3b8; line-height: 1.6;">
        Hi ${user.name},<br/><br/>
        Great news! Your account has been officially verified by the Training and Placement Office.
        You now have full access to view and apply for jobs, upcoming events, and announcements.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/login" 
           style="background: #f97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Log In Now
        </a>
      </div>
    </div>`;

    return sendEmail({ to: user.email, subject: 'Your Account is Verified ✅', html });
};

/** New job posted — sent to eligible students */
const sendNewJobAlert = async (student, job) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <h2 style="color: #22c55e;">New Job Opportunity! 🚀</h2>
      <p>Hi ${student.name},</p>
      <p style="color: #94a3b8;">A new placement drive matching your profile has been posted:</p>
      <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
        <h3 style="color: #e2e8f0; margin: 0 0 8px;">${job.role} — ${job.companyName}</h3>
        <p style="color: #94a3b8; margin: 4px 0;">📍 ${job.location}</p>
        <p style="color: #94a3b8; margin: 4px 0;">💰 ${job.package} LPA</p>
      </div>
    </div>`;

    return sendEmail({ to: student.email, subject: `New Job: ${job.role} at ${job.companyName} 🎯`, html });
};

/** Application status update */
const sendStatusUpdateEmail = async (student, job, newStatus) => {
    const statusMap = {
        shortlisted: { color: '#f59e0b', emoji: '⭐', label: 'Shortlisted' },
        interview:   { color: '#3b82f6', emoji: '📅', label: 'Interview Scheduled' },
        selected:    { color: '#22c55e', emoji: '🎉', label: 'Selected!' },
        rejected:    { color: '#ef4444', emoji: '😔', label: 'Not Selected' },
    };

    const s = statusMap[newStatus] || { color: '#f97316', emoji: '📋', label: newStatus };

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <h2 style="color: ${s.color};">${s.emoji} Application Update</h2>
      <p>Hi ${student.name},</p>
      <p>Your application for <strong>${job.role}</strong> at <strong>${job.companyName}</strong> has been updated to <strong>${s.label}</strong>.</p>
    </div>`;

    return sendEmail({
        to: student.email,
        subject: `${s.emoji} Application Update: ${job.companyName} — ${s.label}`,
        html,
    });
};

/** Interview schedule notification with ICS Calendar attachment */
const sendInterviewScheduleEmail = async (student, job, application, roundInfo = null) => {
    // Determine the interview date from the new roundInfo OR fallback to the legacy application.interviewDate
    const interviewDateRaw = roundInfo ? roundInfo.scheduledAt : application.interviewDate;
    if (!interviewDateRaw) return;

    const interviewDate = new Date(interviewDateRaw);
    const roundName = roundInfo ? roundInfo.name : 'Interview';
    const venue = roundInfo ? roundInfo.venue : (application.interviewLink || 'TBA');

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <h2 style="color: #3b82f6;">📅 ${roundName} Scheduled</h2>
      <p>Hi ${student.name},</p>
      <p>Your ${roundName} for <strong>${job.role}</strong> at <strong>${job.companyName}</strong> is scheduled for ${interviewDate.toLocaleString('en-IN')}.</p>
      <p>Venue/Link: ${venue}</p>
      <p>Please find the calendar invitation attached.</p>
    </div>`;

    // Generate ICS event
    let attachments = null;
    const { error, value } = ics.createEvent({
        title: `${roundName}: ${job.companyName} (${job.role})`,
        description: `Interview for ${job.role} at ${job.companyName}.\nVenue/Link: ${venue}`,
        location: venue,
        start: [
            interviewDate.getFullYear(),
            interviewDate.getMonth() + 1,
            interviewDate.getDate(),
            interviewDate.getHours(),
            interviewDate.getMinutes()
        ],
        duration: { hours: 1 }, // default 1 hour
        organizer: { name: job.companyName, email: 'noreply@smartplacement.com' },
    });

    if (!error && value) {
        attachments = [
            {
                name: 'invite.ics',
                content: Buffer.from(value).toString('base64')
            }
        ];
    }

    return sendEmail({
        to: student.email,
        subject: `📅 ${roundName} Scheduled: ${job.companyName}`,
        html,
        attachments,
    });
};

/** OTP Verification Email */
const sendOTPEmail = async (email, otp, name) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #f97316; font-size: 28px; margin: 0;">Smart Placement Tracker</h1>
      </div>
      <h2 style="color: #e2e8f0;">Verify Your Email 🔒</h2>
      <p style="color: #94a3b8; line-height: 1.6;">
        Hi ${name},<br/><br/>
        Please use the following OTP to verify your email address. It is valid for 10 minutes.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="background: #1e293b; color: #f97316; padding: 14px 32px; border-radius: 8px; font-weight: black; font-size: 24px; letter-spacing: 4px; display: inline-block; border: 1px dashed #f97316;">
          ${otp}
        </span>
      </div>
    </div>`;

    console.log('\n=======================================');
    console.log(`🔐 DEVELOPMENT OTP FOR ${email}: ${otp}`);
    console.log('=======================================\n');

    return sendEmail({ to: email, subject: 'Your Verification OTP 🔒', html });
};

/** Password Reset Email */
const sendPasswordResetEmail = async (email, resetUrl, name) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <h2 style="color: #e2e8f0;">Password Reset Request 🔑</h2>
      <p style="color: #94a3b8; line-height: 1.6;">
        Hi ${name},<br/><br/>
        Click the button below to set a new password. This link is valid for 15 minutes.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background: #f97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
    </div>`;

    return sendEmail({ to: email, subject: 'Password Reset Request 🔑', html });
};

/** Interview Round Reminder notification */
const sendRoundReminderEmail = async (student, job, round) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <h2 style="color: #3b82f6;">⏳ Upcoming Interview Reminder</h2>
      <p>Hi ${student.name},</p>
      <p>This is a reminder that your <strong>${round.name}</strong> (${round.type}) for <strong>${job.role}</strong> at <strong>${job.companyName}</strong> is coming up soon!</p>
      <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="color: #94a3b8; margin: 4px 0;">🗓️ Date & Time: ${new Date(round.scheduledAt).toLocaleString('en-IN')}</p>
        <p style="color: #94a3b8; margin: 4px 0;">📍 Mode: ${round.mode.toUpperCase()}</p>
        <p style="color: #94a3b8; margin: 4px 0;">🔗 Venue/Link: ${round.venue || 'TBA'}</p>
      </div>
      <p style="color: #94a3b8; font-size: 14px;">Good luck!</p>
    </div>`;

    return sendEmail({
        to: student.email,
        subject: `⏳ Reminder: ${round.name} at ${job.companyName}`,
        html,
    });
};

/** Global Announcement Email (to Students) */
const sendAnnouncementEmail = async (email, title, message) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <h2 style="color: #f97316;">📢 New Announcement</h2>
      <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
        <h3 style="color: #e2e8f0; margin: 0 0 12px;">${title}</h3>
        <p style="color: #94a3b8; margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
      </div>
      <p style="color: #94a3b8; font-size: 14px;">Regards,<br/>Training and Placement Cell</p>
    </div>`;

    return sendEmail({ to: email, subject: `📢 Announcement: ${title}`, html });
};

/** Event/Bootcamp Alert Email */
const sendEventEmail = async (email, event) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <h2 style="color: #8b5cf6;">🗓️ Upcoming Event: ${event.type}</h2>
      <p style="color: #94a3b8;">A new event has been scheduled by the TPO:</p>
      <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
        <h3 style="color: #e2e8f0; margin: 0 0 8px;">${event.title}</h3>
        <p style="color: #94a3b8; margin: 4px 0;">🗓️ Date: ${new Date(event.date).toLocaleDateString('en-IN')}</p>
        <p style="color: #94a3b8; margin: 4px 0;">📍 Location: ${event.location}</p>
        <p style="color: #94a3b8; margin: 8px 0 0; white-space: pre-wrap;">${event.description}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/events" 
           style="background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          View Event Details
        </a>
      </div>
    </div>`;

    return sendEmail({ to: email, subject: `🗓️ Upcoming Event: ${event.title}`, html });
};

/** Profile Verification Approval/Rejection Email */
const sendProfileVerificationEmail = async (user, status, feedback = '') => {
    const isApproved = status === 'verified';
    const title = isApproved ? 'Profile Verification Approved! ✅' : 'Profile Verification Rejected ❌';
    const statusText = isApproved 
        ? 'Congratulations! Your profile details and academic documents have been successfully verified by the TPO. You now have a "Verified" checkmark badge on your profile.' 
        : `Unfortunately, your profile verification request was rejected by the TPO.\n\nReason/Feedback: ${feedback}\n\nPlease update your profile details or upload the correct documents, then submit for verification again.`;
    
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #f97316; font-size: 28px; margin: 0;">Smart Placement Tracker</h1>
      </div>
      <h2 style="color: ${isApproved ? '#22c55e' : '#ef4444'};">${title}</h2>
      <p style="color: #94a3b8; line-height: 1.6; white-space: pre-wrap;">
        Hi ${user.name},<br/><br/>
        ${statusText}
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/login" 
           style="background: #f97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Go to Dashboard
        </a>
      </div>
    </div>`;

    return sendEmail({ to: user.email, subject: title, html });
};

/** Email sent to students with their Coding Assessment results */
const sendAssessmentResultEmail = async (student, job, totalScore, maxScore, isPass, answers) => {
    const title = isPass ? 'Coding Assessment Passed! 🚀' : 'Coding Assessment Result 📝';
    const statusText = isPass 
        ? `Congratulations! You have passed the coding assessment stage for <strong>${job.role}</strong> at <strong>${job.companyName}</strong>.`
        : `Thank you for taking the coding assessment for <strong>${job.role}</strong> at <strong>${job.companyName}</strong>. Unfortunately, you did not meet the passing score of 50% for this round.`;

    const statusColor = isPass ? '#22c55e' : '#ef4444';
    
    // Construct questions HTML table
    let questionsHtml = '';
    if (answers && answers.length > 0) {
        questionsHtml = `
        <div style="margin-top: 30px;">
          <h3 style="color: #e2e8f0; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 15px;">Challenge Summary</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid #334155; color: #94a3b8; font-size: 13px;">
                <th style="padding: 10px 5px;">Challenge / Language</th>
                <th style="padding: 10px 5px; text-align: center;">Test Cases Passed</th>
                <th style="padding: 10px 5px; text-align: right;">Score</th>
              </tr>
            </thead>
            <tbody>
        `;
        answers.forEach((ans, i) => {
            questionsHtml += `
              <tr style="border-bottom: 1px solid #1e293b; font-size: 14px; color: #cbd5e1;">
                <td style="padding: 12px 5px;">
                  <strong>Challenge #${i + 1}</strong><br/>
                  <span style="font-size: 11px; color: #64748b; font-family: monospace; text-transform: uppercase;">${ans.language || 'javascript'}</span>
                </td>
                <td style="padding: 12px 5px; text-align: center; font-weight: bold; color: ${ans.passedCount === ans.totalCount ? '#22c55e' : '#f59e0b'}">
                  ${ans.passedCount} / ${ans.totalCount}
                </td>
                <td style="padding: 12px 5px; text-align: right; font-weight: bold;">
                  ${ans.score} pts
                </td>
              </tr>
            `;
        });
        questionsHtml += `
            </tbody>
          </table>
        </div>
        `;
    }

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px; border: 1px solid #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 35px;">
        <h1 style="color: #f97316; font-size: 28px; margin: 0; font-weight: bold;">PlaceIQ</h1>
        <p style="color: #64748b; margin-top: 8px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Smart Placement System</p>
      </div>
      
      <div style="text-align: center; padding: 25px; background: #1e293b; border-radius: 12px; border: 1px solid #334155; margin-bottom: 30px;">
        <div style="display: inline-block; padding: 8px 16px; border-radius: 20px; background: ${isPass ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}; border: 1px solid ${statusColor}; color: ${statusColor}; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 15px;">
          ${isPass ? 'PASS' : 'FAIL'}
        </div>
        <h2 style="color: #e2e8f0; margin: 0; font-size: 20px;">Your Score: <span style="color: #f97316; font-size: 26px; font-weight: 800;">${totalScore}</span> / ${maxScore} pts</h2>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">Hi ${student.name},</p>
      <p style="font-size: 15px; line-height: 1.6; color: #94a3b8;">
        ${statusText}
      </p>

      ${questionsHtml}

      <div style="text-align: center; margin: 35px 0 15px;">
        <a href="${process.env.CLIENT_URL}/student/applications" 
           style="background: #f97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 4px 15px rgba(249,115,22,0.3)">
          Go to Application Tracker
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 12px; text-align: center; border-top: 1px solid #1e293b; padding-top: 15px; margin-top: 35px;">
        This is an automated evaluation result. Please do not reply directly to this email.
      </p>
    </div>`;

    return sendEmail({ to: student.email, subject: `📝 ${title}: ${job.companyName}`, html });
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendAccountVerifiedEmail,
    sendNewJobAlert,
    sendStatusUpdateEmail,
    sendInterviewScheduleEmail,
    sendOTPEmail,
    sendPasswordResetEmail,
    sendRoundReminderEmail,
    sendAnnouncementEmail,
    sendEventEmail,
    sendProfileVerificationEmail,
    sendAssessmentResultEmail,
};
