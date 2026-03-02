const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
    if (!transporter) {
        // In development, log emails to console instead of sending
        if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_PASS) {
            transporter = {
                sendMail: async (options) => {
                    console.log('\n--- EMAIL (dev mode) ---');
                    console.log('To:', options.to);
                    console.log('Subject:', options.subject);
                    console.log('Body:', options.html || options.text);
                    console.log('--- END EMAIL ---\n');
                    return { messageId: 'dev-' + Date.now() };
                }
            };
        } else {
            transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT) || 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
        }
    }
    return transporter;
}

async function sendVerificationEmail(email, token, name) {
    const verifyUrl = `${process.env.SITE_URL}/api/auth/verify-email/${token}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #0f0f1a; color: #ffffff; border-radius: 12px;">
            <h1 style="color: #7B68EE; margin-bottom: 8px;">GoPock<span style="color: #4ECDC4; font-style: italic;">it</span>t</h1>
            <p style="color: #a0a0b8;">Student Deals Perth</p>
            <hr style="border: 1px solid #25253d; margin: 24px 0;">
            <h2 style="margin-bottom: 16px;">Hey ${name.split(' ')[0]}! 👋</h2>
            <p style="color: #a0a0b8; line-height: 1.6;">Welcome to GoPockitt! Click the button below to verify your email and start claiming exclusive student deals in Perth CBD.</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: #7B68EE; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0;">Verify My Email</a>
            <p style="color: #666; font-size: 0.85rem; margin-top: 24px;">This link expires in 24 hours. If you didn't create a GoPockitt account, you can safely ignore this email.</p>
        </div>
    `;

    return getTransporter().sendMail({
        from: process.env.EMAIL_FROM || 'GoPockitt <noreply@gopockitt.com.au>',
        to: email,
        subject: 'Verify your GoPockitt account 🎓',
        html
    });
}

module.exports = { sendVerificationEmail };
