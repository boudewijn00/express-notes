const nodemailer = require('nodemailer');

/**
 * Create email transporter
 * Uses environment variables for email configuration
 */
function createTransporter() {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email configuration missing. Please set EMAIL_HOST, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM in .env');
    }

    return nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

/**
 * Send email to a single recipient
 * @param {Object} transporter - Nodemailer transporter
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 */
async function sendEmail(transporter, to, subject, html) {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    
    try {
        const info = await transporter.sendMail({
            from: from,
            to: to,
            subject: subject,
            html: html
        });
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    createTransporter,
    sendEmail
};
