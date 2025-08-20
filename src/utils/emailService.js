const nodemailer = require('nodemailer');
const logger = require('./logger');

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

/**
 * Generate a random 6-digit security code
 * @returns {string} 6-digit security code
 */
const generateSecurityCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send security code email
 * @param {string} to - Recipient email address
 * @param {string} securityCode - 6-digit security code
 * @param {string} recipient - Transfer recipient
 * @param {number} amount - Transfer amount
 * @param {string} token - Token symbol
 * @returns {Promise<boolean>} Success status
 */
const sendSecurityCodeEmail = async (to, securityCode, recipient, amount, token) => {
  try {
    const mailOptions = {
      from: `"Ming Open Web HQ" <${emailConfig.auth.user}>`,
      to: to,
      subject: 'Transfer Security Code - Ming HQ',
      html: `
        <div style="font-family: Arial, sans-serif; margin: 0 auto; background-color: #f8f9fa;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin: 0; font-size: 24px;">🔐 Transfer Security Code</h1>
            </div>
            
            <div style="border-radius: 8px; margin-bottom: 25px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                <div><strong>Recipient:</strong> ${recipient}</div>
                <div><strong>Amount:</strong> ${amount} ${token}</div>
                <div><strong>Token:</strong> ${token}</div>
                <div><strong>Time:</strong> ${new Date().toLocaleString()}</div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                ${securityCode}
              </div>
              <p style="color: #666; margin-top: 15px; font-size: 14px;">Enter this code to complete your transfer</p>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> This code expires in 5 minutes. Never share this code with anyone.
              </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 12px;">
              <p>If you didn't request this transfer, please contact support immediately.</p>
              <p>© 2025 Ming Open Web HQ. All rights reserved.</p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Security code email sent successfully', {
      to: to,
      messageId: info.messageId,
      recipient: recipient,
      amount: amount,
      token: token
    });

    return true;
  } catch (error) {
    logger.error('Failed to send security code email', {
      error: error.message,
      to: to,
      recipient: recipient
    });
    return false;
  }
};

/**
 * Verify email configuration
 * @returns {Promise<boolean>} Configuration validity
 */
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    logger.info('Email configuration verified successfully');
    return true;
  } catch (error) {
    logger.error('Email configuration verification failed', { error: error.message });
    return false;
  }
};

module.exports = {
  generateSecurityCode,
  sendSecurityCodeEmail,
  verifyEmailConfig
};
